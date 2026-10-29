import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  LedgerAccount,
  LedgerAccountType,
} from '../entities/ledger-account.entity';
import {
  LedgerTransaction,
  LedgerTransactionType,
} from '../entities/ledger-transaction.entity';
import { LedgerEntry } from '../entities/ledger-entry.entity';

export interface LedgerEntryInput {
  accountCode: string;
  accountName?: string;
  accountType?: LedgerAccountType;
  ownerId?: string | null;
  ownerType?: string | null;
  debitMinor: bigint;
  creditMinor: bigint;
  currency?: string;
  memo?: string;
}

export interface RecordTransactionInput {
  type: LedgerTransactionType;
  reference: string;
  idempotencyKey: string;
  description: string;
  bookingId?: string | null;
  paymentId?: string | null;
  refundId?: string | null;
  payoutId?: string | null;
  createdById?: string | null;
  entries: LedgerEntryInput[];
}

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(
    @InjectRepository(LedgerAccount)
    private readonly accountRepository: Repository<LedgerAccount>,
    @InjectRepository(LedgerTransaction)
    private readonly transactionRepository: Repository<LedgerTransaction>,
    @InjectRepository(LedgerEntry)
    private readonly entryRepository: Repository<LedgerEntry>,
  ) {}

  /**
   * Finds or creates a ledger account by code.
   */
  async getOrCreateAccount(
    code: string,
    fallbackName?: string,
    fallbackType?: LedgerAccountType,
    ownerId?: string | null,
    ownerType?: string | null,
    manager?: EntityManager,
  ): Promise<LedgerAccount> {
    const repo = manager ? manager.getRepository(LedgerAccount) : this.accountRepository;
    let account = await repo.findOne({ where: { code } });

    if (!account) {
      account = repo.create({
        code,
        name: fallbackName || code,
        type: fallbackType || LedgerAccountType.LIABILITY,
        currency: 'ETB',
        ownerId: ownerId ?? null,
        ownerType: ownerType ?? (ownerId ? 'HOST' : 'PLATFORM'),
        isActive: true,
      });
      account = await repo.save(account);
      this.logger.log(`Created ledger account ${account.code} (${account.name})`);
    }

    return account;
  }

  /**
   * Returns standard platform accounts or host sub-accounts.
   */
  async getHostPayableAccount(hostId: string, manager?: EntityManager): Promise<LedgerAccount> {
    const code = `2020-HOST-${hostId.slice(0, 8)}`;
    return this.getOrCreateAccount(
      code,
      `Host Payable (${hostId.slice(0, 8)})`,
      LedgerAccountType.LIABILITY,
      hostId,
      'HOST',
      manager,
    );
  }

  /**
   * Records a balanced double-entry transaction.
   * Invariant: >= 2 entries, sum(debit) == sum(credit), immutable.
   */
  async recordTransaction(
    input: RecordTransactionInput,
    manager?: EntityManager,
  ): Promise<LedgerTransaction> {
    const txRepo = manager ? manager.getRepository(LedgerTransaction) : this.transactionRepository;
    const entryRepo = manager ? manager.getRepository(LedgerEntry) : this.entryRepository;

    // Check for existing transaction by idempotency key
    const existing = await txRepo.findOne({
      where: { idempotencyKey: input.idempotencyKey },
      relations: ['entries', 'entries.account'],
    });
    if (existing) {
      this.logger.warn(`Transaction already recorded with idempotency key ${input.idempotencyKey}`);
      return existing;
    }

    if (!input.entries || input.entries.length < 2) {
      throw new BadRequestException('A ledger transaction must contain at least two entries');
    }

    let totalDebit = 0n;
    let totalCredit = 0n;

    for (const entry of input.entries) {
      if (entry.debitMinor < 0n || entry.creditMinor < 0n) {
        throw new BadRequestException('Debit and credit amounts cannot be negative');
      }
      if (entry.debitMinor > 0n && entry.creditMinor > 0n) {
        throw new BadRequestException('An individual entry cannot have both debit and credit > 0');
      }
      totalDebit += entry.debitMinor;
      totalCredit += entry.creditMinor;
    }

    if (totalDebit !== totalCredit) {
      throw new BadRequestException(
        `Unbalanced transaction: sum of debits (${totalDebit}) must equal sum of credits (${totalCredit})`,
      );
    }

    const tx = txRepo.create({
      type: input.type,
      reference: input.reference,
      idempotencyKey: input.idempotencyKey,
      bookingId: input.bookingId ?? null,
      paymentId: input.paymentId ?? null,
      refundId: input.refundId ?? null,
      payoutId: input.payoutId ?? null,
      description: input.description,
      createdById: input.createdById ?? null,
    });

    const savedTx = await txRepo.save(tx);

    const savedEntries: LedgerEntry[] = [];
    for (const entryInput of input.entries) {
      const account = await this.getOrCreateAccount(
        entryInput.accountCode,
        entryInput.accountName,
        entryInput.accountType,
        entryInput.ownerId,
        entryInput.ownerType,
        manager,
      );

      const entry = entryRepo.create({
        transactionId: savedTx.id,
        accountId: account.id,
        debitMinor: entryInput.debitMinor.toString(),
        creditMinor: entryInput.creditMinor.toString(),
        currency: entryInput.currency || 'ETB',
        memo: entryInput.memo || null,
      });

      savedEntries.push(await entryRepo.save(entry));
    }

    savedTx.entries = savedEntries;
    return savedTx;
  }

  /**
   * Calculates real-time derived balance for an account from immutable entries.
   */
  async getAccountBalance(
    codeOrId: string,
    currency = 'ETB',
    manager?: EntityManager,
  ): Promise<bigint> {
    const accRepo = manager ? manager.getRepository(LedgerAccount) : this.accountRepository;
    const entryRepo = manager ? manager.getRepository(LedgerEntry) : this.entryRepository;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(codeOrId);
    const account = await accRepo.findOne({
      where: isUuid ? [{ id: codeOrId }, { code: codeOrId }] : { code: codeOrId },
    });
    if (!account) {
      return 0n;
    }

    const res = await entryRepo
      .createQueryBuilder('entry')
      .select('SUM(CAST(entry.debit_minor AS BIGINT))', 'totalDebit')
      .addSelect('SUM(CAST(entry.credit_minor AS BIGINT))', 'totalCredit')
      .where('entry.account_id = :accountId', { accountId: account.id })
      .andWhere('entry.currency = :currency', { currency })
      .getRawOne();

    const debits = BigInt(res?.totalDebit || 0);
    const credits = BigInt(res?.totalCredit || 0);

    // Normal balance rule:
    // ASSET, EXPENSE: Debit increases, credit decreases
    // LIABILITY, REVENUE, EQUITY: Credit increases, debit decreases
    if (
      account.type === LedgerAccountType.ASSET ||
      account.type === LedgerAccountType.EXPENSE
    ) {
      return debits - credits;
    }
    return credits - debits;
  }

  /**
   * Returns host's available payable balance from the ledger.
   */
  async getHostPayableBalance(hostId: string, manager?: EntityManager): Promise<bigint> {
    const code = `2020-HOST-${hostId.slice(0, 8)}`;
    return this.getAccountBalance(code, 'ETB', manager);
  }

  /**
   * Automated verification of double-entry invariants across the entire ledger.
   */
  async checkInvariants(): Promise<{ isHealthy: boolean; violations: string[] }> {
    const violations: string[] = [];

    // Invariant 1: Unbalanced transactions
    const unbalanced = await this.entryRepository
      .createQueryBuilder('entry')
      .select('entry.transaction_id', 'txId')
      .addSelect('SUM(CAST(entry.debit_minor AS BIGINT))', 'debit')
      .addSelect('SUM(CAST(entry.credit_minor AS BIGINT))', 'credit')
      .groupBy('entry.transaction_id')
      .having('SUM(CAST(entry.debit_minor AS BIGINT)) != SUM(CAST(entry.credit_minor AS BIGINT))')
      .getRawMany();

    if (unbalanced.length > 0) {
      violations.push(`Found ${unbalanced.length} unbalanced ledger transaction(s)`);
    }

    // Invariant 2: Escrow liability cannot be negative
    const escrowBalance = await this.getAccountBalance('2010');
    if (escrowBalance < 0n) {
      violations.push(`Escrow liability (2010) is negative: ${escrowBalance}`);
    }

    // Invariant 3: Host payable sub-accounts cannot be negative from payouts
    const negativeHosts = await this.entryRepository
      .createQueryBuilder('entry')
      .innerJoin('entry.account', 'account')
      .select('account.owner_id', 'hostId')
      .addSelect('account.code', 'code')
      .addSelect('SUM(CAST(entry.credit_minor AS BIGINT)) - SUM(CAST(entry.debit_minor AS BIGINT))', 'net')
      .where('account.type = :type', { type: LedgerAccountType.LIABILITY })
      .andWhere('account.owner_type = :ownerType', { ownerType: 'HOST' })
      .groupBy('account.owner_id, account.code')
      .having('(SUM(CAST(entry.credit_minor AS BIGINT)) - SUM(CAST(entry.debit_minor AS BIGINT))) < 0')
      .getRawMany();

    if (negativeHosts.length > 0) {
      violations.push(`Found ${negativeHosts.length} host sub-account(s) with negative payable balance`);
    }

    return {
      isHealthy: violations.length === 0,
      violations,
    };
  }
}
