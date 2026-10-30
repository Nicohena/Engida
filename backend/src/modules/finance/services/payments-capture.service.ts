import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { ProviderEvent, ProviderEventStatus } from '../entities/provider-event.entity';
import { EscrowHold, EscrowHoldStatus } from '../entities/escrow-hold.entity';
import { CommissionSnapshot } from '../entities/commission-snapshot.entity';
import { TaxLine, TaxType } from '../entities/tax-line.entity';
import { Booking, BookingStatus, PaymentStatus as BookingPaymentStatus } from '../../bookings/entities/booking.entity';
import { User } from '../../../users/entities/user.entity';
import { SandboxPaymentProvider } from '../providers/sandbox-payment.provider';
import { ChapaPaymentProvider } from '../providers/chapa-payment.provider';
import { LedgerService } from './ledger.service';
import { FinanceSettingsService } from './finance-settings.service';
import { AuditService } from '../../audit/audit.service';
import { calculateBasisPoints, toMinorUnits } from '../../../lib/money';
import { LedgerTransactionType } from '../entities/ledger-transaction.entity';
import { Coupon } from '../../coupons/entities/coupon.entity';
import { CouponRedemption } from '../../coupons/entities/coupon-redemption.entity';

export interface CreateSessionDto {
  bookingId: string;
  paymentMethod: string;
  currency?: string;
  customerPhone?: string;
  returnUrl?: string;
}

