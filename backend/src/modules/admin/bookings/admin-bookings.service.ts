import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  LessThanOrEqual,
  MoreThanOrEqual,
  Not,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { Booking, BookingStatus } from '../../bookings/entities/booking.entity';
import { BookingStatusHistory, BookingActorType } from '../../bookings/entities/booking-status-history.entity';
import {
  CancellationRequest,
  CancellationRequestStatus,
} from '../../bookings/entities/cancellation-request.entity';
import { BookingsService } from '../../bookings/bookings.service';
import { previewCancellationPolicy } from '../../bookings/cancellation-policy.service';
import { AvailabilityBlock } from '../../properties/entities/availability-block.entity';
import { Case } from '../cases/entities/case.entity';
import { AuditRequestContext, AuditService } from '../../audit/audit.service';
import { escapeCsv } from '../utils/csv';
import { User, UserRole } from '../../../users/entities/user.entity';
import {
  AdminBookingStatusDto,
  CreateAdminAvailabilityBlockDto,
  DecideCancellationDto,
  QueryAdminBookingsDto,
  QueryAvailabilityDto,
  RecordCancellationDto,
} from './dto/admin-bookings.dto';

const CSV_LIMIT = 5000;

export interface AdminBookingListResponse {
  data: Array<Record<string, unknown>>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: Record<BookingStatus, number>;
}

@Injectable()
export class AdminBookingsService {
  private readonly logger = new Logger(AdminBookingsService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(BookingStatusHistory)
    private readonly statusHistoryRepository: Repository<BookingStatusHistory>,
    @InjectRepository(CancellationRequest)
    private readonly cancellationRequestRepository: Repository<CancellationRequest>,
    @InjectRepository(AvailabilityBlock)
    private readonly availabilityBlockRepository: Repository<AvailabilityBlock>,
    @InjectRepository(Case)
    private readonly caseRepository: Repository<Case>,
    private readonly bookingsService: BookingsService,
    private readonly auditService: AuditService,
  ) {}

