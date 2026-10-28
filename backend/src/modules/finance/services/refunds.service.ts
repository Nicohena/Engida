import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Refund, RefundStatus } from '../entities/refund.entity';
import { RefundEvent } from '../entities/refund-event.entity';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { EscrowHold, EscrowHoldStatus } from '../entities/escrow-hold.entity';
import { CommissionSnapshot } from '../entities/commission-snapshot.entity';
import { Booking, PaymentStatus as BookingPaymentStatus } from '../../bookings/entities/booking.entity';
import { CancellationRequest } from '../../bookings/entities/cancellation-request.entity';
import { Case, CompensationStatus } from '../../admin/cases/entities/case.entity';
import { User } from '../../../users/entities/user.entity';
import { SandboxPaymentProvider } from '../providers/sandbox-payment.provider';
import { ChapaPaymentProvider } from '../providers/chapa-payment.provider';
import { LedgerService } from './ledger.service';
import { FinanceSettingsService } from './finance-settings.service';
import { AuditService } from '../../audit/audit.service';
import { previewCancellationPolicy } from '../../bookings/cancellation-policy.service';
import { toMinorUnits } from '../../../lib/money';
import { LedgerTransactionType } from '../entities/ledger-transaction.entity';

export class ProposeRefundDto {
  bookingId: string;
  paymentId?: string;
  amountMinor?: string | bigint;
  reason: string;
  cancellationRequestId?: string;
  caseId?: string;
  policyTier?: string;
}

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Refund)
    private readonly refundRepo: Repository<Refund>,
    @InjectRepository(RefundEvent)
    private readonly refundEventRepo: Repository<RefundEvent>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(EscrowHold)
    private readonly escrowRepo: Repository<EscrowHold>,
    @InjectRepository(CommissionSnapshot)
    private readonly commissionRepo: Repository<CommissionSnapshot>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(CancellationRequest)
    private readonly cancelReqRepo: Repository<CancellationRequest>,
    @InjectRepository(Case)
    private readonly caseRepo: Repository<Case>,
    private readonly sandboxProvider: SandboxPaymentProvider,
    private readonly chapaProvider: ChapaPaymentProvider,
    private readonly ledgerService: LedgerService,
    private readonly settingsService: FinanceSettingsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Computes available refundable amount for a booking.
   */
  async getRefundableAmount(bookingId: string): Promise<{
    capturedMinor: bigint;
    priorRefundedMinor: bigint;
    availableMinor: bigint;
    payment: Payment | null;
  }> {
    const payment = await this.paymentRepo.findOne({
      where: { bookingId, status: PaymentStatus.SUCCEEDED },
      order: { capturedAt: 'DESC' },
    });

    if (!payment) {
      return {
        capturedMinor: 0n,
        priorRefundedMinor: 0n,
        availableMinor: 0n,
        payment: null,
      };
    }

    const capturedMinor = BigInt(payment.amountMinor);

    const successfulRefunds = await this.refundRepo.find({
      where: { bookingId, status: RefundStatus.SUCCEEDED },
    });

    const priorRefundedMinor = successfulRefunds.reduce(
      (sum, r) => sum + BigInt(r.amountMinor),
      0n,
    );

    const availableMinor =
      capturedMinor > priorRefundedMinor ? capturedMinor - priorRefundedMinor : 0n;

    return {
      capturedMinor,
      priorRefundedMinor,
      availableMinor,
      payment,
    };
  }

  /**
   * Proposes a refund with policy check and dual-approval classification.
   */
  async proposeRefund(
    dto: ProposeRefundDto,
    proposer: User,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const { availableMinor, payment } = await this.getRefundableAmount(dto.bookingId);

    if (!payment) {
      throw new BadRequestException('No captured payment found for this booking');
    }

    let refundAmountMinor: bigint;
    let policyTier = dto.policyTier || null;

    if (dto.amountMinor !== undefined) {
      refundAmountMinor = BigInt(dto.amountMinor);
    } else if (dto.cancellationRequestId) {
      // Recompute from cancellation policy server-side
      const cancelReq = await this.cancelReqRepo.findOne({
        where: { id: dto.cancellationRequestId },
        relations: ['booking'],
      });
      if (!cancelReq) {
        throw new NotFoundException('Cancellation request not found');
      }
      const preview = previewCancellationPolicy({
        policyTier: cancelReq.booking?.cancellationPolicy,
        checkInDate: cancelReq.booking?.checkInDate || '',
        totalPrice: cancelReq.booking?.totalPrice || 0,
      });
      refundAmountMinor = toMinorUnits(preview.refundAmount);
      policyTier = preview.policyTier;
    } else {
      // Default to full available amount
      refundAmountMinor = availableMinor;
    }

    if (refundAmountMinor <= 0n) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }

    if (refundAmountMinor > availableMinor) {
      throw new BadRequestException(
        `Requested refund amount (${refundAmountMinor}) exceeds available refundable balance (${availableMinor})`,
      );
    }

    const settings = await this.settingsService.getAllSettings();
    const thresholdMinor = BigInt(settings.refundDualApprovalThresholdMinor);

    const requiresDualApproval = refundAmountMinor >= thresholdMinor;
    const initialStatus = requiresDualApproval
      ? RefundStatus.PENDING_APPROVAL
      : RefundStatus.REQUESTED;

    const idempotencyKey = `ref_${dto.bookingId}_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

    const refund = this.refundRepo.create({
      bookingId: dto.bookingId,
      paymentId: payment.id,
      cancellationRequestId: dto.cancellationRequestId || null,
      caseId: dto.caseId || null,
      amountMinor: refundAmountMinor.toString(),
      currency: payment.currency,
      reason: dto.reason,
      policyTier,
      status: initialStatus,
      proposedById: proposer.id,
      approvedById: requiresDualApproval ? null : proposer.id,
      approvedAt: requiresDualApproval ? null : new Date(),
      idempotencyKey,
    });

    const savedRefund = await this.refundRepo.save(refund);

    // Record refund event
    const event = this.refundEventRepo.create({
      refundId: savedRefund.id,
      eventType: requiresDualApproval ? 'REFUND_REQUESTED' : 'REFUND_AUTO_APPROVED',
      toStatus: initialStatus,
      actorId: proposer.id,
      reason: dto.reason,
    });
    await this.refundEventRepo.save(event);

    await this.auditService.record({
      actor: proposer,
      action: 'finance.refund_requested',
      entityType: 'refund',
      entityId: savedRefund.id,
      after: {
        amountMinor: savedRefund.amountMinor,
        status: savedRefund.status,
        requiresDualApproval,
      },
      metadata: { reason: dto.reason, bookingId: dto.bookingId },
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    });

    return savedRefund;
  }

  /**
   * Approves a pending refund. Strictly enforces the four-eyes / dual approval rule.
   */
  async approveRefund(
    refundId: string,
    approver: User,
    reason: string,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const refund = await this.refundRepo.findOne({
      where: { id: refundId },
      relations: ['booking'],
    });

    if (!refund) {
      throw new NotFoundException(`Refund ${refundId} not found`);
    }

    if (refund.status !== RefundStatus.PENDING_APPROVAL && refund.status !== RefundStatus.REQUESTED) {
      throw new BadRequestException(`Refund is not in an approvable status (${refund.status})`);
    }

    // Strict two-person rule: proposer cannot approve their own refund
    if (refund.proposedById === approver.id) {
      throw new ForbiddenException(
        'Dual approval violation: An administrator cannot approve a refund they proposed',
      );
    }

    refund.status = RefundStatus.APPROVED;
    refund.approvedById = approver.id;
    refund.approvedAt = new Date();
    await this.refundRepo.save(refund);

    const event = this.refundEventRepo.create({
      refundId: refund.id,
      eventType: 'REFUND_APPROVED',
      fromStatus: RefundStatus.PENDING_APPROVAL,
      toStatus: RefundStatus.APPROVED,
      actorId: approver.id,
      reason,
    });
    await this.refundEventRepo.save(event);

    await this.auditService.record({
      actor: approver,
      action: 'finance.refund_approved',
      entityType: 'refund',
      entityId: refund.id,
      after: { status: refund.status },
      metadata: { reason },
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    });

    return refund;
  }

  /**
   * Rejects a refund proposal with a reason.
   */
  async rejectRefund(
    refundId: string,
    actor: User,
    reason: string,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const refund = await this.refundRepo.findOne({ where: { id: refundId } });
    if (!refund) throw new NotFoundException('Refund not found');

    if (refund.status === RefundStatus.SUCCEEDED || refund.status === RefundStatus.PROCESSING) {
      throw new BadRequestException('Cannot reject a completed or processing refund');
    }

    const fromStatus = refund.status;
    refund.status = RefundStatus.CANCELLED;
    await this.refundRepo.save(refund);

    const event = this.refundEventRepo.create({
      refundId: refund.id,
      eventType: 'REFUND_REJECTED',
      fromStatus,
      toStatus: RefundStatus.CANCELLED,
      actorId: actor.id,
      reason,
    });
    await this.refundEventRepo.save(event);

    await this.auditService.record({
      actor,
      action: 'finance.refund_rejected',
      entityType: 'refund',
      entityId: refund.id,
      after: { status: refund.status },
      metadata: { reason },
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    });

    return refund;
  }

  /**
   * Executes an approved refund via the payment provider and posts double-entry ledger entries.
   */
  async executeRefund(
    refundId: string,
    actor?: User | null,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const refund = await this.refundRepo.findOne({
      where: { id: refundId },
      relations: ['booking', 'payment'],
    });

    if (!refund) {
      throw new NotFoundException(`Refund ${refundId} not found`);
    }

    if (
      refund.status !== RefundStatus.APPROVED &&
      refund.status !== RefundStatus.REQUESTED &&
      refund.status !== RefundStatus.FAILED
    ) {
      throw new BadRequestException(`Refund is not ready for execution (${refund.status})`);
    }

    refund.status = RefundStatus.PROCESSING;
    await this.refundRepo.save(refund);

    const settings = await this.settingsService.getAllSettings();
    const isLive = settings.liveRefundsEnabled;

    const provider =
      isLive && refund.payment?.provider === 'CHAPA'
        ? this.chapaProvider
        : this.sandboxProvider;

    const providerResult = await provider.executeRefund({
      refundId: refund.id,
      providerPaymentId: refund.payment?.providerPaymentId || refund.paymentId || refund.id,
      amountMinor: BigInt(refund.amountMinor),
      currency: refund.currency,
      reason: refund.reason,
      idempotencyKey: refund.idempotencyKey,
    });

    if (providerResult.status === 'SUCCEEDED') {
      return this.handleRefundSuccess(refund, providerResult, actor, context);
    } else {
      return this.handleRefundFailure(refund, providerResult, actor, context);
    }
  }

  /**
   * Handles confirmed provider refund: posts ledger entries, updates hold & booking, audits.
   */
  private async handleRefundSuccess(
    refund: Refund,
    providerResult: any,
    actor?: User | null,
    context?: any,
  ) {
    return this.dataSource.transaction(async (manager: EntityManager) => {
      const refRepo = manager.getRepository(Refund);
      const evRepo = manager.getRepository(RefundEvent);
      const bookRepo = manager.getRepository(Booking);
      const escrowRepo = manager.getRepository(EscrowHold);
      const commRepo = manager.getRepository(CommissionSnapshot);

      refund.status = RefundStatus.SUCCEEDED;
      refund.providerRefundId = providerResult.providerRefundId;
      refund.completedAt = new Date();
      await refRepo.save(refund);

      const refundAmountMinor = BigInt(refund.amountMinor);

      // Check escrow hold status
      const hold = await escrowRepo.findOne({ where: { bookingId: refund.bookingId } });
      const comm = await commRepo.findOne({ where: { bookingId: refund.bookingId } });
      const booking = await bookRepo.findOne({
        where: { id: refund.bookingId },
        relations: ['property'],
      });

      const hostId = booking?.property?.hostId || (booking as any)?.hostId;

      if (hold && hold.status !== EscrowHoldStatus.RELEASED) {
        // Funds are still held in escrow: debit Escrow Liability, credit Refund Clearing
        await this.ledgerService.recordTransaction(
          {
            type: LedgerTransactionType.REFUND,
            reference: `REF-${refund.id.slice(0, 8)}`,
            idempotencyKey: `tx_refund_${refund.id}`,
            bookingId: refund.bookingId,
            refundId: refund.id,
            description: `Refund for booking ${booking?.reference || refund.bookingId}: funds reversed from escrow`,
            createdById: actor?.id ?? null,
            entries: [
              {
                accountCode: '2010',
                accountName: 'ESCROW_LIABILITY',
                debitMinor: refundAmountMinor,
                creditMinor: 0n,
                currency: refund.currency,
                memo: `Escrow liability reduction on refund`,
              },
              {
                accountCode: '2040',
                accountName: 'REFUND_CLEARING',
                debitMinor: 0n,
                creditMinor: refundAmountMinor,
                currency: refund.currency,
                memo: `Refund clearing via ${providerResult.providerRefundId}`,
              },
            ],
          },
          manager,
        );

        const currentRefunded = BigInt(hold.refundedMinor);
        const newRefunded = currentRefunded + refundAmountMinor;
        hold.refundedMinor = newRefunded.toString();
        hold.status =
          newRefunded >= BigInt(hold.amountMinor)
            ? EscrowHoldStatus.REFUNDED
            : EscrowHoldStatus.PARTIALLY_REFUNDED;
        await escrowRepo.save(hold);
      } else {
        // Funds were already released: reverse host payable and proportional platform commission
        let commissionReversed = 0n;
        let hostShareReversed = refundAmountMinor;

        if (comm && booking) {
          const originalCaptured = toMinorUnits(booking.totalPrice);
          const originalCommission = BigInt(comm.commissionMinor);
          if (originalCaptured > 0n) {
            commissionReversed = (originalCommission * refundAmountMinor) / originalCaptured;
            hostShareReversed = refundAmountMinor - commissionReversed;
          }
        }

        await this.ledgerService.recordTransaction(
          {
            type: LedgerTransactionType.REFUND,
            reference: `REF-${refund.id.slice(0, 8)}`,
            idempotencyKey: `tx_refund_${refund.id}`,
            bookingId: refund.bookingId,
            refundId: refund.id,
            description: `Refund for booking ${booking?.reference || refund.bookingId}: proportional reversal from host payable and commission`,
            createdById: actor?.id ?? null,
            entries: [
              {
                accountCode: `2020-HOST-${hostId?.slice(0, 8) || 'GEN'}`,
                accountName: `Host Payable (${hostId?.slice(0, 8) || 'GEN'})`,
                ownerId: hostId,
                ownerType: 'HOST',
                debitMinor: hostShareReversed,
                creditMinor: 0n,
                currency: refund.currency,
                memo: `Host payout reduction for completed refund`,
              },
              {
                accountCode: '4010',
                accountName: 'PLATFORM_COMMISSION_REVENUE',
                debitMinor: commissionReversed,
                creditMinor: 0n,
                currency: refund.currency,
                memo: `Proportional platform commission refund reversal`,
              },
              {
                accountCode: '2040',
                accountName: 'REFUND_CLEARING',
                debitMinor: 0n,
                creditMinor: refundAmountMinor,
                currency: refund.currency,
                memo: `Refund clearing via ${providerResult.providerRefundId}`,
              },
            ],
          },
          manager,
        );
      }

      // Update booking payment status summary
      if (booking) {
        const { capturedMinor, priorRefundedMinor } = await this.getRefundableAmount(booking.id);
        const totalRefundedNow = priorRefundedMinor + refundAmountMinor;
        if (totalRefundedNow >= capturedMinor) {
          booking.paymentStatus = BookingPaymentStatus.REFUNDED;
        }
        await bookRepo.save(booking);
      }

      // If linked to a case compensation, update case status
      if (refund.caseId) {
        const caseEntity = await manager.getRepository(Case).findOne({ where: { id: refund.caseId } });
        if (caseEntity) {
          caseEntity.compensationStatus = CompensationStatus.APPROVED;
          await manager.save(caseEntity);
        }
      }

      const event = evRepo.create({
        refundId: refund.id,
        eventType: 'REFUND_SUCCEEDED',
        fromStatus: RefundStatus.PROCESSING,
        toStatus: RefundStatus.SUCCEEDED,
        actorId: actor?.id ?? null,
        providerReference: providerResult.providerRefundId,
      });
      await evRepo.save(event);

      await this.auditService.record(
        {
          actor,
          action: 'finance.refund_executed',
          entityType: 'refund',
          entityId: refund.id,
          after: {
            status: refund.status,
            providerRefundId: refund.providerRefundId,
            amountMinor: refund.amountMinor,
          },
          metadata: { bookingId: refund.bookingId },
          ipAddress: context?.ipAddress ?? null,
          userAgent: context?.userAgent ?? null,
        },
        manager,
      );

      return refund;
    });
  }

  /**
   * Handles failed provider refund attempt without corrupting state.
   */
  private async handleRefundFailure(
    refund: Refund,
    providerResult: any,
    actor?: User | null,
    context?: any,
  ) {
    refund.status = RefundStatus.FAILED;
    refund.failureCode = providerResult.failureCode || 'EXECUTION_FAILED';
    refund.failureMessage = providerResult.failureMessage || 'Provider rejected refund';
    await this.refundRepo.save(refund);

    const event = this.refundEventRepo.create({
      refundId: refund.id,
      eventType: 'REFUND_FAILED',
      fromStatus: RefundStatus.PROCESSING,
      toStatus: RefundStatus.FAILED,
      actorId: actor?.id ?? null,
      reason: refund.failureMessage,
    });
    await this.refundEventRepo.save(event);

    await this.auditService.record({
      actor,
      action: 'finance.refund_failed',
      entityType: 'refund',
      entityId: refund.id,
      after: {
        status: refund.status,
        failureCode: refund.failureCode,
        failureMessage: refund.failureMessage,
      },
      metadata: { bookingId: refund.bookingId },
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    });

    return refund;
  }
}
