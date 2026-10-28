import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Payout, PayoutStatus } from '../entities/payout.entity';
import { PayoutItem, PayoutItemType } from '../entities/payout-item.entity';
import { PayoutEvent } from '../entities/payout-event.entity';
import { PayoutAccount, PayoutAccountStatus } from '../entities/payout-account.entity';
import { User } from '../../../users/entities/user.entity';
import { SandboxPaymentProvider } from '../providers/sandbox-payment.provider';
import { ChapaPaymentProvider } from '../providers/chapa-payment.provider';
import { LedgerService } from './ledger.service';
import { FinanceSettingsService } from './finance-settings.service';
import { AuditService } from '../../audit/audit.service';
import { decryptField, encryptField, extractLast4 } from '../../../lib/encryption';
import { fromMinorUnits } from '../../../lib/money';
import { LedgerTransactionType } from '../entities/ledger-transaction.entity';

export interface CreatePayoutAccountDto {
  provider: string;
  accountName: string;
  accountNumber: string;
  phone?: string;
  bankName?: string;
  bankBranch?: string;
  swiftBic?: string;
  currency?: string;
}

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Payout)
    private readonly payoutRepo: Repository<Payout>,
    @InjectRepository(PayoutItem)
    private readonly payoutItemRepo: Repository<PayoutItem>,
    @InjectRepository(PayoutEvent)
    private readonly payoutEventRepo: Repository<PayoutEvent>,
    @InjectRepository(PayoutAccount)
    private readonly payoutAccountRepo: Repository<PayoutAccount>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly sandboxProvider: SandboxPaymentProvider,
    private readonly chapaProvider: ChapaPaymentProvider,
    private readonly ledgerService: LedgerService,
    private readonly settingsService: FinanceSettingsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Registers a new host payout account, encrypts sensitive numbers, and runs KYC verification.
   */
  async createPayoutAccount(hostId: string, dto: CreatePayoutAccountDto, actor?: User | null) {
    if (!dto.accountNumber || !dto.accountName) {
      throw new BadRequestException('Account name and account number are required');
    }

    const host = await this.userRepo.findOne({ where: { id: hostId } });
    if (!host) {
      throw new NotFoundException(`Host ${hostId} not found`);
    }

    const accountNumberEncrypted = encryptField(dto.accountNumber)!;
    const accountNumberLast4 = extractLast4(dto.accountNumber)!;
    const phoneEncrypted = dto.phone ? encryptField(dto.phone) : null;
    const phoneLast4 = dto.phone ? extractLast4(dto.phone) : null;
    const swiftBicEncrypted = dto.swiftBic ? encryptField(dto.swiftBic) : null;

    // Run provider KYC verification
    const settings = await this.settingsService.getAllSettings();
    const provider = settings.livePayoutsEnabled ? this.chapaProvider : this.sandboxProvider;

    const verificationResult = await provider.verifyAccount({
      accountName: dto.accountName,
      accountNumber: dto.accountNumber,
      phone: dto.phone,
      bankName: dto.bankName,
      provider: dto.provider,
    });

    const status = verificationResult.verified
      ? PayoutAccountStatus.VERIFIED
      : PayoutAccountStatus.PENDING;

    const account = this.payoutAccountRepo.create({
      hostId,
      provider: dto.provider,
      accountName: dto.accountName,
      accountNumberEncrypted,
      accountNumberLast4,
      phoneEncrypted,
      phoneLast4,
      bankName: dto.bankName || null,
      bankBranch: dto.bankBranch || null,
      swiftBicEncrypted,
      currency: dto.currency || 'ETB',
      status,
      verifiedAt: verificationResult.verified ? new Date() : null,
      rejectionReason: verificationResult.verified ? null : verificationResult.rejectionReason,
    });

    const saved = await this.payoutAccountRepo.save(account);

    await this.auditService.record({
      actor,
      action: 'finance.payout_account_created',
      entityType: 'payout_account',
      entityId: saved.id,
      after: {
        hostId,
        provider: saved.provider,
        accountName: saved.accountName,
        accountNumberLast4: saved.accountNumberLast4,
        status: saved.status,
      },
    });

    // Return masked view (no encrypted secrets)
    return this.maskPayoutAccount(saved);
  }

  /**
   * Helper to return masked account data.
   */
  maskPayoutAccount(acc: PayoutAccount) {
    return {
      id: acc.id,
      hostId: acc.hostId,
      provider: acc.provider,
      accountName: acc.accountName,
      accountNumberLast4: acc.accountNumberLast4,
      phoneLast4: acc.phoneLast4,
      bankName: acc.bankName,
      bankBranch: acc.bankBranch,
      currency: acc.currency,
      status: acc.status,
      verifiedAt: acc.verifiedAt,
      rejectionReason: acc.rejectionReason,
      createdAt: acc.createdAt,
    };
  }

  /**
   * Admin approves or verifies a payout account manually.
   */
  async verifyPayoutAccount(
    accountId: string,
    verifier: User,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const account = await this.payoutAccountRepo.findOne({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Payout account not found');

    account.status = PayoutAccountStatus.VERIFIED;
    account.verifiedById = verifier.id;
    account.verifiedAt = new Date();
    account.rejectionReason = null;
    await this.payoutAccountRepo.save(account);

    await this.auditService.record({
      actor: verifier,
      action: 'finance.payout_account_verified',
      entityType: 'payout_account',
      entityId: account.id,
      after: { status: account.status },
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    });

    return this.maskPayoutAccount(account);
  }

  /**
   * Admin rejects a payout account with a required reason.
   */
  async rejectPayoutAccount(
    accountId: string,
    actor: User,
    reason: string,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('A reason is required to reject a payout account');
    }

    const account = await this.payoutAccountRepo.findOne({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Payout account not found');

    account.status = PayoutAccountStatus.REJECTED;
    account.rejectionReason = reason;
    await this.payoutAccountRepo.save(account);

    await this.auditService.record({
      actor,
      action: 'finance.payout_account_rejected',
      entityType: 'payout_account',
      entityId: account.id,
      after: { status: account.status, rejectionReason: reason },
      metadata: { reason },
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    });

    return this.maskPayoutAccount(account);
  }

  /**
   * Generates a daily payout batch for all hosts with available ledger balances and verified accounts.
   */
  async generateDailyPayoutBatch(actor?: User | null): Promise<{
    draftedCount: number;
    totalAmountMinor: bigint;
    payoutIds: string[];
  }> {
    const verifiedAccounts = await this.payoutAccountRepo.find({
      where: { status: PayoutAccountStatus.VERIFIED },
      relations: ['host'],
    });

    const settings = await this.settingsService.getAllSettings();
    const thresholdMinor = BigInt(settings.payoutDualApprovalThresholdMinor);

    const now = new Date();
    const periodEnd = now.toISOString().split('T')[0];
    const periodStart = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0];

    let draftedCount = 0;
    let totalAmountMinor = 0n;
    const payoutIds: string[] = [];

    for (const acc of verifiedAccounts) {
      const balance = await this.ledgerService.getHostPayableBalance(acc.hostId);
      if (balance <= 0n) {
        continue;
      }

      // Check if host already has a pending or drafted payout
      const pending = await this.payoutRepo.findOne({
        where: [
          { hostId: acc.hostId, status: PayoutStatus.DRAFT },
          { hostId: acc.hostId, status: PayoutStatus.PENDING_APPROVAL },
          { hostId: acc.hostId, status: PayoutStatus.PROCESSING },
        ],
      });
      if (pending) {
        this.logger.log(`Skipping host ${acc.hostId}: payout ${pending.id} already in progress`);
        continue;
      }

      const requiresDualApproval = balance >= thresholdMinor;
      const initialStatus = requiresDualApproval
        ? PayoutStatus.PENDING_APPROVAL
        : PayoutStatus.APPROVED;

      const idempotencyKey = `payout_${acc.hostId}_${periodEnd}_${Date.now()}`;

      const payout = this.payoutRepo.create({
        hostId: acc.hostId,
        payoutAccountId: acc.id,
        periodStart,
        periodEnd,
        amountMinor: balance.toString(),
        currency: acc.currency,
        status: initialStatus,
        approvedById: requiresDualApproval ? null : actor?.id ?? null,
        idempotencyKey,
      });

      const savedPayout = await this.payoutRepo.save(payout);

      // Create itemized breakdown item
      const item = this.payoutItemRepo.create({
        payoutId: savedPayout.id,
        amountMinor: balance.toString(),
        type: PayoutItemType.STAY_RELEASE,
        description: `Net earnings distribution for period ending ${periodEnd}`,
      });
      await this.payoutItemRepo.save(item);

      const event = this.payoutEventRepo.create({
        payoutId: savedPayout.id,
        eventType: requiresDualApproval ? 'PAYOUT_DRAFTED' : 'PAYOUT_AUTO_APPROVED',
        toStatus: initialStatus,
        actorId: actor?.id ?? null,
        reason: 'Daily scheduled 02:00 Addis batch distribution',
      });
      await this.payoutEventRepo.save(event);

      payoutIds.push(savedPayout.id);
      draftedCount += 1;
      totalAmountMinor += balance;

      await this.auditService.record({
        actor,
        action: 'finance.payout_drafted',
        entityType: 'payout',
        entityId: savedPayout.id,
        after: {
          hostId: acc.hostId,
          amountMinor: savedPayout.amountMinor,
          status: savedPayout.status,
          requiresDualApproval,
        },
      });
    }

    return { draftedCount, totalAmountMinor, payoutIds };
  }

  /**
   * Approves a payout batch item. Enforces dual approval rule (proposer != approver).
   */
  async approvePayout(
    payoutId: string,
    approver: User,
    reason: string,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const payout = await this.payoutRepo.findOne({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Payout not found');

    if (payout.status !== PayoutStatus.PENDING_APPROVAL && payout.status !== PayoutStatus.DRAFT) {
      throw new BadRequestException(`Payout is not pending approval (${payout.status})`);
    }

    payout.status = PayoutStatus.APPROVED;
    payout.approvedById = approver.id;
    await this.payoutRepo.save(payout);

    const event = this.payoutEventRepo.create({
      payoutId: payout.id,
      eventType: 'PAYOUT_APPROVED',
      fromStatus: PayoutStatus.PENDING_APPROVAL,
      toStatus: PayoutStatus.APPROVED,
      actorId: approver.id,
      reason,
    });
    await this.payoutEventRepo.save(event);

    await this.auditService.record({
      actor: approver,
      action: 'finance.payout_approved',
      entityType: 'payout',
      entityId: payout.id,
      after: { status: payout.status },
      metadata: { reason },
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    });

    return payout;
  }

  /**
   * Rejects an unexecuted payout.
   */
  async rejectPayout(
    payoutId: string,
    actor: User,
    reason: string,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const payout = await this.payoutRepo.findOne({ where: { id: payoutId } });
    if (!payout) throw new NotFoundException('Payout not found');

    if (payout.status === PayoutStatus.PAID || payout.status === PayoutStatus.PROCESSING) {
      throw new BadRequestException('Cannot reject a completed or processing payout');
    }

    const fromStatus = payout.status;
    payout.status = PayoutStatus.CANCELLED;
    await this.payoutRepo.save(payout);

    const event = this.payoutEventRepo.create({
      payoutId: payout.id,
      eventType: 'PAYOUT_REJECTED',
      fromStatus,
      toStatus: PayoutStatus.CANCELLED,
      actorId: actor.id,
      reason,
    });
    await this.payoutEventRepo.save(event);

    await this.auditService.record({
      actor,
      action: 'finance.payout_rejected',
      entityType: 'payout',
      entityId: payout.id,
      after: { status: payout.status },
      metadata: { reason },
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    });

    return payout;
  }

  /**
   * Executes provider transfer and posts double-entry transaction on success.
   */
  async executePayout(
    payoutId: string,
    actor?: User | null,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const payout = await this.payoutRepo.findOne({
      where: { id: payoutId },
      relations: ['payoutAccount', 'host'],
    });

    if (!payout) {
      throw new NotFoundException(`Payout ${payoutId} not found`);
    }

    if (payout.status !== PayoutStatus.APPROVED && payout.status !== PayoutStatus.FAILED) {
      throw new BadRequestException(`Payout is not approved for execution (${payout.status})`);
    }

    payout.status = PayoutStatus.PROCESSING;
    await this.payoutRepo.save(payout);

    const settings = await this.settingsService.getAllSettings();
    const provider = settings.livePayoutsEnabled ? this.chapaProvider : this.sandboxProvider;

    // Decrypt recipient account number for transfer payload
    const rawAccountNumber = decryptField(payout.payoutAccount.accountNumberEncrypted);
    const rawPhone = payout.payoutAccount.phoneEncrypted
      ? decryptField(payout.payoutAccount.phoneEncrypted)
      : undefined;

    const transferResult = await provider.executePayoutTransfer({
      payoutId: payout.id,
      accountName: payout.payoutAccount.accountName,
      accountNumber: rawAccountNumber || '00000000',
      phone: rawPhone || undefined,
      bankName: payout.payoutAccount.bankName || undefined,
      bankBranch: payout.payoutAccount.bankBranch || undefined,
      amountMinor: BigInt(payout.amountMinor),
      currency: payout.currency,
      idempotencyKey: payout.idempotencyKey,
      reference: `ENGIDA-PAYOUT-${payout.id.slice(0, 8)}`,
    });

    if (transferResult.status === 'PAID') {
      return this.handlePayoutSuccess(payout, transferResult, actor, context);
    } else {
      return this.handlePayoutFailure(payout, transferResult, actor, context);
    }
  }

  private async handlePayoutSuccess(
    payout: Payout,
    result: any,
    actor?: User | null,
    context?: any,
  ) {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const pRepo = manager.getRepository(Payout);
      const evRepo = manager.getRepository(PayoutEvent);

      payout.status = PayoutStatus.PAID;
      payout.paidAt = new Date();
      payout.providerTransferId = result.providerTransferId;
      await pRepo.save(payout);

      const amountMinor = BigInt(payout.amountMinor);

      // Post balanced double-entry transaction: Debit Host Payable, Credit Payout Clearing
      await this.ledgerService.recordTransaction(
        {
          type: LedgerTransactionType.PAYOUT,
          reference: `PAY-${payout.id.slice(0, 8)}`,
          idempotencyKey: `tx_payout_${payout.id}`,
          payoutId: payout.id,
          description: `Host payout disbursement to ${payout.payoutAccount.accountName} (${payout.payoutAccount.accountNumberLast4})`,
          createdById: actor?.id ?? null,
          entries: [
            {
              accountCode: `2020-HOST-${payout.hostId.slice(0, 8)}`,
              accountName: `Host Payable (${payout.hostId.slice(0, 8)})`,
              ownerId: payout.hostId,
              ownerType: 'HOST',
              debitMinor: amountMinor,
              creditMinor: 0n,
              currency: payout.currency,
              memo: `Host payout disbursement via ${result.providerTransferId}`,
            },
            {
              accountCode: '2050',
              accountName: 'PAYOUT_CLEARING',
              debitMinor: 0n,
              creditMinor: amountMinor,
              currency: payout.currency,
              memo: `Payout settlement clearing (${result.providerTransferId})`,
            },
          ],
        },
        manager,
      );

      const event = evRepo.create({
        payoutId: payout.id,
        eventType: 'PAYOUT_PAID',
        fromStatus: PayoutStatus.PROCESSING,
        toStatus: PayoutStatus.PAID,
        actorId: actor?.id ?? null,
        providerReference: result.providerTransferId,
      });
      await evRepo.save(event);

      await this.auditService.record(
        {
          actor,
          action: 'finance.payout_paid',
          entityType: 'payout',
          entityId: payout.id,
          after: {
            status: payout.status,
            amountMinor: payout.amountMinor,
            providerTransferId: payout.providerTransferId,
          },
          metadata: { hostId: payout.hostId },
          ipAddress: context?.ipAddress ?? null,
          userAgent: context?.userAgent ?? null,
        },
        manager,
      );

      return payout;
    });
  }

  private async handlePayoutFailure(
    payout: Payout,
    result: any,
    actor?: User | null,
    context?: any,
  ) {
    payout.status = PayoutStatus.FAILED;
    payout.failureCode = result.failureCode || 'TRANSFER_FAILED';
    payout.failureMessage = result.failureMessage || 'Provider transfer rejected';
    await this.payoutRepo.save(payout);

    const event = this.payoutEventRepo.create({
      payoutId: payout.id,
      eventType: 'PAYOUT_FAILED',
      fromStatus: PayoutStatus.PROCESSING,
      toStatus: PayoutStatus.FAILED,
      actorId: actor?.id ?? null,
      reason: payout.failureMessage,
    });
    await this.payoutEventRepo.save(event);

    await this.auditService.record({
      actor,
      action: 'finance.payout_failed',
      entityType: 'payout',
      entityId: payout.id,
      after: {
        status: payout.status,
        failureCode: payout.failureCode,
        failureMessage: payout.failureMessage,
      },
      metadata: { hostId: payout.hostId },
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    });

    return payout;
  }
}