@Injectable()
export class PaymentsCaptureService {
  private readonly logger = new Logger(PaymentsCaptureService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(ProviderEvent)
    private readonly eventRepository: Repository<ProviderEvent>,
    @InjectRepository(EscrowHold)
    private readonly escrowRepository: Repository<EscrowHold>,
    @InjectRepository(CommissionSnapshot)
    private readonly commissionRepository: Repository<CommissionSnapshot>,
    @InjectRepository(TaxLine)
    private readonly taxRepository: Repository<TaxLine>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly sandboxProvider: SandboxPaymentProvider,
    private readonly chapaProvider: ChapaPaymentProvider,
    private readonly ledgerService: LedgerService,
    private readonly settingsService: FinanceSettingsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Guest initiates payment session. Amount is derived strictly from server booking quote.
   */
  async createPaymentSession(dto: CreateSessionDto, user: User) {
    if (!dto.bookingId) {
      throw new BadRequestException('bookingId is required');
    }

    const booking = await this.bookingRepository.findOne({
      where: { id: dto.bookingId },
      relations: ['property'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${dto.bookingId} not found`);
    }

    // Rental cash on arrival is no longer allowed for new bookings
    if (dto.paymentMethod === 'CASH_ON_ARRIVAL') {
      throw new BadRequestException(
        'Cash on arrival is no longer accepted for rental reservations. Please select an electronic payment method.',
      );
    }

    if (booking.paymentStatus === BookingPaymentStatus.PAID) {
      throw new ConflictException('This booking has already been paid');
    }

    const amountMinor = toMinorUnits(booking.totalPrice);
    if (amountMinor <= 0n) {
      throw new BadRequestException('Booking amount must be greater than zero');
    }

    const currency = dto.currency || booking.paymentCurrency || 'ETB';
    const settings = await this.settingsService.getAllSettings();
    const liveAllowed = settings.liveCaptureEnabled;

    const provider =
      liveAllowed && dto.paymentMethod === 'CHAPA'
        ? this.chapaProvider
        : this.sandboxProvider;

    const idempotencyKey = `bkg_${booking.id}_pay_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

    const sessionResult = await provider.createSession({
      bookingId: booking.id,
      amountMinor,
      currency,
      paymentMethod: dto.paymentMethod,
      customerEmail: user.email,
      customerName: user.name || 'Guest',
      customerPhone: dto.customerPhone,
      returnUrl: dto.returnUrl,
      propertyTitle: booking.property?.title || 'ENGIDA Stay',
      city: booking.property?.city || 'Addis Ababa',
      idempotencyKey,
    });

    const payment = this.paymentRepository.create({
      bookingId: booking.id,
      provider: provider.providerName,
      providerPaymentId: sessionResult.providerPaymentId || sessionResult.sessionId,
      idempotencyKey,
      status: PaymentStatus.INITIATED,
      method: dto.paymentMethod,
      amountMinor: amountMinor.toString(),
      currency,
      metadata: sessionResult.metadata || null,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    return {
      paymentId: savedPayment.id,
      sessionId: sessionResult.sessionId,
      checkoutUrl: sessionResult.checkoutUrl,
      providerPaymentId: savedPayment.providerPaymentId,
      status: savedPayment.status,
      amount: booking.totalPrice,
      currency: savedPayment.currency,
      mode: sessionResult.mode,
    };
  }

  /**
   * Retrieves public payment session status (no secrets or sensitive PAN data).
   */
  async getPaymentSession(id: string, user: User) {
    const payment = await this.paymentRepository.findOne({
      where: [{ id }, { providerPaymentId: id }, { idempotencyKey: id }],
      relations: ['booking'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Owner check: booking guest or admin
    if (payment.booking?.guestId !== user.id && user.role !== 'ADMIN') {
      throw new UnauthorizedException('You do not have access to this payment session');
    }

    return {
      id: payment.id,
      bookingId: payment.bookingId,
      status: payment.status,
      method: payment.method,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      capturedAt: payment.capturedAt,
      failureCode: payment.failureCode,
      failureMessage: payment.failureMessage,
    };
  }

  /**
   * Webhook ingestion with signature verification and replay safety.
   */
  async handleWebhook(
    providerName: string,
    rawBody: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
  ) {
    const provider =
      providerName.toUpperCase() === 'CHAPA'
        ? this.chapaProvider
        : this.sandboxProvider;

    const verification = await provider.verifyWebhook(rawBody, headers);

    // Replay safety: check if this event was already ingested
    const existingEvent = await this.eventRepository.findOne({
      where: {
        provider: provider.providerName,
        providerEventId: verification.providerEventId,
      },
    });

    if (existingEvent) {
      existingEvent.replayCount += 1;
      await this.eventRepository.save(existingEvent);
      this.logger.warn(`Duplicate webhook received: ${provider.providerName}/${verification.providerEventId}`);
      return { received: true, duplicate: true };
    }

    const event = this.eventRepository.create({
      provider: provider.providerName,
      providerEventId: verification.providerEventId,
      eventType: verification.eventType,
      signatureVerified: verification.isValid,
      payload: verification.payload,
      status: verification.isValid ? ProviderEventStatus.RECEIVED : ProviderEventStatus.FAILED,
      error: verification.isValid ? null : 'Signature verification failed',
    });

    await this.eventRepository.save(event);

    if (!verification.isValid) {
      this.logger.error(`Webhook rejected: invalid signature for ${provider.providerName}`);
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Check if event signals successful payment capture
    const isSuccess =
      verification.status === 'success' ||
      verification.eventType === 'charge.completed' ||
      verification.eventType === 'payment.succeeded';

    if (isSuccess && (verification.providerPaymentId || verification.txRef)) {
      await this.processCaptureSuccess(verification, event);
    }

    return { received: true, status: event.status };
  }

  /**
   * Processes successful capture atomically in one DB transaction:
   * 1. Marks payment SUCCEEDED
   * 2. Creates EscrowHold (HELD)
   * 3. Creates CommissionSnapshot & TaxLine
   * 4. Posts balanced double-entry transaction:
   *    Debit PROVIDER_CLEARING (1010)
   *    Credit ESCROW_LIABILITY (2010)
   * 5. Updates booking to PAID
   * 6. Writes audit record
   */
  private async processCaptureSuccess(
    verification: any,
    event: ProviderEvent,
  ) {
    const ref = verification.providerPaymentId || verification.txRef;

    return this.dataSource.transaction(async (manager: EntityManager) => {
      const payRepo = manager.getRepository(Payment);
      const bookRepo = manager.getRepository(Booking);
      const escrowRepo = manager.getRepository(EscrowHold);
      const commRepo = manager.getRepository(CommissionSnapshot);
      const taxRepo = manager.getRepository(TaxLine);

      // Locate payment attempt
      let payment = await payRepo.findOne({
        where: [
          { providerPaymentId: ref },
          { idempotencyKey: ref },
          { id: verification.payload?.payment_id },
        ],
      });

      // Fallback: look up booking if tx_ref maps to booking reference
      if (!payment && verification.txRef) {
        const booking = await bookRepo.findOne({
          where: [{ paymentReference: verification.txRef }, { reference: verification.txRef }],
        });
        if (booking) {
          payment = await payRepo.findOne({
            where: { bookingId: booking.id },
            order: { createdAt: 'DESC' },
          });
        }
      }

      if (!payment) {
        this.logger.warn(`No payment record found for verified capture event ref ${ref}`);
        event.status = ProviderEventStatus.IGNORED;
        event.error = `Payment record not found for ref ${ref}`;
        await manager.save(event);
        return;
      }

      if (payment.status === PaymentStatus.SUCCEEDED) {
        this.logger.log(`Payment ${payment.id} is already marked SUCCEEDED`);
        event.status = ProviderEventStatus.PROCESSED;
        event.processedAt = new Date();
        await manager.save(event);
        return;
      }

      const booking = await bookRepo.findOne({ where: { id: payment.bookingId } });
      if (!booking) {
        throw new NotFoundException(`Booking ${payment.bookingId} not found during capture`);
      }

      const capturedAt = new Date();
      payment.status = PaymentStatus.SUCCEEDED;
      payment.capturedAt = capturedAt;
      payment.providerPaymentId = ref;
      await payRepo.save(payment);

      const settings = await this.settingsService.getAllSettings();
      const amountMinor = BigInt(payment.amountMinor);

      // 1. Create active EscrowHold
      const releaseEligibleAt = new Date(
        Date.now() + settings.escrowReleaseDelayHours * 3600 * 1000,
      );
      const escrowHold = escrowRepo.create({
        bookingId: booking.id,
        paymentId: payment.id,
        amountMinor: payment.amountMinor,
        refundedMinor: '0',
        currency: payment.currency,
        status: EscrowHoldStatus.HELD,
        releaseEligibleAt,
      });
      await escrowRepo.save(escrowHold);

      // 2. Snaphot commission and tax rates
      const commissionRateBps = settings.commissionRateBps;
      const commissionMinor = calculateBasisPoints(
        amountMinor,
        commissionRateBps,
        settings.commissionRounding,
      );
      const hostNetMinor = amountMinor - commissionMinor;

      const commSnapshot = commRepo.create({
        bookingId: booking.id,
        rateBps: commissionRateBps,
        commissionMinor: commissionMinor.toString(),
        hostNetMinor: hostNetMinor.toString(),
        currency: payment.currency,
        ruleVersion: 'v1.0',
      });
      await commRepo.save(commSnapshot);

      if (settings.vatRateBps > 0) {
        const vatMinor = calculateBasisPoints(commissionMinor, settings.vatRateBps, 'HALF_UP');
        const taxLine = taxRepo.create({
          bookingId: booking.id,
          type: TaxType.VAT,
          rateBps: settings.vatRateBps,
          baseMinor: commissionMinor.toString(),
          amountMinor: vatMinor.toString(),
          currency: payment.currency,
          jurisdiction: settings.vatJurisdiction,
        });
        await taxRepo.save(taxLine);
      }

      // 3. Post balanced double-entry capture transaction
      await this.ledgerService.recordTransaction(
        {
          type: LedgerTransactionType.PAYMENT_CAPTURE,
          reference: `CAP-${payment.id.slice(0, 8)}`,
          idempotencyKey: `tx_capture_${payment.id}`,
          bookingId: booking.id,
          paymentId: payment.id,
          description: `Guest capture for booking ${booking.reference || booking.id}`,
          entries: [
            {
              accountCode: '1010',
              accountName: 'PROVIDER_CLEARING',
              debitMinor: amountMinor,
              creditMinor: 0n,
              currency: payment.currency,
              memo: `PSP settlement clearing (${payment.provider})`,
            },
            {
              accountCode: '2010',
              accountName: 'ESCROW_LIABILITY',
              debitMinor: 0n,
              creditMinor: amountMinor,
              currency: payment.currency,
              memo: `Funds held in custody for booking ${booking.reference || booking.id}`,
            },
          ],
        },
        manager,
      );

      // 4. Update booking payment summary
      booking.paymentStatus = BookingPaymentStatus.PAID;
      booking.paymentReference = payment.providerPaymentId || ref;
      booking.paidAt = capturedAt;
      booking.paymentReconciliationStatus = 'MATCHED';
      await bookRepo.save(booking);

      // 4b. Record coupon redemption idempotently if coupon was applied
      if (booking.couponCode) {
        try {
          const redRepo = manager.getRepository(CouponRedemption);
          const existingRedemption = await redRepo.findOne({
            where: { bookingId: booking.id },
          });
          if (!existingRedemption) {
            const coupRepo = manager.getRepository(Coupon);
            const coupon = await coupRepo.findOne({
              where: { code: booking.couponCode.trim().toUpperCase() },
            });
            if (coupon) {
              const discountMinor = Number(booking.discountAmount) > 0
                ? Math.round(Number(booking.discountAmount) * 100)
                : 0;
              const redemption = redRepo.create({
                couponId: coupon.id,
                userId: booking.guestId,
                bookingId: booking.id,
                discountAmountMinor: discountMinor,
              });
              coupon.redemptionsCount += 1;
              await Promise.all([
                redRepo.save(redemption),
                coupRepo.save(coupon),
              ]);
              this.logger.log(
                `Recorded coupon redemption for booking ${booking.id} (code: ${coupon.code}, discount: ${discountMinor} minor units)`,
              );
            }
          }
        } catch (couponRedemptionError) {
          this.logger.warn(
            `Failed to record coupon redemption during payment capture for booking ${booking.id}: ${couponRedemptionError}`,
          );
        }
      }

      // 5. Update provider event
      event.status = ProviderEventStatus.PROCESSED;
      event.processedAt = capturedAt;
      await manager.save(event);

      // 6. Record audit action
      await this.auditService.record(
        {
          action: 'finance.payment_captured',
          entityType: 'payment',
          entityId: payment.id,
          after: {
            bookingId: booking.id,
            amountMinor: payment.amountMinor,
            currency: payment.currency,
            provider: payment.provider,
            reference: ref,
          },
          metadata: {
            escrowHoldId: escrowHold.id,
            commissionMinor: commissionMinor.toString(),
          },
        },
        manager,
      );

      this.logger.log(
        `Successfully captured payment ${payment.id} for booking ${booking.id}: ${amountMinor} ${payment.currency}`,
      );
    });
  }
}