  async list(dto: QueryAdminBookingsDto): Promise<AdminBookingListResponse> {
    const { data, total } = await this.runListQuery(dto, false);
    const counts = await this.getStatusCounts(dto);
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 25;

    return {
      data: data.map((booking) => this.toSummary(booking)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      counts,
    };
  }

  async detail(id: string): Promise<Record<string, unknown>> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: [
        'guest',
        'property',
        'property.host',
        'room',
        'statusHistory',
        'statusHistory.actor',
        'cancellationRequests',
        'cancellationRequests.requestedBy',
        'cancellationRequests.decidedBy',
      ],
      order: {
        statusHistory: { createdAt: 'DESC' },
        cancellationRequests: { createdAt: 'DESC' },
      },
    });

    if (!booking) {
      throw new NotFoundException('Reservation not found');
    }

    const [cases, availability] = await Promise.all([
      this.caseRepository.find({
        where: { bookingId: id },
        order: { createdAt: 'DESC' },
      }),
      this.getAvailabilityForBooking(booking),
    ]);

    return {
      ...this.toSummary(booking),
      cancellationPolicy: booking.cancellationPolicy,
      payment: {
        method: booking.paymentMethod,
        status: booking.paymentStatus,
        reference: booking.paymentReference,
        currency: booking.paymentCurrency,
        paidAt: booking.paidAt,
      },
      cancellation: {
        cancelledAt: booking.cancelledAt,
        cancelledByType: booking.cancelledByType,
        reason: booking.cancellationReason,
      },
      statusHistory: (booking.statusHistory ?? []).map((entry) => ({
        id: entry.id,
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
        source: entry.source,
        reason: entry.reason,
        actor: entry.actor
          ? { id: entry.actor.id, name: entry.actor.name, email: entry.actor.email }
          : null,
        createdAt: entry.createdAt,
      })),
      cancellationRequests: (booking.cancellationRequests ?? []).map((request) =>
        this.toCancellationRequest(request),
      ),
      availability,
      cases: cases.map((supportCase) => ({
        id: supportCase.id,
        number: supportCase.number,
        subject: supportCase.subject,
        status: supportCase.status,
        priority: supportCase.priority,
        createdAt: supportCase.createdAt,
      })),
      allowedTransitions: this.allowedTransitions(booking.status),
    };
  }

  async previewCancellation(id: string) {
    const booking = await this.requireBooking(id);
    return {
      bookingId: booking.id,
      reference: booking.reference,
      checkInDate: booking.checkInDate,
      totalPrice: booking.totalPrice,
      ...previewCancellationPolicy({
        policyTier: booking.cancellationPolicy,
        checkInDate: booking.checkInDate,
        totalPrice: booking.totalPrice,
        currency: booking.paymentCurrency,
      }),
      note: 'Estimate only. No refund or payment transfer is initiated by this console.',
    };
  }

  async recordCancellation(
    id: string,
    dto: RecordCancellationDto,
    actor: User,
    context: AuditRequestContext,
  ) {
    const booking = await this.requireBooking(id);
    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      throw new BadRequestException('This reservation can no longer accept a cancellation request');
    }

    if (dto.idempotencyKey) {
      const existing = await this.cancellationRequestRepository.findOne({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return this.toCancellationRequest(existing);
    }

    const pending = await this.cancellationRequestRepository.findOne({
      where: {
        bookingId: id,
        status: CancellationRequestStatus.REQUESTED,
      },
    });
    if (pending) {
      throw new ConflictException('A cancellation request is already open for this reservation');
    }

    const preview = previewCancellationPolicy({
      policyTier: booking.cancellationPolicy,
      checkInDate: booking.checkInDate,
      totalPrice: booking.totalPrice,
      currency: booking.paymentCurrency,
    });

    const request = this.cancellationRequestRepository.create({
      bookingId: id,
      source: dto.source,
      requestedById: actor.id,
      reason: dto.reason,
      status: CancellationRequestStatus.REQUESTED,
      policyTier: preview.policyTier,
      estimatedRefundAmount: preview.refundAmount,
      currency: preview.currency,
      policyPreview: { ...preview },
      idempotencyKey: dto.idempotencyKey ?? null,
    });
    const saved = await this.cancellationRequestRepository.save(request);

    await this.auditService.record({
      actor,
      action: 'booking.cancellation_requested',
      entityType: 'booking',
      entityId: id,
      after: { cancellationRequestId: saved.id, ...preview },
      metadata: { source: dto.source, reason: dto.reason },
      ...context,
    });

    return this.toCancellationRequest(saved);
  }

  async decideCancellation(
    id: string,
    requestId: string,
    decision: 'approve' | 'reject',
    dto: DecideCancellationDto,
    actor: User,
    context: AuditRequestContext,
  ) {
    const booking = await this.requireBooking(id);
    const request = await this.cancellationRequestRepository.findOne({
      where: { id: requestId, bookingId: id },
    });
    if (!request) throw new NotFoundException('Cancellation request not found');
    if (request.status !== CancellationRequestStatus.REQUESTED) {
      throw new ConflictException('This cancellation request has already been decided');
    }

    const note = dto.note?.trim() || null;
    if (decision === 'reject' && (!note || note.length < 5)) {
      throw new BadRequestException('Explain why the cancellation request is being declined');
    }

    if (decision === 'approve') {
      if (![BookingStatus.PENDING, BookingStatus.CONFIRMED].includes(booking.status)) {
        throw new BadRequestException('Only pending or confirmed reservations can be cancelled');
      }
      await this.bookingsService.updateStatus(
        id,
        { status: BookingStatus.CANCELLED },
        actor.id,
        UserRole.ADMIN,
        {
          actor,
          reason: note || request.reason,
          source: BookingActorType.ADMIN,
        },
      );
    }

    request.status =
      decision === 'approve'
        ? CancellationRequestStatus.APPROVED
        : CancellationRequestStatus.REJECTED;
    request.decidedById = actor.id;
    request.decidedAt = new Date();
    request.decisionNote = note;
    const saved = await this.cancellationRequestRepository.save(request);

    await this.auditService.record({
      actor,
      action: `booking.cancellation_${decision}d`,
      entityType: 'booking',
      entityId: id,
      before: { status: request.status, requestId },
      after: {
        status: decision === 'approve' ? BookingStatus.CANCELLED : booking.status,
        cancellationRequestId: requestId,
      },
      metadata: { note, source: request.source },
      ...context,
    });

    this.logger.log(
      `Cancellation request ${requestId} ${decision}d for booking ${booking.reference} by ${actor.email}`,
    );
    return this.toCancellationRequest(saved);
  }

  async updateStatus(
    id: string,
    dto: AdminBookingStatusDto,
    actor: User,
    context: AuditRequestContext,
  ) {
    const before = await this.requireBooking(id);
    await this.bookingsService.updateStatus(
      id,
      { status: dto.status },
      actor.id,
      UserRole.ADMIN,
      {
        actor,
        reason: dto.reason,
        source: BookingActorType.ADMIN,
      },
    );

    await this.auditService.record({
      actor,
      action: 'booking.status_corrected',
      entityType: 'booking',
      entityId: id,
      before: { status: before.status },
      after: { status: dto.status },
      metadata: { reason: dto.reason },
      ...context,
    });

    return this.detail(id);
  }

  async createBlock(
    bookingId: string,
    dto: CreateAdminAvailabilityBlockDto,
    actor: User,
    context: AuditRequestContext,
  ) {
    const booking = await this.requireBooking(bookingId);
    if (booking.propertyId !== dto.propertyId) {
      throw new BadRequestException('The block must belong to the reservation property');
    }
    this.assertDateRange(dto.startDate, dto.endDate);

    const conflicts = await this.bookingRepository.find({
      where: {
        propertyId: dto.propertyId,
        id: Not(bookingId),
        status: Not(BookingStatus.CANCELLED),
        checkInDate: LessThanOrEqual(dto.endDate),
        checkOutDate: MoreThanOrEqual(dto.startDate),
      },
    });
    if (conflicts.length > 0) {
      throw new ConflictException(
        `The block overlaps ${conflicts.length} active reservation${conflicts.length === 1 ? '' : 's'}`,
      );
    }

    const block = this.availabilityBlockRepository.create({
      propertyId: dto.propertyId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason,
      source: 'ADMIN',
      createdById: actor.id,
    });
    const saved = await this.availabilityBlockRepository.save(block);

    await this.auditService.record({
      actor,
      action: 'availability.block_created',
      entityType: 'availability_block',
      entityId: saved.id,
      after: { ...saved },
      metadata: { bookingId },
      ...context,
    });

    return saved;
  }

  async removeBlock(
    blockId: string,
    actor: User,
    context: AuditRequestContext,
  ): Promise<{ id: string }> {
    const block = await this.availabilityBlockRepository.findOne({
      where: { id: blockId },
    });
    if (!block) throw new NotFoundException('Availability block not found');
    if (block.source !== 'ADMIN') {
      throw new ForbiddenException('Only admin-created blocks can be removed here');
    }

    await this.availabilityBlockRepository.remove(block);
    await this.auditService.record({
      actor,
      action: 'availability.block_removed',
      entityType: 'availability_block',
      entityId: blockId,
      before: { ...block },
      ...context,
    });
    return { id: blockId };
  }

  async availability(dto: QueryAvailabilityDto) {
    const blocks = await this.availabilityBlockRepository.find({
      where: {
        propertyId: dto.propertyId,
        ...(dto.from && dto.to
          ? {
              startDate: LessThanOrEqual(dto.to),
              endDate: MoreThanOrEqual(dto.from),
            }
          : {}),
      },
      order: { startDate: 'ASC' },
    });

    const bookings = await this.bookingRepository.find({
      where: {
        propertyId: dto.propertyId,
        status: Not(BookingStatus.CANCELLED),
        ...(dto.from && dto.to
          ? {
              checkInDate: LessThanOrEqual(dto.to),
              checkOutDate: MoreThanOrEqual(dto.from),
            }
          : {}),
      },
      relations: ['guest'],
      order: { checkInDate: 'ASC' },
    });

    return {
      blocks: blocks.map((block) => this.toBlock(block)),
      conflicts: bookings.map((booking) => ({
        id: booking.id,
        reference: booking.reference,
        guestName: booking.guest?.name ?? 'Guest',
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        status: booking.status,
      })),
    };
  }

  async exportCsv(
    dto: QueryAdminBookingsDto,
    actor: User,
    context: AuditRequestContext,
  ): Promise<string> {
    const { data } = await this.runListQuery(dto, true, CSV_LIMIT);
    const rows = data.map((booking) => [
      booking.reference,
      booking.guest?.name ?? '',
      booking.guest?.email ?? '',
      booking.property?.title ?? '',
      booking.property?.city ?? '',
      booking.checkInDate,
      booking.checkOutDate,
      booking.guestCount,
      booking.status,
      booking.paymentStatus,
      String(booking.totalPrice),
      booking.paymentCurrency,
      booking.createdAt?.toISOString?.() ?? '',
    ]);
    const header = [
      'Reference',
      'Guest',
      'Guest email',
      'Property',
      'City',
      'Check-in',
      'Check-out',
      'Guests',
      'Booking status',
      'Payment status',
      'Total',
      'Currency',
      'Created',
    ];

    await this.auditService.record({
      actor,
      action: 'booking.list_exported',
      entityType: 'booking',
      metadata: { rows: rows.length, filters: this.safeFilters(dto) },
      ...context,
    });

    return [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
  }

  private toSummary(booking: Booking) {
    const property = booking.property;
    return {
      id: booking.id,
      reference: booking.reference,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,
      paymentCurrency: booking.paymentCurrency,
      totalPrice: booking.totalPrice,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      guestCount: booking.guestCount,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      guest: booking.guest
        ? {
            id: booking.guest.id,
            name: booking.guest.name,
            email: booking.guest.email,
            phone: booking.guest.phone,
          }
        : null,
      host: property?.host
        ? {
            id: property.host.id,
            name: property.host.name,
            email: property.host.email,
          }
        : null,
      property: property
        ? {
            id: property.id,
            title: property.title,
            city: property.city,
            address: property.address,
            coverImage: property.coverImage,
          }
        : null,
      room: booking.room
        ? { id: booking.room.id, name: booking.room.roomNumber }
        : null,
    };
  }

  private toCancellationRequest(request: CancellationRequest) {
    return {
      id: request.id,
      bookingId: request.bookingId,
      source: request.source,
      reason: request.reason,
      status: request.status,
      policyTier: request.policyTier,
      estimatedRefundAmount: request.estimatedRefundAmount,
      currency: request.currency,
      policyPreview: request.policyPreview,
      decisionNote: request.decisionNote,
      decidedAt: request.decidedAt,
      createdAt: request.createdAt,
      requestedBy: request.requestedBy
        ? {
            id: request.requestedBy.id,
            name: request.requestedBy.name,
            email: request.requestedBy.email,
          }
        : null,
      decidedBy: request.decidedBy
        ? {
            id: request.decidedBy.id,
            name: request.decidedBy.name,
            email: request.decidedBy.email,
          }
        : null,
    };
  }

  private toBlock(block: AvailabilityBlock) {
    return {
      id: block.id,
      propertyId: block.propertyId,
      startDate: block.startDate,
      endDate: block.endDate,
      reason: block.reason,
      source: block.source,
      createdById: block.createdById,
      createdAt: block.createdAt,
    };
  }

  private async getAvailabilityForBooking(booking: Booking) {
    const [overlaps, blocks] = await Promise.all([
      this.bookingRepository.find({
        where: {
          propertyId: booking.propertyId,
          id: Not(booking.id),
          status: Not(BookingStatus.CANCELLED),
          checkInDate: LessThanOrEqual(booking.checkOutDate),
          checkOutDate: MoreThanOrEqual(booking.checkInDate),
        },
        relations: ['guest'],
        order: { checkInDate: 'ASC' },
      }),
      this.availabilityBlockRepository.find({
        where: {
          propertyId: booking.propertyId,
          startDate: LessThanOrEqual(booking.checkOutDate),
          endDate: MoreThanOrEqual(booking.checkInDate),
        },
        order: { startDate: 'ASC' },
      }),
    ]);

    return {
      overlaps: overlaps.map((entry) => ({
        id: entry.id,
        reference: entry.reference,
        guestName: entry.guest?.name ?? 'Guest',
        checkInDate: entry.checkInDate,
        checkOutDate: entry.checkOutDate,
        status: entry.status,
      })),
      blocks: blocks.map((block) => this.toBlock(block)),
    };
  }

  private allowedTransitions(status: BookingStatus): BookingStatus[] {
    return {
      [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
      [BookingStatus.CONFIRMED]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
      [BookingStatus.CANCELLED]: [],
      [BookingStatus.COMPLETED]: [],
    }[status];
  }

  private assertDateRange(startDate: string, endDate: string): void {
    if (startDate > endDate) {
      throw new BadRequestException('The block start date must be on or before the end date');
    }
    const today = new Date().toISOString().slice(0, 10);
    if (endDate < today) {
      throw new BadRequestException('Cannot create a block entirely in the past');
    }
  }

  private async requireBooking(id: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['property', 'property.host', 'guest', 'room'],
    });
    if (!booking) throw new NotFoundException('Reservation not found');
    return booking;
  }

  private async runListQuery(
    dto: QueryAdminBookingsDto,
    forExport: boolean,
    limitOverride?: number,
  ): Promise<{ data: Booking[]; total: number }> {
    const page = forExport ? 1 : dto.page ?? 1;
    const limit = limitOverride ?? (forExport ? CSV_LIMIT : dto.limit ?? 25);
    const qb = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.guest', 'guest')
      .leftJoinAndSelect('booking.property', 'property')
      .leftJoinAndSelect('property.host', 'host')
      .leftJoinAndSelect('booking.room', 'room');

    this.applyFilters(qb, dto);
    qb.orderBy('booking.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  private applyFilters(
    qb: SelectQueryBuilder<Booking>,
    dto: QueryAdminBookingsDto,
  ): void {
    if (dto.q) {
      qb.andWhere(
        '(booking.reference ILIKE :q OR booking.id::text ILIKE :q OR guest.name ILIKE :q OR guest.email ILIKE :q OR property.title ILIKE :q OR property.city ILIKE :q)',
        { q: `%${dto.q}%` },
      );
    }
    if (dto.status) qb.andWhere('booking.status = :status', { status: dto.status });
    if (dto.paymentStatus) {
      qb.andWhere('booking.paymentStatus = :paymentStatus', {
        paymentStatus: dto.paymentStatus,
      });
    }
    if (dto.city) {
      qb.andWhere('property.city ILIKE :city', { city: `%${dto.city}%` });
    }
    if (dto.from) {
      qb.andWhere('booking.checkOutDate >= :from', { from: dto.from });
    }
    if (dto.to) {
      qb.andWhere('booking.checkInDate <= :to', { to: dto.to });
    }
  }

  private async getStatusCounts(
    dto: QueryAdminBookingsDto,
  ): Promise<Record<BookingStatus, number>> {
    const qb = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('booking.guest', 'guest')
      .leftJoin('booking.property', 'property');
    this.applyFilters(qb, { ...dto, status: undefined });
    qb.select('booking.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('booking.status');

    const rows = await qb.getRawMany<{ status: BookingStatus; count: string }>();
    const counts = {
      [BookingStatus.PENDING]: 0,
      [BookingStatus.CONFIRMED]: 0,
      [BookingStatus.CANCELLED]: 0,
      [BookingStatus.COMPLETED]: 0,
    };
    for (const row of rows) {
      counts[row.status] = Number(row.count);
    }
    return counts;
  }

  private safeFilters(dto: QueryAdminBookingsDto) {
    return {
      hasSearch: Boolean(dto.q?.trim()),
      status: dto.status ?? null,
      paymentStatus: dto.paymentStatus ?? null,
      city: dto.city ?? null,
      from: dto.from ?? null,
      to: dto.to ?? null,
    };
  }
}

