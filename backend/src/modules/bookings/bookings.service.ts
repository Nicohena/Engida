import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { Property } from '../properties/entities/property.entity';
import { Room } from '../properties/entities/room.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { UserRole } from '../../users/entities/user.entity';

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
  ) {}

  async create(createBookingDto: CreateBookingDto, guestId: string): Promise<Booking> {
    const { propertyId, roomId, checkInDate, checkOutDate } = createBookingDto;

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

    // Validate property exists and is available
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId, isAvailable: true },
    });

    if (!property) {
      throw new NotFoundException('Property not found or not available');
    }

    // Hosts cannot book their own property
    if (property.hostId === guestId) {
      throw new BadRequestException('You cannot book your own property');
    }

    // Validate room if provided
    let pricePerNight = Number(property.pricePerNight);
    if (roomId) {
      const room = await this.roomRepository.findOne({
        where: { id: roomId, propertyId, isAvailable: true },
      });
      if (!room) {
        throw new NotFoundException('Room not found or not available');
      }
      pricePerNight = Number(room.pricePerNight);
    }

    // Check for overlapping bookings
    const overlapping = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.property_id = :propertyId', { propertyId })
      .andWhere('booking.status NOT IN (:...excludedStatuses)', {
        excludedStatuses: [BookingStatus.CANCELLED],
      })
      .andWhere(
        '(booking.check_in_date < :checkOut AND booking.check_out_date > :checkIn)',
        { checkIn: checkInDate, checkOut: checkOutDate },
      )
      .andWhere(roomId ? 'booking.room_id = :roomId' : '1=1', { roomId })
      .getCount();

    if (overlapping > 0) {
      throw new BadRequestException(
        'The selected dates overlap with an existing booking',
      );
    }

    // Calculate total price
    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );
    const totalPrice = nights * pricePerNight;

    const booking = this.bookingRepository.create({
      propertyId,
      roomId: roomId || null,
      guestId,
      checkInDate,
      checkOutDate,
      totalPrice,
      status: BookingStatus.PENDING,
    });

    const saved = await this.bookingRepository.save(booking);
    this.logger.log(
      `Booking created: ${saved.id} for property ${propertyId} (${nights} nights, $${totalPrice})`,
    );

    return this.findOne(saved.id);
  }

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['property', 'room', 'guest'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID "${id}" not found`);
    }

    // Sanitize sensitive data
    if (booking.guest) {
      delete (booking.guest as any).passwordHash;
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
    return this.bookingRepository
      .createQueryBuilder('booking')
      .innerJoinAndSelect('booking.property', 'property')
      .leftJoinAndSelect('booking.room', 'room')
      .leftJoinAndSelect('booking.guest', 'guest')
      .where('property.host_id = :hostId', { hostId })
      .orderBy('booking.created_at', 'DESC')
      .getMany();
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

    booking.status = updateDto.status;
    await this.bookingRepository.save(booking);

    this.logger.log(`Booking ${id} status updated to ${updateDto.status} by user ${userId}`);
    return this.findOne(id);
  }
}
