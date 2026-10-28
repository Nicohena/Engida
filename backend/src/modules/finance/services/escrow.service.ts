import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { EscrowHold, EscrowHoldStatus } from '../entities/escrow-hold.entity';
import { CommissionSnapshot } from '../entities/commission-snapshot.entity';
import { TaxLine } from '../entities/tax-line.entity';
import { Booking, BookingStatus } from '../../bookings/entities/booking.entity';
import { Case, CaseStatus } from '../../admin/cases/entities/case.entity';
import { LedgerService } from './ledger.service';
import { FinanceSettingsService } from './finance-settings.service';
import { AuditService } from '../../audit/audit.service';
import { User } from '../../../users/entities/user.entity';
import { LedgerTransactionType } from '../entities/ledger-transaction.entity';

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(EscrowHold)
    private readonly escrowRepo: Repository<EscrowHold>,
    @InjectRepository(CommissionSnapshot)
    private readonly commissionRepo: Repository<CommissionSnapshot>,
    @InjectRepository(TaxLine)
    private readonly taxRepo: Repository<TaxLine>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Case)
    private readonly caseRepo: Repository<Case>,
    private readonly ledgerService: LedgerService,
    private readonly settingsService: FinanceSettingsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Retrieves active hold for a booking.
   */
  async getHoldForBooking(bookingId: string) {
    return this.escrowRepo.findOne({
      where: { bookingId },
      relations: ['booking', 'payment'],
    });
  }

  /**
   * Freezes escrow hold due to an open dispute or safety case.
   */
  async freezeHold(
    bookingId: string,
    reason: string,
    actor?: User | null,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const hold = await this.escrowRepo.findOne({
      where: { bookingId, status: EscrowHoldStatus.HELD },
    });

    if (!hold) {
      return null;
    }

    const beforeStatus = hold.status;
    hold.status = EscrowHoldStatus.FROZEN;
    hold.frozenAt = new Date();
    hold.freezeReason = reason;
    await this.escrowRepo.save(hold);

    await this.auditService.record({
      actor,
      action: 'finance.escrow_frozen',
      entityType: 'escrow_hold',
      entityId: hold.id,
      before: { status: beforeStatus },
      after: { status: hold.status, freezeReason: reason },
      metadata: { bookingId },
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    });

    this.logger.log(`Escrow hold ${hold.id} for booking ${bookingId} FROZEN: ${reason}`);
    return hold;
  }

  /**
   * Unfreezes escrow hold after case resolution or finance review.
   */
  async unfreezeHold(
    holdId: string,
    reason: string,
    actor: User,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ) {
    const hold = await this.escrowRepo.findOne({
      where: { id: holdId },
      relations: ['booking'],
    });

    if (!hold) {
      throw new NotFoundException(`Escrow hold ${holdId} not found`);
    }

    if (hold.status !== EscrowHoldStatus.FROZEN) {
      throw new BadRequestException('Hold is not currently frozen');
    }

    // Verify there are no open dispute or safety cases still pending
    const openCases = await this.caseRepo.count({
      where: [
        { bookingId: hold.bookingId, status: CaseStatus.OPEN },
        { bookingId: hold.bookingId, status: CaseStatus.IN_PROGRESS },
        { bookingId: hold.bookingId, status: CaseStatus.WAITING_ON_REQUESTER },
        { bookingId: hold.bookingId, status: CaseStatus.WAITING_ON_INTERNAL },
      ],
    });

    if (openCases > 0) {
      throw new BadRequestException(
        `Cannot unfreeze: ${openCases} active support case(s) are still unresolved for this booking`,
      );
    }

    hold.status = EscrowHoldStatus.HELD;
    hold.frozenAt = null;
    hold.freezeReason = null;
    await this.escrowRepo.save(hold);

    await this.auditService.record({
      actor,
      action: 'finance.escrow_unfrozen',
      entityType: 'escrow_hold',
      entityId: hold.id,
      after: { status: hold.status },
      metadata: { reason },
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    });

    return hold;
  }

  /**
   * Releases an eligible escrow hold to host payable and platform commission.
   */
  async releaseHold(
    holdId: string,
    actor?: User | null,
    reason = 'Automated stay completion release',
    manager?: EntityManager,
  ) {
    const execute = async (em: EntityManager) => {
      const holdRepo = em.getRepository(EscrowHold);
      const bookRepo = em.getRepository(Booking);
      const commRepo = em.getRepository(CommissionSnapshot);

      const hold = await holdRepo.findOne({
        where: { id: holdId },
        relations: ['booking', 'booking.property'],
      });

      if (!hold) {
        throw new NotFoundException(`Escrow hold ${holdId} not found`);
      }

      if (hold.status === EscrowHoldStatus.RELEASED) {
        this.logger.log(`Escrow hold ${holdId} is already released`);
        return hold;
      }

      if (hold.status === EscrowHoldStatus.FROZEN) {
        throw new ForbiddenException(`Escrow hold ${holdId} is frozen and cannot be released: ${hold.freezeReason}`);
      }

      // Check for dispute cases
      const activeCases = await em.getRepository(Case).count({
        where: [
          { bookingId: hold.bookingId, status: CaseStatus.OPEN },
          { bookingId: hold.bookingId, status: CaseStatus.IN_PROGRESS },
          { bookingId: hold.bookingId, status: CaseStatus.WAITING_ON_REQUESTER },
          { bookingId: hold.bookingId, status: CaseStatus.WAITING_ON_INTERNAL },
        ],
      });

      if (activeCases > 0) {
        await this.freezeHold(hold.bookingId, `Dispute case pending (${activeCases} active case(s))`, actor);
        throw new ForbiddenException(`Cannot release: ${activeCases} dispute case(s) open for booking ${hold.bookingId}`);
      }

      const totalMinor = BigInt(hold.amountMinor);
      const refundedMinor = BigInt(hold.refundedMinor);
      const unrefundedMinor = totalMinor - refundedMinor;

      if (unrefundedMinor <= 0n) {
        hold.status = EscrowHoldStatus.REFUNDED;
        await holdRepo.save(hold);
        return hold;
      }

      // Read snapshot
      const comm = await commRepo.findOne({ where: { bookingId: hold.bookingId } });
      const hostId = hold.booking?.property?.hostId || (hold.booking as any)?.hostId;

      if (!comm || !hostId) {
        throw new BadRequestException(`Missing commission snapshot or host identity for booking ${hold.bookingId}`);
      }

      const commissionMinor = BigInt(comm.commissionMinor);
      const hostNetMinor = BigInt(comm.hostNetMinor);

      // Post ESCROW_RELEASE transaction
      await this.ledgerService.recordTransaction(
        {
          type: LedgerTransactionType.ESCROW_RELEASE,
          reference: `REL-${hold.id.slice(0, 8)}`,
          idempotencyKey: `tx_release_hold_${hold.id}`,
          bookingId: hold.bookingId,
          description: `Escrow release for stay ${hold.booking?.reference || hold.bookingId}`,
          createdById: actor?.id ?? null,
          entries: [
            {
              accountCode: '2010',
              accountName: 'ESCROW_LIABILITY',
              debitMinor: unrefundedMinor,
              creditMinor: 0n,
              currency: hold.currency,
              memo: `Release from escrow hold`,
            },
            {
              accountCode: `2020-HOST-${hostId.slice(0, 8)}`,
              accountName: `Host Payable (${hostId.slice(0, 8)})`,
              accountType: undefined,
              ownerId: hostId,
              ownerType: 'HOST',
              debitMinor: 0n,
              creditMinor: hostNetMinor,
              currency: hold.currency,
              memo: `Stay payout allocation to host`,
            },
            {
              accountCode: '4010',
              accountName: 'PLATFORM_COMMISSION_REVENUE',
              debitMinor: 0n,
              creditMinor: commissionMinor,
              currency: hold.currency,
              memo: `Platform commission on stay`,
            },
          ],
        },
        em,
      );

      hold.status = EscrowHoldStatus.RELEASED;
      hold.releasedAt = new Date();
      await holdRepo.save(hold);

      await this.auditService.record(
        {
          actor,
          action: 'finance.escrow_released',
          entityType: 'escrow_hold',
          entityId: hold.id,
          after: {
            status: hold.status,
            releasedAmountMinor: unrefundedMinor.toString(),
            hostNetMinor: hostNetMinor.toString(),
            commissionMinor: commissionMinor.toString(),
          },
          metadata: { reason, bookingId: hold.bookingId, hostId },
        },
        em,
      );

      this.logger.log(`Released escrow hold ${hold.id} for booking ${hold.bookingId}: net host ${hostNetMinor}`);
      return hold;
    };

    if (manager) {
      return execute(manager);
    }
    return this.dataSource.transaction(execute);
  }

  /**
   * Scans and releases all eligible holds whose delay window has elapsed and booking is COMPLETED.
   */
  async processEligibleReleases(): Promise<{ processedCount: number; errors: string[] }> {
    const settings = await this.settingsService.getAllSettings();
    if (!settings.autoReleaseEnabled) {
      this.logger.log('Automated escrow release is disabled in finance settings');
      return { processedCount: 0, errors: [] };
    }

    const now = new Date();
    const eligibleHolds = await this.escrowRepo
      .createQueryBuilder('hold')
      .innerJoinAndSelect('hold.booking', 'booking')
      .where('hold.status = :status', { status: EscrowHoldStatus.HELD })
      .andWhere('hold.release_eligible_at <= :now', { now })
      .andWhere('booking.status = :bookingStatus', { bookingStatus: BookingStatus.COMPLETED })
      .getMany();

    let processedCount = 0;
    const errors: string[] = [];

    for (const hold of eligibleHolds) {
      try {
        await this.releaseHold(hold.id, null, 'Automated scheduled release');
        processedCount += 1;
      } catch (err: any) {
        errors.push(`Hold ${hold.id} failed: ${err.message}`);
        this.logger.error(`Failed to auto-release hold ${hold.id}: ${err.message}`);
      }
    }

    return { processedCount, errors };
  }
}
