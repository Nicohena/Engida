import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { Booking, BookingStatus, PaymentMethod, PaymentStatus } from './entities/booking.entity';
import { Property, PropertyType, ListingType, ListingStatus } from '../properties/entities/property.entity';
import { Room } from '../properties/entities/room.entity';
import { AvailabilityBlock } from '../properties/entities/availability-block.entity';
import { HostProfile, HostVerificationStatus } from '../../users/entities/host-profile.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { UserRole } from '../../users/entities/user.entity';

describe('BookingsService Integration Acceptance', () => {
  let service: BookingsService;
  let mockBookingRepo: any;
  let mockPropertyRepo: any;
  let mockRoomRepo: any;
  let mockAvailabilityBlockRepo: any;
  let mockHostProfileRepo: any;
  let mockNotificationsService: any;

  const HOST_ID = 'host-uuid-1';
  const GUEST_ID = 'guest-uuid-1';
  const OTHER_USER_ID = 'other-user-uuid';
  const PROPERTY_ID = 'prop-uuid-1';
  const BOOKING_ID = 'booking-uuid-1';

  const mockProperty: Property = {
    id: PROPERTY_ID,
    hostId: HOST_ID,
    title: 'Modern Bole Apartment',
    description: 'Cozy apartment in Bole',
    propertyType: PropertyType.APARTMENT,
    listingType: ListingType.RENTAL,
    status: ListingStatus.PUBLISHED,
    address: 'Cameroon St',
    city: 'Addis Ababa',
    country: 'Ethiopia',
    region: 'Addis Ababa',
    zone: null,
    subCity: 'Bole',
    woreda: null,
    neighborhood: null,
    latitude: 9.0,
    longitude: 38.7,
    pricePerNight: 1500,
    salePrice: null,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 1,
    areaSqm: 80,
    parkingSpaces: 1,
    isAvailable: true,
    coverImage: 'cover.jpg',
    images: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    host: {} as any,
    rooms: [],
    amenities: [],
    bookings: [],
    reviews: [],
    availabilityBlocks: [],
  };

  const mockBooking: Booking = {
    id: BOOKING_ID,
    reference: 'BKG-2027-000001',
    cancellationPolicy: 'MODERATE' as Booking['cancellationPolicy'],
    propertyId: PROPERTY_ID,
    roomId: null,
    guestId: GUEST_ID,
    checkInDate: '2027-04-10',
    checkOutDate: '2027-04-15',
    guestCount: 2,
    totalPrice: 7500,
    status: BookingStatus.PENDING,
    cancelledById: null,
    cancelledByType: null,
    cancelledAt: null,
    cancellationReason: null,
    paymentMethod: PaymentMethod.CASH_ON_ARRIVAL,
    paymentStatus: PaymentStatus.ON_ARRIVAL,
    paymentReference: null,
    paymentCurrency: 'ETB',
    paidAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    property: mockProperty,
    room: null,
    guest: { id: GUEST_ID, name: 'Guest User', email: 'guest@test.com' } as any,
  };

  const createMockQb = (count = 0, entity: any = mockBooking) => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(count),
    getOne: jest.fn().mockResolvedValue(entity),
    getMany: jest.fn().mockResolvedValue([entity]),
  });

  beforeEach(async () => {
    mockBookingRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((b) => ({ id: BOOKING_ID, ...b })),
      save: jest.fn().mockImplementation((b) => Promise.resolve({ id: BOOKING_ID, ...b })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockImplementation(() => createMockQb(0, mockBooking)),
      manager: {
        transaction: jest.fn().mockImplementation(async (cb: (m: any) => Promise<any>) =>
          cb({
            getRepository: (entity: any) => {
              if (entity === Property) return mockPropertyRepo;
              if (entity === Booking) return mockBookingRepo;
              if (entity === Room) return mockRoomRepo;
              if (entity === AvailabilityBlock) return mockAvailabilityBlockRepo;
              if (entity === HostProfile) return mockHostProfileRepo;
              return {};
            },
          }),
        ),
      },
    };

    mockPropertyRepo = {
      findOne: jest.fn().mockResolvedValue(mockProperty),
    };

    mockRoomRepo = {
      findOne: jest.fn(),
    };

    mockAvailabilityBlockRepo = {
      createQueryBuilder: jest.fn().mockImplementation(() => createMockQb(0)),
    };

    mockHostProfileRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'prof-1',
        userId: HOST_ID,
        verificationStatus: HostVerificationStatus.VERIFIED,
      }),
    };

    mockNotificationsService = {
      createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getRepositoryToken(Booking), useValue: mockBookingRepo },
        { provide: getRepositoryToken(Property), useValue: mockPropertyRepo },
        { provide: getRepositoryToken(Room), useValue: mockRoomRepo },
        { provide: getRepositoryToken(AvailabilityBlock), useValue: mockAvailabilityBlockRepo },
        { provide: getRepositoryToken(HostProfile), useValue: mockHostProfileRepo },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  describe('Reservation Creation Validations', () => {
    it('rejects booking if check-in date is in the past', async () => {
      await expect(
        service.create(
          {
            propertyId: PROPERTY_ID,
            checkInDate: '2020-01-01',
            checkOutDate: '2020-01-05',
            guestCount: 2,
          },
          GUEST_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects booking if check-out date is before or equal to check-in date', async () => {
      await expect(
        service.create(
          {
            propertyId: PROPERTY_ID,
            checkInDate: '2027-05-10',
            checkOutDate: '2027-05-10',
            guestCount: 2,
          },
          GUEST_ID,
        ),
      ).rejects.toThrow('Check-out date must be after check-in date');
    });

    it('rejects booking if property is listed for SALE', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockProperty, listingType: ListingType.SALE });

      await expect(
        service.create(
          {
            propertyId: PROPERTY_ID,
            checkInDate: '2027-05-10',
            checkOutDate: '2027-05-15',
            guestCount: 2,
          },
          GUEST_ID,
        ),
      ).rejects.toThrow('This property is listed for sale, not for short-term booking');
    });

    it('rejects booking if property is not PUBLISHED (e.g. DRAFT or UNDER_REVIEW)', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockProperty, status: ListingStatus.DRAFT });

      await expect(
        service.create(
          {
            propertyId: PROPERTY_ID,
            checkInDate: '2027-05-10',
            checkOutDate: '2027-05-15',
            guestCount: 2,
          },
          GUEST_ID,
        ),
      ).rejects.toThrow('This property is not currently published for booking');
    });

    it('rejects booking if owning host verification status is UNVERIFIED', async () => {
      mockHostProfileRepo.findOne.mockResolvedValueOnce({
        id: 'prof-1',
        userId: HOST_ID,
        verificationStatus: HostVerificationStatus.UNVERIFIED,
      });

      await expect(
        service.create(
          {
            propertyId: PROPERTY_ID,
            checkInDate: '2027-05-10',
            checkOutDate: '2027-05-15',
            guestCount: 2,
          },
          GUEST_ID,
        ),
      ).rejects.toThrow('This property is not currently available for booking because the host is not verified');
    });

    it('rejects booking if owning host verification status is REJECTED (e.g. revoked)', async () => {
      mockHostProfileRepo.findOne.mockResolvedValueOnce({
        id: 'prof-1',
        userId: HOST_ID,
        verificationStatus: HostVerificationStatus.REJECTED,
      });

      await expect(
        service.create(
          {
            propertyId: PROPERTY_ID,
            checkInDate: '2027-05-10',
            checkOutDate: '2027-05-15',
            guestCount: 2,
          },
          GUEST_ID,
        ),
      ).rejects.toThrow('This property is not currently available for booking because the host is not verified');
    });

    it('rejects booking if host profile does not exist', async () => {
      mockHostProfileRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.create(
          {
            propertyId: PROPERTY_ID,
            checkInDate: '2027-05-10',
            checkOutDate: '2027-05-15',
            guestCount: 2,
          },
          GUEST_ID,
        ),
      ).rejects.toThrow('This property is not currently available for booking because the host is not verified');
    });

    it('rejects booking if host attempts to book their own property', async () => {
      await expect(
        service.create(
          {
            propertyId: PROPERTY_ID,
            checkInDate: '2027-05-10',
            checkOutDate: '2027-05-15',
            guestCount: 2,
          },
          HOST_ID, // same as property.hostId
        ),
      ).rejects.toThrow('You cannot book your own property');
    });

    it('rejects booking if requested dates overlap with an existing non-cancelled reservation', async () => {
      mockBookingRepo.createQueryBuilder = jest.fn().mockImplementation(() => createMockQb(1));

      await expect(
        service.create(
          {
            propertyId: PROPERTY_ID,
            checkInDate: '2027-05-10',
            checkOutDate: '2027-05-15',
            guestCount: 2,
          },
          GUEST_ID,
        ),
      ).rejects.toThrow('The selected dates overlap with an existing booking');
    });

    it('rejects booking if requested dates overlap with a host availability block', async () => {
      mockBookingRepo.createQueryBuilder = jest.fn().mockImplementation(() => createMockQb(0));
      mockAvailabilityBlockRepo.createQueryBuilder = jest.fn().mockImplementation(() => createMockQb(1));

      await expect(
        service.create(
          {
            propertyId: PROPERTY_ID,
            checkInDate: '2027-05-10',
            checkOutDate: '2027-05-15',
            guestCount: 2,
          },
          GUEST_ID,
        ),
      ).rejects.toThrow('The selected dates are blocked by the host');
    });

    it('creates reservation with CASH_ON_ARRIVAL and dispatches host notification', async () => {
      mockBookingRepo.createQueryBuilder = jest.fn().mockImplementation(() => createMockQb(0, mockBooking));
      mockAvailabilityBlockRepo.createQueryBuilder = jest.fn().mockImplementation(() => createMockQb(0));

      const result = await service.create(
        {
          propertyId: PROPERTY_ID,
          checkInDate: '2027-04-10',
          checkOutDate: '2027-04-15',
          guestCount: 2,
          paymentMethod: PaymentMethod.CASH_ON_ARRIVAL,
        },
        GUEST_ID,
      );

      expect(result).toBeDefined();
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: HOST_ID,
          type: NotificationType.BOOKING_REQUESTED,
        }),
      );
    });
  });

  describe('Reservation Access Control & Privacy', () => {
    it('allows guest to view their own reservation', async () => {
      mockBookingRepo.createQueryBuilder = jest.fn().mockImplementation(() => createMockQb(0, mockBooking));

      const result = await service.findOne(BOOKING_ID, GUEST_ID, UserRole.USER);
      expect(result.id).toBe(BOOKING_ID);
    });

    it('allows property host to view reservations on their listing', async () => {
      mockBookingRepo.createQueryBuilder = jest.fn().mockImplementation(() => createMockQb(0, mockBooking));

      const result = await service.findOne(BOOKING_ID, HOST_ID, UserRole.HOST);
      expect(result.id).toBe(BOOKING_ID);
    });

    it('forbids unrelated third-party users from accessing another person reservation', async () => {
      mockBookingRepo.createQueryBuilder = jest.fn().mockImplementation(() => createMockQb(0, mockBooking));

      await expect(
        service.findOne(BOOKING_ID, OTHER_USER_ID, UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Reservation Status Transitions', () => {
    it('allows host to confirm a PENDING reservation and dispatches notification', async () => {
      const pendingBooking = { ...mockBooking, status: BookingStatus.PENDING };
      mockBookingRepo.findOne.mockResolvedValue(pendingBooking);
      mockBookingRepo.createQueryBuilder = jest.fn().mockImplementation(() => createMockQb(0, pendingBooking));

      const result = await service.updateStatus(
        BOOKING_ID,
        { status: BookingStatus.CONFIRMED },
        HOST_ID,
        UserRole.HOST,
      );

      expect(mockBookingRepo.update).toHaveBeenCalledWith(
        { id: BOOKING_ID, status: BookingStatus.PENDING },
        { status: BookingStatus.CONFIRMED },
      );
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: HOST_ID,
          type: NotificationType.BOOKING_CONFIRMED,
        }),
      );
    });

    it('prevents non-host from confirming a reservation', async () => {
      const pendingBooking = { ...mockBooking, status: BookingStatus.PENDING };
      mockBookingRepo.findOne.mockResolvedValue(pendingBooking);

      await expect(
        service.updateStatus(
          BOOKING_ID,
          { status: BookingStatus.CONFIRMED },
          GUEST_ID,
          UserRole.USER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows guest or host to cancel a reservation', async () => {
      const pendingBooking = { ...mockBooking, status: BookingStatus.PENDING };
      mockBookingRepo.findOne.mockResolvedValue(pendingBooking);
      mockBookingRepo.createQueryBuilder = jest.fn().mockImplementation(() => createMockQb(0, pendingBooking));

      await service.updateStatus(
        BOOKING_ID,
        { status: BookingStatus.CANCELLED },
        GUEST_ID,
        UserRole.USER,
      );

      expect(mockBookingRepo.update).toHaveBeenCalledWith(
        { id: BOOKING_ID, status: BookingStatus.PENDING },
        expect.objectContaining({
          status: BookingStatus.CANCELLED,
          cancelledById: GUEST_ID,
          cancelledByType: 'GUEST',
          cancellationReason: 'Reservation cancelled',
        }),
      );
    });

    it('prevents completing a reservation before its check-out date', async () => {
      const confirmedFutureBooking = {
        ...mockBooking,
        status: BookingStatus.CONFIRMED,
        checkOutDate: '2099-12-31',
      };
      mockBookingRepo.findOne.mockResolvedValue(confirmedFutureBooking);

      await expect(
        service.updateStatus(
          BOOKING_ID,
          { status: BookingStatus.COMPLETED },
          HOST_ID,
          UserRole.HOST,
        ),
      ).rejects.toThrow('A reservation can only be completed on or after its check-out date');
    });

    it('prevents invalid transitions from CANCELLED to any other status', async () => {
      const cancelledBooking = { ...mockBooking, status: BookingStatus.CANCELLED };
      mockBookingRepo.findOne.mockResolvedValue(cancelledBooking);

      await expect(
        service.updateStatus(
          BOOKING_ID,
          { status: BookingStatus.CONFIRMED },
          HOST_ID,
          UserRole.HOST,
        ),
      ).rejects.toThrow('Cannot transition from "CANCELLED" to "CONFIRMED"');
    });
  });
});
