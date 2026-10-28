import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { Payment, PaymentStatus } from '../../finance/entities/payment.entity';
import { EscrowHold, EscrowHoldStatus } from '../../finance/entities/escrow-hold.entity';
import { Refund, RefundStatus } from '../../finance/entities/refund.entity';
import { Payout, PayoutStatus } from '../../finance/entities/payout.entity';
import { PayoutAccount, PayoutAccountStatus } from '../../finance/entities/payout-account.entity';
import { LedgerTransaction } from '../../finance/entities/ledger-transaction.entity';
import { LedgerEntry } from '../../finance/entities/ledger-entry.entity';
import { ReconciliationIssue, ReconciliationIssueStatus } from '../../finance/entities/reconciliation-issue.entity';
import { CommissionSnapshot } from '../../finance/entities/commission-snapshot.entity';
import { TaxLine } from '../../finance/entities/tax-line.entity';
import { ProviderEvent } from '../../finance/entities/provider-event.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { User } from '../../../users/entities/user.entity';
import { LedgerService } from '../../finance/services/ledger.service';
import { ReconciliationService } from '../../finance/services/reconciliation.service';
import { FinanceSettingsService } from '../../finance/services/finance-settings.service';
import { AuditService } from '../../audit/audit.service';
import { buildCsv } from '../utils/csv';
import { fromMinorUnits } from '../../../lib/money';

export interface FinanceSummary {
  capturedTotalMinor: string;
  capturedTodayMinor: string;
  heldInEscrowMinor: string;
  frozenHoldMinor: string;
  pendingRefundsCount: number;
  pendingRefundsMinor: string;
  hostPayableMinor: string;
  payoutsDueCount: number;
  failedPayoutsCount: number;
  openReconciliationIssues: number;
  isClean: boolean;
  ledgerInvariantsHealthy: boolean;
  currency: string;
}

@Injectable()
export class AdminFinanceService {
  private readonly logger = new Logger(AdminFinanceService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(EscrowHold)
    private readonly escrowRepo: Repository<EscrowHold>,
    @InjectRepository(Refund)
    private readonly refundRepo: Repository<Refund>,
    @InjectRepository(Payout)
    private readonly payoutRepo: Repository<Payout>,
    @InjectRepository(PayoutAccount)
    private readonly payoutAccountRepo: Repository<PayoutAccount>,
    @InjectRepository(LedgerTransaction)
    private readonly ledgerTxRepo: Repository<LedgerTransaction>,
    @InjectRepository(LedgerEntry)
    private readonly ledgerEntryRepo: Repository<LedgerEntry>,
    @InjectRepository(ReconciliationIssue)
    private readonly reconRepo: Repository<ReconciliationIssue>,
    @InjectRepository(CommissionSnapshot)
    private readonly commissionRepo: Repository<CommissionSnapshot>,
    @InjectRepository(TaxLine)
    private readonly taxRepo: Repository<TaxLine>,
    @InjectRepository(ProviderEvent)
    private readonly providerEventRepo: Repository<ProviderEvent>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly ledgerService: LedgerService,
    private readonly reconService: ReconciliationService,
    private readonly settingsService: FinanceSettingsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Retrieves high-level treasury summary metrics.
   */
  async getSummary(): Promise<FinanceSummary> {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    // 1. Captured metrics
    const capturedRes = await this.paymentRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount_minor), 0)', 'total')
      .addSelect(
        'COALESCE(SUM(CASE WHEN p.captured_at >= :startOfToday THEN p.amount_minor ELSE 0 END), 0)',
        'today',
      )
      .where('p.status = :status', { status: PaymentStatus.SUCCEEDED })
      .setParameter('startOfToday', startOfToday)
      .getRawOne();

