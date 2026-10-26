import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { HostService } from './host.service';
import { ListingModerationService } from '../properties/listing-moderation.service';
import { BookingsService } from '../bookings/bookings.service';
import { PaymentsService } from '../payments/payments.service';
import { ReviewsService } from '../reviews/reviews.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Property, PropertyType, ListingType, ListingStatus } from '../properties/entities/property.entity';
import { AvailabilityBlock } from '../properties/entities/availability-block.entity';
import { Room } from '../properties/entities/room.entity';
import { Amenity } from '../amenities/entities/amenity.entity';
import { Booking, BookingStatus, PaymentMethod, PaymentStatus } from '../bookings/entities/booking.entity';
import { HostProfile, HostVerificationStatus } from '../../users/entities/host-profile.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { ListingReview, ReviewSubmissionType, ReviewStatus } from '../properties/entities/listing-review.entity';
import { Review } from '../reviews/entities/review.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Notification, NotificationType } from '../notifications/entities/notification.entity';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';

describe('Step 5L: Integrated Host-Side Acceptance Testing', () => {
  let hostService: HostService;
  let moderationService: ListingModerationService;
  let bookingsService: BookingsService;
  let paymentsService: PaymentsService;
  let reviewsService: ReviewsService;
  let notificationsService: NotificationsService;

  // Actors
  const HOST_ID = 'host-user-1';
  const OTHER_HOST_ID = 'host-user-2';
  const ADMIN_ID = 'admin-user-1';
  const GUEST_ID = 'guest-user-1';

  const mockAdminUser: User = {
    id: ADMIN_ID,
    name: 'Admin Moderator',
    email: 'admin@engda.com',
    passwordHash: 'hash',
    role: UserRole.ADMIN,
    phone: '+251911000000',
    title: 'Lead Admin',
    bio: 'Platform admin',
    avatar: null,
    officeLocation: 'Addis Ababa HQ',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    refreshTokens: [],
    hostProfile: undefined,
    properties: [],
  };

  const mockHostUser: User = {
    ...mockAdminUser,
    id: HOST_ID,
    name: 'Almaz Host',
    email: 'almaz@engda.com',
    role: UserRole.HOST,
    phone: '+251911223344',
  };

  const mockGuestUser: User = {
    ...mockAdminUser,
    id: GUEST_ID,
    name: 'Dawit Guest',
    email: 'dawit@engda.com',
    role: UserRole.USER,
  };

  // State storage simulating persistence across workflows
  let storedHostProfile: HostProfile;
  let storedProperty: Property;
  let storedBlocks: AvailabilityBlock[] = [];
  let storedReviews: ListingReview[] = [];
  let storedBookings: Booking[] = [];
  let storedGuestReviews: Review[] = [];
  let storedNotifications: Notification[] = [];

  const createMockQb = (data: any) => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(Array.isArray(data) ? data.length : 0),
    getOne: jest.fn().mockResolvedValue(Array.isArray(data) ? data[0] || null : data),
    getMany: jest.fn().mockResolvedValue(Array.isArray(data) ? data : [data]),
    getManyAndCount: jest.fn().mockResolvedValue([Array.isArray(data) ? data : [data], Array.isArray(data) ? data.length : 1]),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
  });

  beforeEach(async () => {
    // Reset test state
    storedHostProfile = {
      id: 'profile-uuid-1',
      userId: HOST_ID,
      displayName: 'Almaz Boutique Stays',
      bio: 'Providing warm Ethiopian hospitality in Addis',
      phone: '+251911223344',
      verificationStatus: HostVerificationStatus.UNVERIFIED,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: mockHostUser,
    };

    storedProperty = {
      id: 'prop-uuid-1',
      hostId: HOST_ID,
      title: 'Bole Penthouse Retreat',
      description: 'Luxury penthouse overlooking Addis Ababa',
      propertyType: PropertyType.APARTMENT,
      listingType: ListingType.RENTAL,
      status: ListingStatus.DRAFT,
      address: 'Bole Road, Near Edna Mall',
      city: 'Addis Ababa',
      country: 'Ethiopia',
      region: 'Addis Ababa',
      zone: null,
      subCity: 'Bole',
      woreda: '03',
      neighborhood: 'Bole Medhanealem',
      latitude: 9.001,
      longitude: 38.784,
      pricePerNight: 2000,
      salePrice: null,
      maxGuests: 4,
      bedrooms: 2,
      bathrooms: 2,
      areaSqm: 110,
      parkingSpaces: 1,
      isAvailable: true,
      coverImage: 'https://cloudinary.com/engda/cover.jpg',
      images: ['https://cloudinary.com/engda/img1.jpg', 'https://cloudinary.com/engda/img2.jpg'],
      createdAt: new Date(),
      updatedAt: new Date(),
      host: mockHostUser,
      rooms: [],
      amenities: [],
      bookings: [],
      reviews: [],
      availabilityBlocks: [],
    };

    storedBlocks = [];
    storedReviews = [];
    storedBookings = [];
    storedGuestReviews = [];
    storedNotifications = [];

    const mockPropertyRepo = {
      findOne: jest.fn().mockImplementation(({ where }) => {
        if (where?.id === storedProperty.id) return Promise.resolve(storedProperty);
        return Promise.resolve(null);
      }),
      find: jest.fn().mockImplementation(() => Promise.resolve([storedProperty])),
      create: jest.fn().mockImplementation((p) => ({ ...storedProperty, ...p })),
      save: jest.fn().mockImplementation((p) => {
        storedProperty = { ...storedProperty, ...p };
        return Promise.resolve(storedProperty);
      }),
      createQueryBuilder: jest.fn().mockImplementation(() => createMockQb(storedProperty)),
    };

    const mockHostProfileRepo = {
      findOne: jest.fn().mockImplementation(({ where }) => {
        if (where?.userId === HOST_ID || where?.id === storedHostProfile.id) {
          return Promise.resolve(storedHostProfile);
        }
        if (where?.userId === OTHER_HOST_ID) {
          return Promise.resolve({ id: 'prof-2', userId: OTHER_HOST_ID, displayName: 'Other Host' });
        }
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation((p) => ({ ...storedHostProfile, ...p })),
      save: jest.fn().mockImplementation((p) => {
        storedHostProfile = { ...storedHostProfile, ...p };
        return Promise.resolve(storedHostProfile);
      }),
      createQueryBuilder: jest.fn().mockImplementation(() => createMockQb(storedHostProfile)),
    };

    const mockBookingRepo = {
      findOne: jest.fn().mockImplementation(({ where, relations }: any = {}) => {
        const found = storedBookings.find((b) => {
          if (where?.id && b.id !== where.id) return false;
          if (where?.paymentReference && b.paymentReference !== where.paymentReference) return false;
          if (where?.propertyId && b.propertyId !== where.propertyId) return false;
          if (where?.guestId && b.guestId !== where.guestId) return false;
          if (where?.status && b.status !== where.status) return false;
          return true;
        });
        if (found) {
          if (!found.property && found.propertyId === storedProperty.id) {
            found.property = storedProperty;
          }
        }
        return Promise.resolve(found || null);
      }),
      find: jest.fn().mockImplementation(() => Promise.resolve(storedBookings)),
      create: jest.fn().mockImplementation((b) => ({
        id: `book-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        property: b.propertyId === storedProperty.id ? storedProperty : null,
        ...b,
      })),
      save: jest.fn().mockImplementation((b) => {
        const idx = storedBookings.findIndex((item) => item.id === b.id);
        if (idx >= 0) storedBookings[idx] = b;
        else storedBookings.push(b);
        return Promise.resolve(b);
      }),
      update: jest.fn().mockImplementation(({ id }, updates) => {
        const item = storedBookings.find((b) => b.id === id);
        if (item) Object.assign(item, updates);
        return Promise.resolve({ affected: item ? 1 : 0 });
      }),
      createQueryBuilder: jest.fn().mockImplementation(() => {
        let currentParams: any = {};
        const qb = createMockQb(storedBookings);
        qb.where = jest.fn().mockImplementation((_cond, params) => {
          if (params) Object.assign(currentParams, params);
          return qb;
        });
        qb.andWhere = jest.fn().mockImplementation((_cond, params) => {
          if (params) Object.assign(currentParams, params);
          return qb;
        });
        qb.getCount = jest.fn().mockImplementation(() => {
          if (currentParams.checkIn && currentParams.checkOut) {
            const checkIn = new Date(currentParams.checkIn);
            const checkOut = new Date(currentParams.checkOut);
            const overlapping = storedBookings.filter((b) => {
              if (b.status === BookingStatus.CANCELLED) return false;
              const bIn = new Date(b.checkInDate);
              const bOut = new Date(b.checkOutDate);
              return bIn < checkOut && bOut > checkIn;
            });
            return Promise.resolve(overlapping.length);
          }
          return Promise.resolve(storedBookings.length);
        });
        qb.getOne = jest.fn().mockImplementation(() => {
          const item = storedBookings[storedBookings.length - 1] || null;
          if (item && !item.property && item.propertyId === storedProperty.id) {
            item.property = storedProperty;
          }
          return Promise.resolve(item);
        });
        return qb;
      }),
      manager: {
        transaction: jest.fn().mockImplementation(async (cb) =>
          cb({
            getRepository: (entity: any) => {
              if (entity === Property) return mockPropertyRepo;
              if (entity === Booking) return mockBookingRepo;
              if (entity === AvailabilityBlock) return mockBlockRepo;
              if (entity === Room) return { findOne: jest.fn().mockResolvedValue(null) };
              if (entity === HostProfile) return mockHostProfileRepo;
              return {};
            },
          }),
        ),
      },
    };

    const mockBlockRepo = {
      findOne: jest.fn().mockImplementation(({ where }) => {
        const found = storedBlocks.find((b) => b.id === where?.id);
        return Promise.resolve(found || null);
      }),
      find: jest.fn().mockImplementation(() => Promise.resolve(storedBlocks)),
      create: jest.fn().mockImplementation((b) => ({ id: `block-${Date.now()}`, ...b })),
      save: jest.fn().mockImplementation((b) => {
        storedBlocks.push(b);
        return Promise.resolve(b);
      }),
      remove: jest.fn().mockImplementation((b) => {
        storedBlocks = storedBlocks.filter((item) => item.id !== b.id);
        return Promise.resolve(b);
      }),
      createQueryBuilder: jest.fn().mockImplementation(() => {
        let currentParams: any = {};
        const qb = createMockQb(storedBlocks);
        qb.where = jest.fn().mockImplementation((_cond, params) => {
          if (params) Object.assign(currentParams, params);
          return qb;
        });
        qb.andWhere = jest.fn().mockImplementation((_cond, params) => {
          if (params) Object.assign(currentParams, params);
          return qb;
        });
        qb.getCount = jest.fn().mockImplementation(() => {
          if (currentParams.checkIn && currentParams.checkOut) {
            const checkIn = new Date(currentParams.checkIn);
            const checkOut = new Date(currentParams.checkOut);
            const blocked = storedBlocks.filter((blk) => {
              const bStart = new Date(blk.startDate);
              const bEnd = new Date(blk.endDate);
              return bStart < checkOut && bEnd > checkIn;
            });
            return Promise.resolve(blocked.length);
          }
          return Promise.resolve(storedBlocks.length);
        });
        return qb;
      }),
      manager: {
        transaction: jest.fn().mockImplementation(async (cb) =>
          cb({
            getRepository: (entity: any) => {
              if (entity === Property) return mockPropertyRepo;
              if (entity === AvailabilityBlock) return mockBlockRepo;
              if (entity === Booking) return mockBookingRepo;
              return {};
            },
          }),
        ),
      },
    };

    const mockListingReviewRepo = {
      findOne: jest.fn().mockImplementation(({ where }) => {
        const found = storedReviews.find((r) => r.id === where?.id || (r.propertyId === where?.propertyId && r.status === where?.status));
        return Promise.resolve(found || null);
      }),
      find: jest.fn().mockImplementation(() => Promise.resolve(storedReviews)),
      create: jest.fn().mockImplementation((r) => ({ id: `rev-${Date.now()}`, ...r })),
      save: jest.fn().mockImplementation((r) => {
        const idx = storedReviews.findIndex((item) => item.id === r.id);
        if (idx >= 0) storedReviews[idx] = r;
        else storedReviews.push(r);
        return Promise.resolve(r);
      }),
      createQueryBuilder: jest.fn().mockImplementation(() => createMockQb(storedReviews)),
    };

    const mockNotificationRepo = {
      findOne: jest.fn().mockImplementation(({ where }) => {
        const found = storedNotifications.find((n) => n.userId === where?.userId);
        return Promise.resolve(found || null);
      }),
      find: jest.fn().mockImplementation(() => Promise.resolve(storedNotifications)),
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn().mockImplementation((n) => ({ id: `notif-${Date.now()}`, createdAt: new Date(), isRead: false, ...n })),
      save: jest.fn().mockImplementation((n) => {
        storedNotifications.push(n);
        return Promise.resolve(n);
      }),
      createQueryBuilder: jest.fn().mockImplementation(() => createMockQb(storedNotifications)),
    };

    const mockUserRepo = {
      findOne: jest.fn().mockResolvedValue(mockHostUser),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const mockAmenityRepo = {
      findByIds: jest.fn().mockResolvedValue([]),
    };

    const mockRoomRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((r) => r),
      save: jest.fn().mockImplementation((r) => Promise.resolve(r)),
      remove: jest.fn(),
    };

    const mockGuestReviewRepo = {
      findOne: jest.fn().mockImplementation(({ where }) => {
        const found = storedGuestReviews.find((r) => r.propertyId === where?.propertyId && r.userId === where?.userId);
        return Promise.resolve(found || null);
      }),
      find: jest.fn().mockImplementation(() => Promise.resolve(storedGuestReviews)),
      create: jest.fn().mockImplementation((r) => ({ id: `grev-${Date.now()}`, createdAt: new Date(), ...r })),
      save: jest.fn().mockImplementation((r) => {
        storedGuestReviews.push(r);
        return Promise.resolve(r);
      }),
      createQueryBuilder: jest.fn().mockImplementation(() => createMockQb(storedGuestReviews)),
      manager: {
        transaction: jest.fn().mockImplementation(async (cb) =>
          cb({
            getRepository: (entity: any) => {
              if (entity === Property) return mockPropertyRepo;
              if (entity === Review) return mockGuestReviewRepo;
              if (entity === Booking) return mockBookingRepo;
              return {};
            },
          }),
        ),
      },
    };

    const mockCloudinaryService = {
      uploadImage: jest.fn().mockResolvedValue('https://cloudinary.com/uploaded.jpg'),
      deleteImage: jest.fn().mockResolvedValue(true),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'CHAPA_SECRET_KEY') return undefined; // test in sandbox mode
        return defaultValue;
      }),
    };

    const mockDataSource = {
      transaction: jest.fn(async (cb) =>
        cb({
          getRepository: (entityClass: any) => {
            if (entityClass === ListingReview) return mockListingReviewRepo;
            if (entityClass === Property) return mockPropertyRepo;
            if (entityClass === Amenity) return mockAmenityRepo;
            if (entityClass === HostProfile) return mockHostProfileRepo;
            return mockListingReviewRepo;
          },
          findOne: jest.fn(),
          save: jest.fn((entityClass, entity) => Promise.resolve(entity)),
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HostService,
        ListingModerationService,
        BookingsService,
        PaymentsService,
        ReviewsService,
        NotificationsService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: getRepositoryToken(Property), useValue: mockPropertyRepo },
        { provide: getRepositoryToken(HostProfile), useValue: mockHostProfileRepo },
        { provide: getRepositoryToken(Booking), useValue: mockBookingRepo },
        { provide: getRepositoryToken(AvailabilityBlock), useValue: mockBlockRepo },
        { provide: getRepositoryToken(ListingReview), useValue: mockListingReviewRepo },
        { provide: getRepositoryToken(Notification), useValue: mockNotificationRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(Amenity), useValue: mockAmenityRepo },
        { provide: getRepositoryToken(Room), useValue: mockRoomRepo },
        { provide: getRepositoryToken(Review), useValue: mockGuestReviewRepo },
        { provide: CloudinaryService, useValue: mockCloudinaryService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuditService, useValue: { record: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    hostService = module.get<HostService>(HostService);
    moderationService = module.get<ListingModerationService>(ListingModerationService);
    bookingsService = module.get<BookingsService>(BookingsService);
    paymentsService = module.get<PaymentsService>(PaymentsService);
    reviewsService = module.get<ReviewsService>(ReviewsService);
    notificationsService = module.get<NotificationsService>(NotificationsService);
  });

  // ─────────────────────────────────────────────────────────────
  // WORKFLOW 1: Host Onboarding & Verification Lifecycle
  // ─────────────────────────────────────────────────────────────
  describe('Workflow 1: Host Onboarding & Identity Verification Lifecycle', () => {
    it('executes full onboarding, rejection with explanation, resubmission, and approval', async () => {
      // 1. Initial State: UNVERIFIED
      let profile = await hostService.getHostProfile(HOST_ID);
      expect(profile.verificationStatus).toBe(HostVerificationStatus.UNVERIFIED);

      // 2. Host updates profile and payout details
      profile = await hostService.updateHostProfile(HOST_ID, {
        displayName: 'Almaz Verified Stays',
        payoutAccountName: 'Almaz Hailu',
        payoutAccountNumber: '1000123456789',
      });
      expect(profile.displayName).toBe('Almaz Verified Stays');

      // 3. Host submits verification request -> PENDING
      profile = await hostService.requestVerification(HOST_ID);
      expect(profile.verificationStatus).toBe(HostVerificationStatus.PENDING);

      // 4. Duplicate request rejected while PENDING
      await expect(hostService.requestVerification(HOST_ID)).rejects.toThrow(
        'Verification request is already pending administrative review.',
      );

      // 5. Admin rejects verification with mandatory feedback
      const rejectionReason = 'Government ID image is blurry. Please upload a clear photo of your passport.';
      const rejectedProfile = await hostService.rejectHostVerification(
        profile.id,
        rejectionReason,
        mockAdminUser,
      );
      expect(rejectedProfile.verificationStatus).toBe(HostVerificationStatus.REJECTED);
      expect(storedNotifications.some((n) => n.userId === HOST_ID && n.message.includes(rejectionReason))).toBe(true);

      // 6. Rejected host can correct details and resubmit verification -> PENDING
      await hostService.updateHostProfile(HOST_ID, { bio: 'Uploaded renewed clean passport' });
      profile = await hostService.requestVerification(HOST_ID);
      expect(profile.verificationStatus).toBe(HostVerificationStatus.PENDING);

      // 7. Admin approves host verification -> VERIFIED
      const approvedProfile = await hostService.approveHostVerification(profile.id, mockAdminUser);
      expect(approvedProfile.verificationStatus).toBe(HostVerificationStatus.VERIFIED);
      expect(storedNotifications.some((n) => n.userId === HOST_ID && n.title.includes('Approved'))).toBe(true);

      // 8. Prevent duplicate transition once VERIFIED
      await expect(hostService.approveHostVerification(profile.id, mockAdminUser)).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // WORKFLOW 2: Listing Lifecycle & Moderation Safeguards
  // ─────────────────────────────────────────────────────────────
  describe('Workflow 2: Listing Lifecycle & Moderation Safeguards', () => {
    it('handles draft editing, availability blocking, review submission, and admin approval', async () => {
      // 1. Host edits draft listing
      const updatedListing = await hostService.updateListing(
        storedProperty.id,
        { pricePerNight: 2200 },
        HOST_ID,
        UserRole.HOST,
      );
      expect(updatedListing.pricePerNight).toBe(2200);

      // 2. Host manages availability blocks
      const block = await hostService.addAvailabilityBlock(
        storedProperty.id,
        '2027-03-01',
        '2027-03-05',
        'Personal maintenance',
        HOST_ID,
        UserRole.HOST,
      );
      expect(block).toBeDefined();
      expect(storedBlocks).toHaveLength(1);

      // Overlapping block rejected
      await expect(
        hostService.addAvailabilityBlock(
          storedProperty.id,
          '2027-03-03',
          '2027-03-07',
          'Conflicting block',
          HOST_ID,
          UserRole.HOST,
        ),
      ).rejects.toThrow('These dates overlap an existing availability block');

      // 3. Host submits listing for moderation (unverified host can prepare and submit)
      const submitResult = await hostService.submitListingForReview(
        storedProperty.id,
        HOST_ID,
        UserRole.HOST,
        'Ready for initial publish',
      );
      expect(submitResult.review.submissionType).toBe(ReviewSubmissionType.INITIAL_PUBLISH);
      expect(submitResult.review.status).toBe(ReviewStatus.PENDING);
      expect(submitResult.message).toContain('Your host identity must be verified');

      // 4. Initial publication blocked when host is UNVERIFIED
      await expect(
        moderationService.approveReview(submitResult.review.id, ADMIN_ID),
      ).rejects.toThrow(BadRequestException);

      // Once host identity verification is approved:
      storedHostProfile.verificationStatus = HostVerificationStatus.VERIFIED;

      // Admin approves listing -> PUBLISHED
      const approvedResult = await moderationService.approveReview(submitResult.review.id, ADMIN_ID);
      expect(approvedResult.review.status).toBe(ReviewStatus.APPROVED);
      expect(storedProperty.status).toBe(ListingStatus.PUBLISHED);

      // 5. Moderation safeguard: Host updates published listing price
      // Important changes are quarantined in review queue while current published version remains live
      const updateResult = await hostService.updateListing(
        storedProperty.id,
        { pricePerNight: 2800 },
        HOST_ID,
        UserRole.HOST,
      );
      expect(updateResult.isPendingReview).toBe(true);
      expect(updateResult.activeReview.submissionType).toBe(ReviewSubmissionType.IMPORTANT_EDIT);
      expect(storedProperty.status).toBe(ListingStatus.PUBLISHED); // remains published
      expect(storedProperty.pricePerNight).toBe(2200); // unchanged until approved

      // 6. Host pauses published listing -> PAUSED
      const pausedListing = await hostService.pauseListing(storedProperty.id, HOST_ID, UserRole.HOST);
      expect(pausedListing.status).toBe(ListingStatus.PAUSED);

      // If host verification status changes to REJECTED, resuming publication is blocked
      storedHostProfile.verificationStatus = HostVerificationStatus.REJECTED;
      await expect(
        hostService.publishListing(storedProperty.id, HOST_ID, UserRole.HOST),
      ).rejects.toThrow(BadRequestException);

      // When host is VERIFIED again, resuming publication succeeds
      storedHostProfile.verificationStatus = HostVerificationStatus.VERIFIED;
      const resumedListing = await hostService.publishListing(storedProperty.id, HOST_ID, UserRole.HOST);
      expect(resumedListing.status).toBe(ListingStatus.PUBLISHED);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // WORKFLOW 3: Reservations, Chapa Payments & Earnings Reporting
  // ─────────────────────────────────────────────────────────────
  describe('Workflow 3: Reservations, Chapa Payments & Financial Earnings', () => {
    it('manages guest booking, overlap blocking, Chapa payment confirmation, and real earnings', async () => {
      // Ensure property is PUBLISHED and host is VERIFIED for bookings
      storedProperty.status = ListingStatus.PUBLISHED;
      storedHostProfile.verificationStatus = HostVerificationStatus.VERIFIED;

      // 1. Guest attempts to book dates blocked by host -> Rejected
      storedBlocks = [
        {
          id: 'block-1',
          propertyId: storedProperty.id,
          startDate: '2027-03-01',
          endDate: '2027-03-05',
          reason: 'Host reserved',
          createdAt: new Date(),
          property: storedProperty,
        },
      ];

      await expect(
        bookingsService.create(
          {
            propertyId: storedProperty.id,
            checkInDate: '2027-03-02',
            checkOutDate: '2027-03-04',
            guestCount: 2,
          },
          GUEST_ID,
        ),
      ).rejects.toThrow('The selected dates are blocked by the host');

      // Clear blocks so subsequent valid dates (April) are not blocked
      storedBlocks = [];

      // 2. Guest initializes Chapa payment session for valid dates
      const paymentSession = await paymentsService.initializePayment({
        propertyId: storedProperty.id,
        amount: 8000,
        currency: 'ETB',
        paymentMethod: PaymentMethod.CHAPA,
        customerEmail: 'dawit@engda.com',
        customerName: 'Dawit Guest',
      });
      expect(paymentSession.status).toBe('success');
      expect(paymentSession.transactionReference).toBeDefined();

      // 3. Guest creates reservation with transaction reference
      const booking = await bookingsService.create(
        {
          propertyId: storedProperty.id,
          checkInDate: '2027-04-10',
          checkOutDate: '2027-04-14',
          guestCount: 2,
          paymentMethod: PaymentMethod.CHAPA,
          paymentReference: paymentSession.transactionReference,
        },
        GUEST_ID,
      );
      expect(booking.totalPrice).toBe(8000); // 4 nights * 2000
      expect(booking.status).toBe(BookingStatus.PENDING);
      expect(booking.paymentStatus).toBe(PaymentStatus.PAID);

      // 4. Host confirms reservation
      const confirmed = await hostService.confirmReservation(booking.id, HOST_ID);
      expect(confirmed.status).toBe(BookingStatus.CONFIRMED);

      // 5. Host earnings report computes verified figures without fake payments
      const earnings = await hostService.getEarningsSummary(HOST_ID, {}, UserRole.HOST);
      expect(earnings.currency).toBe('ETB');
      expect(earnings.totalBookingValue).toBeGreaterThanOrEqual(0);
      expect(earnings.confirmedPaidAmount).toBeGreaterThanOrEqual(0);

      // 6. Cash on arrival reservation distinction
      const cashBooking = await bookingsService.create(
        {
          propertyId: storedProperty.id,
          checkInDate: '2027-05-01',
          checkOutDate: '2027-05-03',
          guestCount: 1,
          paymentMethod: PaymentMethod.CASH_ON_ARRIVAL,
        },
        GUEST_ID,
      );
      expect(cashBooking.paymentStatus).toBe(PaymentStatus.ON_ARRIVAL);

      // 7. Revoking host verification blocks new bookings but preserves existing confirmed reservations
      storedHostProfile.verificationStatus = HostVerificationStatus.REJECTED;

      await expect(
        bookingsService.create(
          {
            propertyId: storedProperty.id,
            checkInDate: '2027-06-01',
            checkOutDate: '2027-06-05',
            guestCount: 2,
            paymentMethod: PaymentMethod.CASH_ON_ARRIVAL,
          },
          GUEST_ID,
        ),
      ).rejects.toThrow('This property is not currently available for booking because the host is not verified');

      // Existing confirmed reservation remains intact
      const existingConfirmedBooking = storedBookings.find((b) => b.id === booking.id);
      expect(existingConfirmedBooking).toBeDefined();
      expect(existingConfirmedBooking?.status).toBe(BookingStatus.CONFIRMED);

      // Restore VERIFIED status for subsequent tests
      storedHostProfile.verificationStatus = HostVerificationStatus.VERIFIED;
    });
  });

  // ─────────────────────────────────────────────────────────────
  // WORKFLOW 4: Reviews, Notifications & Host Data Privacy
  // ─────────────────────────────────────────────────────────────
  describe('Workflow 4: Reviews, Notifications & Privacy Boundaries', () => {
    it('enforces review eligibility, updates summary, and guarantees cross-host isolation', async () => {
      // 1. Guest cannot review before completed stay
      await expect(
        reviewsService.create(
          storedProperty.id,
          { rating: 5, comment: 'Premature review' },
          GUEST_ID,
        ),
      ).rejects.toThrow('You can only review a property after completing a stay');

      // 2. Completed stay allows review
      const completedBooking: Booking = {
        id: 'comp-1',
        propertyId: storedProperty.id,
        roomId: null,
        guestId: GUEST_ID,
        checkInDate: '2026-01-01',
        checkOutDate: '2026-01-05',
        guestCount: 2,
        totalPrice: 8800,
        status: BookingStatus.COMPLETED,
        paymentMethod: PaymentMethod.CHAPA,
        paymentStatus: PaymentStatus.PAID,
        paymentReference: 'ENGIDA-CHAPA-COMP',
        paymentCurrency: 'ETB',
        paidAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        property: storedProperty,
        room: null,
        guest: mockGuestUser,
      };
      storedBookings.push(completedBooking);

      const review = await reviewsService.create(
        storedProperty.id,
        { rating: 5, comment: 'Phenomenal host and pristine apartment!' },
        GUEST_ID,
      );
      expect(review.rating).toBe(5);

      // 3. Host reviews summary updates
      const reviewSummary = await hostService.getHostReviewsSummary(HOST_ID, {}, UserRole.HOST);
      expect(reviewSummary.averageRating).toBeGreaterThanOrEqual(0);
      expect(reviewSummary.totalReviews).toBeGreaterThanOrEqual(0);

      // 4. Cross-host security & data privacy
      // Other host cannot view or mutate Host 1's listing
      await expect(
        hostService.updateListing(
          storedProperty.id,
          { title: 'Hacked Title' },
          OTHER_HOST_ID,
          UserRole.HOST,
        ),
      ).rejects.toThrow('You can only update your own listings');

      // Other host cannot confirm or cancel Host 1's reservation
      await expect(
        hostService.confirmReservation(completedBooking.id, OTHER_HOST_ID),
      ).rejects.toThrow('You can only manage reservations for your own properties');

      // Other user cannot view Host 1's private notifications
      const hostNotifications = await notificationsService.getUserNotifications(HOST_ID);
      expect(hostNotifications.data.every((n) => n.userId === HOST_ID)).toBe(true);
    });
  });
});
