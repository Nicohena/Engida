import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ReconciliationIssue,
  ReconciliationIssueStatus,
  ReconciliationIssueType,
} from '../entities/reconciliation-issue.entity';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { Refund, RefundStatus } from '../entities/refund.entity';
import { Payout, PayoutStatus } from '../entities/payout.entity';
import { AuditService } from '../../audit/audit.service';
import { User } from '../../../users/entities/user.entity';
import { toMinorUnits } from '../../../lib/money';

export interface SettlementRow {
  providerReference: string;
  transactionType: 'CHARGE' | 'REFUND' | 'TRANSFER' | 'FEE';
  amount: number | string;
  currency: string;
  date: string;
  fee?: number | string;
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    @InjectRepository(ReconciliationIssue)
    private readonly issueRepo: Repository<ReconciliationIssue>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Refund)
    private readonly refundRepo: Repository<Refund>,
    @InjectRepository(Payout)
    private readonly payoutRepo: Repository<Payout>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Ingests settlement report lines and compares against internal transactions.
   */
  async ingestSettlementReport(
    provider: string,
    rows: SettlementRow[],
    actor?: User | null,
  ): Promise<{ processed: number; matched: number; issuesCreated: number }> {
    let matched = 0;
    let issuesCreated = 0;

    for (const row of rows) {
      const amountMinor = toMinorUnits(row.amount);
      const ref = row.providerReference;

      if (row.transactionType === 'CHARGE') {
        const payment = await this.paymentRepo.findOne({
          where: [{ providerPaymentId: ref }, { idempotencyKey: ref }],
        });

        if (!payment) {
          await this.createIssue({
            provider,
            issueType: ReconciliationIssueType.MISSING_PAYMENT,
            providerReference: ref,
            actualMinor: amountMinor,
            currency: row.currency || 'ETB',
            details: { row, reason: 'Settlement contains capture not recorded in payments table' },
          });
          issuesCreated += 1;
        } else if (BigInt(payment.amountMinor) !== amountMinor) {
          await this.createIssue({
            provider,
            issueType: ReconciliationIssueType.AMOUNT_MISMATCH,
            providerReference: ref,
            paymentId: payment.id,
            expectedMinor: BigInt(payment.amountMinor),
            actualMinor: amountMinor,
            currency: row.currency || 'ETB',
            details: { row, paymentAmountMinor: payment.amountMinor },
          });
          issuesCreated += 1;
        } else {
          matched += 1;
        }
      } else if (row.transactionType === 'REFUND') {
        const refund = await this.refundRepo.findOne({
          where: [{ providerRefundId: ref }, { idempotencyKey: ref }],
        });

        if (!refund) {
          await this.createIssue({
            provider,
            issueType: ReconciliationIssueType.MISSING_REFUND,
            providerReference: ref,
            actualMinor: amountMinor,
            currency: row.currency || 'ETB',
            details: { row, reason: 'Settlement contains refund not found in refunds table' },
          });
          issuesCreated += 1;
        } else if (BigInt(refund.amountMinor) !== amountMinor) {
          await this.createIssue({
            provider,
            issueType: ReconciliationIssueType.AMOUNT_MISMATCH,
            providerReference: ref,
            refundId: refund.id,
            expectedMinor: BigInt(refund.amountMinor),
            actualMinor: amountMinor,
            currency: row.currency || 'ETB',
            details: { row, refundAmountMinor: refund.amountMinor },
          });
          issuesCreated += 1;
        } else {
          matched += 1;
        }
      } else if (row.transactionType === 'TRANSFER') {
        const payout = await this.payoutRepo.findOne({
          where: [{ providerTransferId: ref }, { idempotencyKey: ref }],
        });

        if (!payout) {
          await this.createIssue({
            provider,
            issueType: ReconciliationIssueType.UNMATCHED_SETTLEMENT,
            providerReference: ref,
            actualMinor: amountMinor,
            currency: row.currency || 'ETB',
            details: { row, reason: 'Settlement transfer not found in payouts table' },
          });
          issuesCreated += 1;
        } else {
          matched += 1;
        }
      }
    }

    this.logger.log(`Reconciliation report completed: ${rows.length} rows, ${matched} matched, ${issuesCreated} issues created`);
    return { processed: rows.length, matched, issuesCreated };
  }

  /**
   * Creates a reconciliation issue record if not already open for the same reference.
   */
  private async createIssue(params: {
    provider: string;
    issueType: ReconciliationIssueType;
    providerReference: string;
    paymentId?: string;
    refundId?: string;
    payoutId?: string;
    expectedMinor?: bigint;
    actualMinor?: bigint;
    currency: string;
    details: Record<string, any>;
  }) {
    const existing = await this.issueRepo.findOne({
      where: {
        provider: params.provider,
        providerReference: params.providerReference,
        status: ReconciliationIssueStatus.OPEN,
      },
    });

    if (existing) return existing;

    const issue = this.issueRepo.create({
      provider: params.provider,
      issueType: params.issueType,
      providerReference: params.providerReference,
      paymentId: params.paymentId || null,
      refundId: params.refundId || null,
      payoutId: params.payoutId || null,
      expectedMinor: params.expectedMinor !== undefined ? params.expectedMinor.toString() : null,
      actualMinor: params.actualMinor !== undefined ? params.actualMinor.toString() : null,
      currency: params.currency,
      details: params.details,
      status: ReconciliationIssueStatus.OPEN,
    });

    return this.issueRepo.save(issue);
  }

  /**
   * Admin resolves a reconciliation issue with mandatory resolution notes.
   */
  async resolveIssue(
    issueId: string,
    resolutionNote: string,
    actor: User,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    if (!resolutionNote || !resolutionNote.trim()) {
      throw new BadRequestException('A resolution note is required to resolve a reconciliation issue');
    }

    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) {
      throw new NotFoundException(`Reconciliation issue ${issueId} not found`);
    }

    issue.status = ReconciliationIssueStatus.RESOLVED;
    issue.resolvedById = actor.id;
    issue.resolvedAt = new Date();
    issue.resolutionNote = resolutionNote;
    await this.issueRepo.save(issue);

    await this.auditService.record({
      actor,
      action: 'finance.reconciliation_resolved',
      entityType: 'reconciliation_issue',
      entityId: issue.id,
      after: { status: issue.status, resolutionNote },
      metadata: { issueType: issue.issueType, providerRef: issue.providerReference },
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    });

    return issue;
  }

  /**
   * Returns current reconciliation health summary.
   */
  async getHealthSummary() {
    const openIssues = await this.issueRepo.count({
      where: { status: ReconciliationIssueStatus.OPEN },
    });
    const investigatingIssues = await this.issueRepo.count({
      where: { status: ReconciliationIssueStatus.INVESTIGATING },
    });

    return {
      isClean: openIssues === 0 && investigatingIssues === 0,
      openCount: openIssues,
      investigatingCount: investigatingIssues,
    };
  }
}