    // 2. Escrow holds
    const escrowRes = await this.escrowRepo
      .createQueryBuilder('h')
      .select(
        'COALESCE(SUM(CASE WHEN h.status IN (:...heldStatuses) THEN (h.amount_minor - h.refunded_minor) ELSE 0 END), 0)',
        'heldTotal',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN h.status = :frozenStatus THEN (h.amount_minor - h.refunded_minor) ELSE 0 END), 0)',
        'frozenTotal',
      )
      .setParameters({
        heldStatuses: [EscrowHoldStatus.HELD, EscrowHoldStatus.PARTIALLY_REFUNDED, EscrowHoldStatus.FROZEN],
        frozenStatus: EscrowHoldStatus.FROZEN,
      })
      .getRawOne();

    // 3. Pending refunds
    const refundsRes = await this.refundRepo
      .createQueryBuilder('r')
      .select('COUNT(r.id)', 'count')
      .addSelect('COALESCE(SUM(r.amount_minor), 0)', 'total')
      .where('r.status IN (:...pendingStatuses)', {
        pendingStatuses: [RefundStatus.REQUESTED, RefundStatus.PENDING_APPROVAL],
      })
      .getRawOne();

    // 4. Host payable liability from ledger
    const hostPayableMinor = await this.ledgerService.getAccountBalance('2020');

    // 5. Payouts due & failed
    const payoutsRes = await this.payoutRepo
      .createQueryBuilder('po')
      .select(
        'COUNT(CASE WHEN po.status IN (:...dueStatuses) THEN 1 END)',
        'dueCount',
      )
      .addSelect(
        'COUNT(CASE WHEN po.status = :failedStatus THEN 1 END)',
        'failedCount',
      )
      .setParameters({
        dueStatuses: [PayoutStatus.DRAFT, PayoutStatus.PENDING_APPROVAL, PayoutStatus.APPROVED],
        failedStatus: PayoutStatus.FAILED,
      })
      .getRawOne();

    // 6. Reconciliation and invariants health
    const reconHealth = await this.reconService.getHealthSummary();
    const invariantHealth = await this.ledgerService.checkInvariants();

    return {
      capturedTotalMinor: capturedRes?.total || '0',
      capturedTodayMinor: capturedRes?.today || '0',
      heldInEscrowMinor: escrowRes?.heldTotal || '0',
      frozenHoldMinor: escrowRes?.frozenTotal || '0',
      pendingRefundsCount: parseInt(refundsRes?.count || '0', 10),
      pendingRefundsMinor: refundsRes?.total || '0',
      hostPayableMinor: hostPayableMinor.toString(),
      payoutsDueCount: parseInt(payoutsRes?.dueCount || '0', 10),
      failedPayoutsCount: parseInt(payoutsRes?.failedCount || '0', 10),
      openReconciliationIssues: reconHealth.openCount,
      isClean: reconHealth.isClean,
      ledgerInvariantsHealthy: invariantHealth.isHealthy,
      currency: 'ETB',
    };
  }

  /**
   * Paginated payments list with allowlisted sorting.
   */
  async listPayments(query: any) {
    const page = Math.max(parseInt(query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    const qb = this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.booking', 'booking')
      .leftJoinAndSelect('booking.guest', 'guest')
      .leftJoinAndSelect('booking.property', 'property');

    if (query.status) {
      qb.andWhere('payment.status = :status', { status: query.status });
    }
    if (query.method) {
      qb.andWhere('payment.method = :method', { method: query.method });
    }
    if (query.provider) {
      qb.andWhere('payment.provider = :provider', { provider: query.provider });
    }
    if (query.bookingId) {
      qb.andWhere('payment.bookingId = :bookingId', { bookingId: query.bookingId });
    }
    if (query.search) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere(
        '(payment.providerPaymentId ILIKE :term OR payment.idempotencyKey ILIKE :term OR booking.reference ILIKE :term OR guest.email ILIKE :term)',
        { term },
      );
    }

    const sortField = ['createdAt', 'capturedAt', 'amountMinor'].includes(query.sortBy)
      ? `payment.${query.sortBy}`
      : 'payment.createdAt';
    const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    qb.orderBy(sortField, sortOrder).skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Payment detail with attached escrow hold, commission snapshot, tax lines, and ledger transactions.
   */
  async getPaymentDetail(id: string) {
    const payment = await this.paymentRepo.findOne({
      where: [{ id }, { providerPaymentId: id }, { idempotencyKey: id }],
      relations: ['booking', 'booking.guest', 'booking.property'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }

    const escrowHold = await this.escrowRepo.findOne({
      where: { bookingId: payment.bookingId },
    });

    const commissionSnapshot = await this.commissionRepo.findOne({
      where: { bookingId: payment.bookingId },
    });

    const taxLines = await this.taxRepo.find({
      where: { bookingId: payment.bookingId },
    });

    const ledgerTransactions = await this.ledgerTxRepo.find({
      where: { paymentId: payment.id },
      relations: ['entries', 'entries.account'],
      order: { createdAt: 'ASC' },
    });

    const providerEvents = await this.providerEventRepo.find({
      where: { providerEventId: payment.providerPaymentId || payment.idempotencyKey },
      order: { receivedAt: 'DESC' },
    });

    return {
      payment,
      escrowHold,
      commissionSnapshot,
      taxLines,
      ledgerTransactions,
      providerEvents,
    };
  }

  /**
   * Paginated refunds list.
   */
  async listRefunds(query: any) {
    const page = Math.max(parseInt(query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    const qb = this.refundRepo
      .createQueryBuilder('refund')
      .leftJoinAndSelect('refund.booking', 'booking')
      .leftJoinAndSelect('refund.proposedBy', 'proposedBy')
      .leftJoinAndSelect('refund.approvedBy', 'approvedBy');

    if (query.status) {
      qb.andWhere('refund.status = :status', { status: query.status });
    }
    if (query.bookingId) {
      qb.andWhere('refund.bookingId = :bookingId', { bookingId: query.bookingId });
    }
    if (query.search) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere(
        '(refund.reason ILIKE :term OR refund.idempotencyKey ILIKE :term OR booking.reference ILIKE :term)',
        { term },
      );
    }

    qb.orderBy('refund.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Refund detail view.
   */
  async getRefundDetail(id: string) {
    const refund = await this.refundRepo.findOne({
      where: { id },
      relations: [
        'booking',
        'booking.property',
        'booking.guest',
        'payment',
        'proposedBy',
        'approvedBy',
        'events',
        'events.actor',
        'cancellationRequest',
        'case',
      ],
    });

    if (!refund) throw new NotFoundException(`Refund ${id} not found`);

    const ledgerTransactions = await this.ledgerTxRepo.find({
      where: { refundId: refund.id },
      relations: ['entries', 'entries.account'],
    });

    return { refund, ledgerTransactions };
  }

  /**
   * Paginated payouts list.
   */
  async listPayouts(query: any) {
    const page = Math.max(parseInt(query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    const qb = this.payoutRepo
      .createQueryBuilder('payout')
      .leftJoinAndSelect('payout.host', 'host')
      .leftJoinAndSelect('payout.payoutAccount', 'payoutAccount')
      .leftJoinAndSelect('payout.approvedBy', 'approvedBy');

    if (query.status) {
      qb.andWhere('payout.status = :status', { status: query.status });
    }
    if (query.hostId) {
      qb.andWhere('payout.hostId = :hostId', { hostId: query.hostId });
    }

    qb.orderBy('payout.createdAt', 'DESC').skip(skip).take(limit);

    const [rawPayouts, total] = await qb.getManyAndCount();

    // Mask sensitive fields
    const data = rawPayouts.map((p) => ({
      ...p,
      payoutAccount: p.payoutAccount
        ? {
            id: p.payoutAccount.id,
            provider: p.payoutAccount.provider,
            accountName: p.payoutAccount.accountName,
            accountNumberLast4: p.payoutAccount.accountNumberLast4,
            bankName: p.payoutAccount.bankName,
            status: p.payoutAccount.status,
          }
        : null,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Detailed payout view.
   */
  async getPayoutDetail(id: string) {
    const payout = await this.payoutRepo.findOne({
      where: { id },
      relations: [
        'host',
        'payoutAccount',
        'approvedBy',
        'items',
        'events',
        'events.actor',
      ],
    });

    if (!payout) throw new NotFoundException(`Payout ${id} not found`);

    const ledgerTransactions = await this.ledgerTxRepo.find({
      where: { payoutId: payout.id },
      relations: ['entries', 'entries.account'],
    });

    return {
      payout: {
        ...payout,
        payoutAccount: {
          id: payout.payoutAccount.id,
          provider: payout.payoutAccount.provider,
          accountName: payout.payoutAccount.accountName,
          accountNumberLast4: payout.payoutAccount.accountNumberLast4,
          phoneLast4: payout.payoutAccount.phoneLast4,
          bankName: payout.payoutAccount.bankName,
          bankBranch: payout.payoutAccount.bankBranch,
          status: payout.payoutAccount.status,
          verifiedAt: payout.payoutAccount.verifiedAt,
        },
      },
      ledgerTransactions,
    };
  }

  /**
   * Paginated masked host payout accounts list.
   */
  async listPayoutAccounts(query: any) {
    const page = Math.max(parseInt(query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    const qb = this.payoutAccountRepo
      .createQueryBuilder('acc')
      .leftJoinAndSelect('acc.host', 'host')
      .leftJoinAndSelect('acc.verifiedBy', 'verifiedBy');

    if (query.status) {
      qb.andWhere('acc.status = :status', { status: query.status });
    }
    if (query.hostId) {
      qb.andWhere('acc.hostId = :hostId', { hostId: query.hostId });
    }

    qb.orderBy('acc.createdAt', 'DESC').skip(skip).take(limit);

    const [accounts, total] = await qb.getManyAndCount();

    const data = accounts.map((acc) => ({
      id: acc.id,
      hostId: acc.hostId,
      hostName: acc.host?.name || 'Host',
      hostEmail: acc.host?.email,
      provider: acc.provider,
      accountName: acc.accountName,
      accountNumberLast4: acc.accountNumberLast4,
      phoneLast4: acc.phoneLast4,
      bankName: acc.bankName,
      bankBranch: acc.bankBranch,
      currency: acc.currency,
      status: acc.status,
      verifiedAt: acc.verifiedAt,
      verifiedBy: acc.verifiedBy ? { id: acc.verifiedBy.id, name: acc.verifiedBy.name } : null,
      rejectionReason: acc.rejectionReason,
      createdAt: acc.createdAt,
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Paginated ledger journal transactions and entries.
   */
  async listLedgerTransactions(query: any) {
    const page = Math.max(parseInt(query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    const qb = this.ledgerTxRepo
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.entries', 'entries')
      .leftJoinAndSelect('entries.account', 'account')
      .leftJoinAndSelect('tx.createdBy', 'createdBy');

    if (query.type) {
      qb.andWhere('tx.type = :type', { type: query.type });
    }
    if (query.bookingId) {
      qb.andWhere('tx.bookingId = :bookingId', { bookingId: query.bookingId });
    }

    qb.orderBy('tx.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Paginated escrow holds list.
   */
  async listEscrowHolds(query: any) {
    const page = Math.max(parseInt(query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    const qb = this.escrowRepo
      .createQueryBuilder('hold')
      .leftJoinAndSelect('hold.booking', 'booking')
      .leftJoinAndSelect('booking.property', 'property')
      .leftJoinAndSelect('hold.payment', 'payment');

    if (query.status) {
      qb.andWhere('hold.status = :status', { status: query.status });
    }
    if (query.bookingId) {
      qb.andWhere('hold.bookingId = :bookingId', { bookingId: query.bookingId });
    }

    qb.orderBy('hold.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Paginated reconciliation issues list.
   */
  async listReconciliationIssues(query: any) {
    const page = Math.max(parseInt(query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    const qb = this.reconRepo
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.resolvedBy', 'resolvedBy');

    if (query.status) {
      qb.andWhere('issue.status = :status', { status: query.status });
    }
    if (query.provider) {
      qb.andWhere('issue.provider = :provider', { provider: query.provider });
    }
    if (query.issueType) {
      qb.andWhere('issue.issueType = :issueType', { issueType: query.issueType });
    }

    qb.orderBy('issue.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Exports data as formula-injection-safe CSV.
   */
  async exportCsv(type: string): Promise<string> {
    switch (type) {
      case 'payments': {
        const payments = await this.paymentRepo.find({
          relations: ['booking', 'booking.guest'],
          order: { createdAt: 'DESC' },
          take: 1000,
        });
        const header = ['ID', 'Reference', 'Booking Ref', 'Guest', 'Provider', 'Method', 'Amount ETB', 'Status', 'Captured At', 'Created At'];
        const rows = payments.map((p) => [
          p.id,
          p.providerPaymentId || p.idempotencyKey,
          p.booking?.reference || p.bookingId,
          p.booking?.guest?.name || p.booking?.guest?.email || '',
          p.provider,
          p.method,
          fromMinorUnits(BigInt(p.amountMinor)),
          p.status,
          p.capturedAt ? p.capturedAt.toISOString() : '',
          p.createdAt.toISOString(),
        ]);
        return buildCsv(header, rows);
      }
      case 'refunds': {
        const refunds = await this.refundRepo.find({
          relations: ['booking', 'proposedBy', 'approvedBy'],
          order: { createdAt: 'DESC' },
          take: 1000,
        });
        const header = ['ID', 'Booking Ref', 'Amount ETB', 'Status', 'Reason', 'Policy Tier', 'Proposed By', 'Approved By', 'Created At'];
        const rows = refunds.map((r) => [
          r.id,
          r.booking?.reference || r.bookingId,
          fromMinorUnits(BigInt(r.amountMinor)),
          r.status,
          r.reason,
          r.policyTier || '',
          r.proposedBy?.name || r.proposedById,
          r.approvedBy?.name || r.approvedById || '',
          r.createdAt.toISOString(),
        ]);
        return buildCsv(header, rows);
      }
      case 'payouts': {
        const payouts = await this.payoutRepo.find({
          relations: ['host', 'payoutAccount'],
          order: { createdAt: 'DESC' },
          take: 1000,
        });
        const header = ['ID', 'Host', 'Account Last 4', 'Period Start', 'Period End', 'Amount ETB', 'Status', 'Provider Ref', 'Paid At'];
        const rows = payouts.map((p) => [
          p.id,
          p.host?.name || p.hostId,
          p.payoutAccount?.accountNumberLast4 || '',
          p.periodStart,
          p.periodEnd,
          fromMinorUnits(BigInt(p.amountMinor)),
          p.status,
          p.providerTransferId || '',
          p.paidAt ? p.paidAt.toISOString() : '',
        ]);
        return buildCsv(header, rows);
      }
      case 'ledger': {
        const entries = await this.ledgerEntryRepo.find({
          relations: ['transaction', 'account'],
          order: { createdAt: 'DESC' },
          take: 2000,
        });
        const header = ['Entry ID', 'Tx Reference', 'Tx Type', 'Account Code', 'Account Name', 'Debit ETB', 'Credit ETB', 'Memo', 'Created At'];
        const rows = entries.map((e) => [
          e.id,
          e.transaction?.reference || e.transactionId,
          e.transaction?.type || '',
          e.account?.code || '',
          e.account?.name || '',
          fromMinorUnits(BigInt(e.debitMinor)),
          fromMinorUnits(BigInt(e.creditMinor)),
          e.memo || '',
          e.createdAt.toISOString(),
        ]);
        return buildCsv(header, rows);
      }
      default:
        throw new BadRequestException(`Unsupported export type: ${type}`);
    }
  }
}
