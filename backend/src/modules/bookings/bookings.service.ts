import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Booking, BookingStatus, PaymentMethod, PaymentStatus } from './entities/booking.entity';
import { Property, ListingType, ListingStatus } from '../properties/entities/property.entity';
import { Room } from '../properties/entities/room.entity';
import { AvailabilityBlock } from '../properties/entities/availability-block.entity';
import { HostProfile } from '../../users/entities/host-profile.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { UserRole } from '../../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(AvailabilityBlock)
    private readonly availabilityBlockRepository: Repository<AvailabilityBlock>,
    @InjectRepository(HostProfile)
    private readonly hostProfileRepository: Repository<HostProfile>,
    @Optional()
    private readonly notificationsService?: NotificationsService,
  ) {}

  async create(createBookingDto: CreateBookingDto, guestId: string): Promise<Booking> {
    const { propertyId, roomId, checkInDate, checkOutDate } = createBookingDto;
    const guestCount = createBookingDto.guestCount ?? 1;

    // Validate dates
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkIn < today) {
      throw new BadRequestException('Check-in date cannot be in the past');
    }

    if (checkOut <= checkIn) {
      throw new BadRequestException('Check-out date must be after check-in date');
    }

    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Booking creation and host date blocks share a lock on the property row.
    // The lock keeps overlap checks and writes in one serialized transaction.
    const { id, totalPrice, hostId, propertyTitle } =
      await this.bookingRepository.manager.transaction(async (manager) => {
      const propertyRepository = manager.getRepository(Property);
      const bookingRepository = manager.getRepository(Booking);
      const roomRepository = manager.getRepository(Room);
      const availabilityBlockRepository = manager.getRepository(AvailabilityBlock);

      const property = await propertyRepository.findOne({
        where: { id: propertyId, isAvailable: true },
        lock: { mode: 'pessimistic_write' },
      });

      if (!property) {
        throw new NotFoundException('Property not found or not available');
      }
      if (property.listingType === ListingType.SALE) {
        throw new BadRequestException('This property is listed for sale, not for short-term booking');
      }
      if (property.status !== ListingStatus.PUBLISHED) {
        throw new BadRequestException('This property is not currently published for booking');
      }
      if (property.adminHidden) {
        throw new BadRequestException('This property is temporarily unavailable for booking');
      }
      if (!roomId && guestCount > property.maxGuests) {
        throw new BadRequestException(`This property allows up to ${property.maxGuests} guests`);
      }
      if (property.hostId === guestId) {
        throw new BadRequestException('You cannot book your own property');
      }

      let pricePerNight = Number(property.pricePerNight);
      if (roomId) {
        const room = await roomRepository.findOne({
          where: { id: roomId, propertyId, isAvailable: true },
        });
        if (!room) throw new NotFoundException('Room not found or not available');
        if (guestCount > room.capacity) {
          throw new BadRequestException(`This room allows up to ${room.capacity} guests`);
        }
        pricePerNight = Number(room.pricePerNight);
      }

      const overlapping = await bookingRepository
        .createQueryBuilder('booking')
        .where('booking.property_id = :propertyId', { propertyId })
        .andWhere('booking.status NOT IN (:...excludedStatuses)', {
          excludedStatuses: [BookingStatus.CANCELLED],
        })
        .andWhere('(booking.check_in_date < :checkOut AND booking.check_out_date > :checkIn)', {
          checkIn: checkInDate,
          checkOut: checkOutDate,
        })
        .andWhere(
          roomId ? '(booking.room_id IS NULL OR booking.room_id = :roomId)' : '1=1',
          { roomId },
        )
        .getCount();

      if (overlapping > 0) {
        throw new BadRequestException('The selected dates overlap with an existing booking');
      }

      const blocked = await availabilityBlockRepository
        .createQueryBuilder('block')
        .where('block.property_id = :propertyId', { propertyId })
        .andWhere('(block.start_date < :checkOut AND block.end_date > :checkIn)', {
          checkIn: checkInDate,
          checkOut: checkOutDate,
        })
        .getCount();

      if (blocked > 0) {
        throw new BadRequestException('The selected dates are blocked by the host and not available for booking');
      }

      const totalPrice = nights * pricePerNight;
      const method = createBookingDto.paymentMethod || PaymentMethod.CASH_ON_ARRIVAL;
      const isOnlinePaid =
        [
          PaymentMethod.CHAPA,
          PaymentMethod.TELEBIRR,
          PaymentMethod.CBE_BIRR,
          PaymentMethod.INTERNATIONAL_CARD,
          PaymentMethod.PAYPAL,
          PaymentMethod.WISE,
        ].includes(method) && Boolean(createBookingDto.paymentReference);

      const paymentStatus = isOnlinePaid
        ? PaymentStatus.PAID
        : method === PaymentMethod.CASH_ON_ARRIVAL
        ? PaymentStatus.ON_ARRIVAL
        : PaymentStatus.PENDING;

      const booking = bookingRepository.create({
        propertyId,
        roomId: roomId || null,
        guestId,
        checkInDate,
        checkOutDate,
        guestCount,
        totalPrice,
        status: BookingStatus.PENDING,
        paymentMethod: method,
        paymentStatus,
        paymentReference: createBookingDto.paymentReference || null,
        paymentCurrency: createBookingDto.paymentCurrency || 'ETB',
        paidAt: isOnlinePaid ? new Date() : null,
      });
      const saved = await bookingRepository.save(booking);
      return {
        id: saved.id,
        totalPrice,
        hostId: property.hostId,
        propertyTitle: property.title,
      };
    });

    this.logger.log(
      `Booking created: ${id} for property ${propertyId} (${nights} nights, ETB ${totalPrice})`,
    );

    if (this.notificationsService) {
      try {
        await this.notificationsService.createNotification({
          userId: hostId,
          type: NotificationType.BOOKING_REQUESTED,
          title: 'New Reservation Request',
          message: `You received a new reservation request for "${propertyTitle}" (${nights} ${nights === 1 ? 'night' : 'nights'}).`,
          link: '/host/reservations',
          metadata: { bookingId: id, propertyId },
          idempotencyKey: `booking_${id}_REQUESTED`,
        });
      } catch (notifErr: unknown) {
        this.logger.warn(`Failed to dispatch booking notification: ${notifErr}`);
      }
    }

    return this.findOne(id, guestId);
  }

  async findOne(
    id: string,
    requesterId: string,
    requesterRole: UserRole = UserRole.USER,
  ): Promise<Booking> {
    const booking = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.property', 'property')
      .leftJoinAndSelect('booking.room', 'room')
      .leftJoin('booking.guest', 'guest')
      .addSelect(['guest.id', 'guest.name', 'guest.email'])
      .where('booking.id = :id', { id })
      .getOne();

    if (!booking) {
      throw new NotFoundException(`Booking with ID "${id}" not found`);
    }

    if (booking.guestId !== requesterId && booking.property.hostId !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only view reservations for your own stay or property');
    }

    return booking;
  }

  async findMyBookings(guestId: string): Promise<Booking[]> {
    return this.bookingRepository.find({
      where: { guestId },
      relations: ['property', 'room'],
      order: { createdAt: 'DESC' },
    });
  }

  async findHostReservations(hostId: string): Promise<Booking[]> {
    const profile = await this.hostProfileRepository.findOne({ where: { userId: hostId } });
    if (!profile) throw new ForbiddenException('Create a host profile before viewing host reservations');

    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .innerJoinAndSelect('booking.property', 'property')
      .leftJoinAndSelect('booking.room', 'room')
      .leftJoin('booking.guest', 'guest')
      .addSelect(['guest.id', 'guest.name'])
      .where('property.host_id = :hostId', { hostId })
      .orderBy('booking.created_at', 'DESC')
      .getMany();
    return bookings;
  }

  async updateStatus(
    id: string,
    updateDto: UpdateBookingStatusDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['property'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID "${id}" not found`);
    }

    const isHost = booking.property.hostId === userId;
    const isGuest = booking.guestId === userId;
    const isAdmin = userRole === UserRole.ADMIN;

    // Authorization rules
    if (updateDto.status === BookingStatus.CONFIRMED) {
      if (!isHost && !isAdmin) {
        throw new ForbiddenException('Only the property host can confirm bookings');
      }
    } else if (updateDto.status === BookingStatus.CANCELLED) {
      if (!isHost && !isGuest && !isAdmin) {
        throw new ForbiddenException('Only the host or guest can cancel a booking');
      }
    } else if (updateDto.status === BookingStatus.COMPLETED) {
      if (!isHost && !isAdmin) {
        throw new ForbiddenException('Only the property host can mark a booking as completed');
      }
    }

    // Validate status transitions
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
      [BookingStatus.CONFIRMED]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
      [BookingStatus.CANCELLED]: [],
      [BookingStatus.COMPLETED]: [],
    };

    if (!validTransitions[booking.status]?.includes(updateDto.status)) {
      throw new BadRequestException(
        `Cannot transition from "${booking.status}" to "${updateDto.status}"`,
      );
    }

    if (updateDto.status === BookingStatus.COMPLETED) {
      const today = new Date().toISOString().slice(0, 10);
      if (booking.checkOutDate > today) {
        throw new BadRequestException('A reservation can only be completed on or after its check-out date');
      }
    }

    const updateResult = await this.bookingRepository.update(
      { id, status: booking.status },
      { status: updateDto.status },
    );
    if (updateResult.affected !== 1) {
      throw new ConflictException('This reservation changed while you were acting. Reload it and try again.');
    }

    if (this.notificationsService && booking.property?.hostId) {
      try {
        const propTitle = booking.property?.title || 'your property';
        if (updateDto.status === BookingStatus.CANCELLED) {
          await this.notificationsService.createNotification({
            userId: booking.property.hostId,
            type: NotificationType.BOOKING_CANCELLED,
            title: 'Reservation Cancelled',
            message: `Reservation #${booking.id.slice(0, 8)} for "${propTitle}" has been cancelled.`,
            link: '/host/reservations',
            metadata: { bookingId: id, propertyId: booking.property.id },
            idempotencyKey: `booking_${id}_CANCELLED`,
          });
        } else if (updateDto.status === BookingStatus.CONFIRMED) {
          await this.notificationsService.createNotification({
            userId: booking.property.hostId,
            type: NotificationType.BOOKING_CONFIRMED,
            title: 'Reservation Confirmed',
            message: `Reservation #${booking.id.slice(0, 8)} for "${propTitle}" has been confirmed.`,
            link: '/host/reservations',
            metadata: { bookingId: id, propertyId: booking.property.id },
            idempotencyKey: `booking_${id}_CONFIRMED`,
          });
        }
      } catch (notifErr: unknown) {
        this.logger.warn(`Failed to dispatch booking status notification: ${notifErr}`);
      }
    }

    this.logger.log(`Booking ${id} status updated to ${updateDto.status} by user ${userId}`);
    return this.findOne(id, userId, userRole);
  }
}
