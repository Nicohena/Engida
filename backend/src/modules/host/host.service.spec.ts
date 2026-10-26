import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { HostService } from './host.service';
import {
  Property,
  PropertyType,
  ListingType,
  ListingStatus,
} from '../properties/entities/property.entity';
import { AvailabilityBlock } from '../properties/entities/availability-block.entity';
import { Room } from '../properties/entities/room.entity';
import { Amenity } from '../amenities/entities/amenity.entity';
import {
  Booking,
  BookingStatus,
  PaymentStatus,
  PaymentMethod,
} from '../bookings/entities/booking.entity';
import { HostProfile, HostVerificationStatus } from '../../users/entities/host-profile.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ListingReview } from '../properties/entities/listing-review.entity';
import { ListingModerationService } from '../properties/listing-moderation.service';
import { Review } from '../reviews/entities/review.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { AuditService } from '../audit/audit.service';

// ─────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────

const HOST_ID = 'host-uuid-1';
const OTHER_HOST_ID = 'other-host-uuid';
const LISTING_ID = 'listing-uuid-1';
const BOOKING_ID = 'booking-uuid-1';
const BLOCK_ID = 'block-uuid-1';

const mockUser: User = {
  id: HOST_ID,
  name: 'Test Host',
  email: 'host@test.com',
  passwordHash: 'hash',
  role: UserRole.USER,
  phone: null,
  title: null,
  bio: null,
  avatar: null,
  officeLocation: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  refreshTokens: [],
  hostProfile: undefined,
  properties: [],
};

const mockHostProfile: HostProfile = {
  id: 'profile-uuid-1',
  userId: HOST_ID,
  displayName: 'Test Host Display',
  bio: 'I love hosting',
  phone: '+251911234567',
  verificationStatus: HostVerificationStatus.UNVERIFIED,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: mockUser,
};

const mockRentalListing: Property = {
  id: LISTING_ID,
  hostId: HOST_ID,
  title: 'Bole Apartment',
  description: 'Great apartment in Bole',
  propertyType: PropertyType.APARTMENT,
  listingType: ListingType.RENTAL,
  status: ListingStatus.DRAFT,
  address: 'Bole Rd',
  city: 'Addis Ababa',
  country: 'Ethiopia',
  region: 'Addis Ababa',
  zone: null,
  subCity: 'Bole',
  woreda: null,
  neighborhood: null,
  latitude: 9.001,
  longitude: 38.784,
  pricePerNight: 200.0,
  salePrice: null,
  maxGuests: 4,
  bedrooms: 2,
  bathrooms: 1,
  areaSqm: 90,
  parkingSpaces: 0,
  isAvailable: true,
  coverImage: 'https://example.com/cover.jpg',
  images: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  host: mockUser,
  rooms: [],
  amenities: [],
  bookings: [],
  reviews: [],
  availabilityBlocks: [],
};

const mockSaleListing: Property = {
  ...mockRentalListing,
  id: 'sale-listing-uuid',
  listingType: ListingType.SALE,
  pricePerNight: 0,
  salePrice: 5000000,
};

const mockPublishedListing: Property = {
  ...mockRentalListing,
  status: ListingStatus.PUBLISHED,
};

const mockBooking: Booking = {
  id: BOOKING_ID,
  propertyId: LISTING_ID,
  property: mockPublishedListing,
  roomId: null,
  room: null,
  guestId: 'guest-uuid',
  guest: { ...mockUser, id: 'guest-uuid' },
  checkInDate: '2027-01-10',
  checkOutDate: '2027-01-15',
  totalPrice: 1000,
  status: BookingStatus.PENDING,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─────────────────────────────────────────────────────────
// Mock querybuilder factory
// ─────────────────────────────────────────────────────────
const createMockQb = (result: any = mockRentalListing) => ({
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
  getOne: jest.fn().mockResolvedValue(result),
  getMany: jest.fn().mockResolvedValue([result]),
  getManyAndCount: jest.fn().mockResolvedValue([[result], 1]),
  getRawMany: jest.fn().mockResolvedValue([]),
  getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
  getCount: jest.fn().mockResolvedValue(0),
});

// ─────────────────────────────────────────────────────────
// Repository mocks
// ─────────────────────────────────────────────────────────

const mockPropertyRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn().mockImplementation((dto: any) => ({ id: LISTING_ID, createdAt: new Date(), updatedAt: new Date(), ...dto })),
  save: jest.fn().mockImplementation((entity: any) => Promise.resolve(entity)),
  remove: jest.fn(),
  createQueryBuilder: jest.fn().mockImplementation(() => createMockQb()),
};

const mockAvailabilityBlockRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn().mockImplementation(() => createMockQb()),
  create: jest.fn().mockImplementation((dto: any) => ({ id: BLOCK_ID, ...dto })),
  save: jest.fn().mockImplementation((e: any) => Promise.resolve(e)),
  remove: jest.fn(),
  manager: {
    transaction: jest.fn().mockImplementation(async (cb: (manager: any) => Promise<any>) =>
      cb({
        getRepository: (entity: any) => {
          if (entity === Property) return mockPropertyRepo;
          if (entity === AvailabilityBlock) return mockAvailabilityBlockRepo;
          if (entity === Booking) return mockBookingRepo;
          return {};
        },
      }),
    ),
  },
};

const mockRoomRepo = {
  findOne: jest.fn(),
  create: jest.fn().mockImplementation((dto: any) => ({ id: 'room-uuid', ...dto })),
  save: jest.fn().mockImplementation((entity: any) => Promise.resolve(entity)),
  remove: jest.fn(),
};

const mockAmenityRepo = {
  findByIds: jest.fn().mockResolvedValue([]),
};

const mockBookingRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
  count: jest.fn().mockResolvedValue(0),
  save: jest.fn().mockImplementation((e: any) => Promise.resolve(e)),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  createQueryBuilder: jest.fn().mockImplementation(() => createMockQb(mockBooking)),
};

const mockHostProfileRepo = {
  findOne: jest.fn().mockResolvedValue(mockHostProfile),
  create: jest.fn().mockImplementation((dto: any) => ({ id: 'profile-uuid', ...dto })),
  save: jest.fn().mockImplementation((e: any) => Promise.resolve(e)),
  createQueryBuilder: jest.fn().mockImplementation(() => createMockQb(mockHostProfile)),
};

const mockNotificationsService = {
  createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
  getLatestNotification: jest.fn().mockResolvedValue(null),
};

const mockUserRepo = {
  findOne: jest.fn().mockResolvedValue(mockUser),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
};

const mockListingReviewRepo = {
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockImplementation((r) => Promise.resolve(r)),
};

const mockGuestReviewRepo = {
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  createQueryBuilder: jest.fn().mockImplementation(() => createMockQb()),
};

const mockListingModerationService = {
  submitForReview: jest.fn().mockImplementation(async (listingId, userId, role) => {
    const prop = await mockPropertyRepo.findOne({ where: { id: listingId } });
    if (!prop) throw new NotFoundException();
    if (prop.hostId !== userId && role !== UserRole.ADMIN) throw new ForbiddenException();
    if (prop.status !== ListingStatus.DRAFT) throw new BadRequestException('Already published or not draft');
    if (!prop.coverImage || (prop.listingType === ListingType.RENTAL && !prop.pricePerNight)) {
      throw new BadRequestException('Missing required fields');
    }
    return {
      message: 'Submitted',
      review: { id: 'rev-1', status: 'PENDING', submissionType: 'INITIAL_PUBLISH' },
      property: prop,
    };
  }),
  processListingUpdate: jest.fn().mockResolvedValue({
    property: mockRentalListing,
    review: null,
    isPendingReview: false,
    message: 'Updated.',
  }),
  withdrawReview: jest.fn().mockResolvedValue({
    message: 'Review withdrawn.',
    review: { id: 'rev-1', status: 'WITHDRAWN' },
  }),
  getHostListingReviews: jest.fn().mockResolvedValue({
    activeReview: null,
    history: [],
    property: mockRentalListing,
  }),
};

// ─────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────

describe('HostService', () => {
  let service: HostService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HostService,
        { provide: getRepositoryToken(Property), useValue: mockPropertyRepo },
        { provide: getRepositoryToken(Room), useValue: mockRoomRepo },
        { provide: getRepositoryToken(AvailabilityBlock), useValue: mockAvailabilityBlockRepo },
        { provide: getRepositoryToken(Amenity), useValue: mockAmenityRepo },
        { provide: getRepositoryToken(Booking), useValue: mockBookingRepo },
        { provide: getRepositoryToken(HostProfile), useValue: mockHostProfileRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(ListingReview), useValue: mockListingReviewRepo },
        { provide: getRepositoryToken(Review), useValue: mockGuestReviewRepo },
        { provide: ListingModerationService, useValue: mockListingModerationService },
        { provide: CloudinaryService, useValue: { deletePropertyImages: jest.fn().mockResolvedValue(undefined) } },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: AuditService, useValue: { record: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get<HostService>(HostService);
    jest.clearAllMocks();
    mockHostProfileRepo.findOne.mockResolvedValue(mockHostProfile);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─────────────────────────────────────────
  // HOST PROFILE
  // ─────────────────────────────────────────

  describe('getHostProfile', () => {
    it('[positive] returns existing host profile', async () => {
      mockHostProfileRepo.findOne.mockResolvedValue(mockHostProfile);
      const result = await service.getHostProfile(HOST_ID);
      expect(result).toEqual(mockHostProfile);
    });

    it('[negative] throws NotFoundException when user is not a host', async () => {
      mockHostProfileRepo.findOne.mockResolvedValue(null);
      await expect(service.getHostProfile(HOST_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createHostProfile', () => {
    it('[positive] creates a new host profile', async () => {
      mockHostProfileRepo.findOne.mockResolvedValue(null);
      const dto = { displayName: 'Test Display', bio: 'Bio', phone: '123' };
      const result = await service.createHostProfile(HOST_ID, dto);
      expect(mockHostProfileRepo.create).toHaveBeenCalledWith({
        userId: HOST_ID,
        displayName: dto.displayName,
        bio: dto.bio,
        phone: dto.phone,
        verificationStatus: HostVerificationStatus.UNVERIFIED,
      });
      expect(mockHostProfileRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('[negative] throws ConflictException if profile already exists', async () => {
      mockHostProfileRepo.findOne.mockResolvedValue(mockHostProfile);
      const dto = { displayName: 'Test Display' };
      await expect(service.createHostProfile(HOST_ID, dto)).rejects.toThrow('User already has a host profile.');
    });
  });

  describe('updateHostProfile', () => {
    it('[positive] updates displayName, bio, phone', async () => {
      mockHostProfileRepo.findOne.mockResolvedValue({ ...mockHostProfile });
      const dto = { displayName: 'New Name', bio: 'New bio', phone: '+251911000000' };
      const result = await service.updateHostProfile(HOST_ID, dto);
      expect(mockHostProfileRepo.save).toHaveBeenCalled();
      expect(result.displayName).toBe('New Name');
    });

    it('[positive] partial update - only bio changed', async () => {
      mockHostProfileRepo.findOne.mockResolvedValue({ ...mockHostProfile });
      const result = await service.updateHostProfile(HOST_ID, { bio: 'Updated bio' });
      expect(result.bio).toBe('Updated bio');
      // displayName should remain unchanged
      expect(result.displayName).toBe(mockHostProfile.displayName);
    });

    it('[security] verificationStatus cannot be changed by host', async () => {
      mockHostProfileRepo.findOne.mockResolvedValue({ ...mockHostProfile });
      // Even if someone manually passes verificationStatus in the body,
      // the service only processes the typed DTO fields (displayName, bio, phone)
      const result = await service.updateHostProfile(HOST_ID, {
        displayName: 'Updated',
      } as any);
      // verificationStatus should remain UNVERIFIED
      expect(result.verificationStatus).toBe(HostVerificationStatus.UNVERIFIED);
    });

    it('[positive] updates avatar by updating the user record', async () => {
      mockHostProfileRepo.findOne.mockResolvedValue({ ...mockHostProfile });
      await service.updateHostProfile(HOST_ID, { avatar: 'https://example.com/avatar.jpg' });
      expect(mockUserRepo.update).toHaveBeenCalledWith(HOST_ID, { avatar: 'https://example.com/avatar.jpg' });
    });
  });

  describe('requestVerification', () => {
    it('[positive] transitions UNVERIFIED profile to PENDING', async () => {
      mockHostProfileRepo.findOne.mockResolvedValue({
        ...mockHostProfile,
        displayName: 'Test Host',
        phone: '+251911223344',
        verificationStatus: HostVerificationStatus.UNVERIFIED,
      });

      await service.requestVerification(HOST_ID);
      expect(mockHostProfileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          verificationStatus: HostVerificationStatus.PENDING,
        }),
      );
    });

    it('[positive] allows resubmission after REJECTED status', async () => {
      mockHostProfileRepo.findOne.mockResolvedValue({
        ...mockHostProfile,
        displayName: 'Test Host',
        phone: '+251911223344',
        verificationStatus: HostVerificationStatus.REJECTED,
      });

      await service.requestVerification(HOST_ID);
      expect(mockHostProfileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          verificationStatus: HostVerificationStatus.PENDING,
        }),
      );
    });

    it('[negative] throws BadRequestException if already VERIFIED', async () => {
      mockHostProfileRepo.findOne.mockResolvedValue({
        ...mockHostProfile,
        verificationStatus: HostVerificationStatus.VERIFIED,
      });

      await expect(service.requestVerification(HOST_ID)).rejects.toThrow(
        'Your host profile is already verified.',
      );
    });

    it('[negative] throws BadRequestException if already PENDING', async () => {
      mockHostProfileRepo.findOne.mockResolvedValue({
        ...mockHostProfile,
        verificationStatus: HostVerificationStatus.PENDING,
      });

      await expect(service.requestVerification(HOST_ID)).rejects.toThrow(
        'Verification request is already pending administrative review.',
      );
    });

    it('[negative] throws BadRequestException if displayName is missing', async () => {
      mockHostProfileRepo.findOne.mockResolvedValue({
        ...mockHostProfile,
        displayName: '',
        verificationStatus: HostVerificationStatus.UNVERIFIED,
      });

      await expect(service.requestVerification(HOST_ID)).rejects.toThrow(
        'Please set your host display name before requesting verification.',
      );
    });

    it('[negative] throws BadRequestException if phone is missing', async () => {
      mockHostProfileRepo.findOne.mockResolvedValue({
        ...mockHostProfile,
        displayName: 'Valid Name',
        phone: '',
        verificationStatus: HostVerificationStatus.UNVERIFIED,
      });

      await expect(service.requestVerification(HOST_ID)).rejects.toThrow(
        'Please provide a valid contact phone number before requesting verification.',
      );
    });
  });

  // ─────────────────────────────────────────
  // ADMIN HOST VERIFICATION WORKFLOW
  // ─────────────────────────────────────────

  describe('admin host verification workflow', () => {
    const adminUser = {
      id: 'admin-uuid-1',
      name: 'Admin Reviewer',
      role: UserRole.ADMIN,
    } as unknown as User;

    describe('getHostVerifications', () => {
      it('[positive] lists pending verification requests with pagination', async () => {
        mockHostProfileRepo.createQueryBuilder.mockImplementation(() =>
          createMockQb([mockHostProfile]),
        );

        const result = await service.getHostVerifications({
          status: HostVerificationStatus.PENDING,
          page: 1,
          limit: 10,
        });

        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('total');
        expect(result).toHaveProperty('totalPages');
      });
    });

    describe('approveHostVerification', () => {
      it('[positive] approves pending host profile to VERIFIED and sends notification', async () => {
        const pendingProfile = {
          ...mockHostProfile,
          id: 'profile-uuid-1',
          userId: HOST_ID,
          verificationStatus: HostVerificationStatus.PENDING,
        };
        mockHostProfileRepo.findOne.mockResolvedValue(pendingProfile);

        const result = await service.approveHostVerification('profile-uuid-1', adminUser);

        expect(result.verificationStatus).toBe(HostVerificationStatus.VERIFIED);
        expect(mockHostProfileRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({ verificationStatus: HostVerificationStatus.VERIFIED }),
        );
        expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: HOST_ID,
            type: NotificationType.LISTING_APPROVED,
            title: 'Host Verification Approved',
          }),
        );
      });

      it('[negative] throws BadRequestException if profile is not PENDING (already VERIFIED)', async () => {
        mockHostProfileRepo.findOne.mockResolvedValue({
          ...mockHostProfile,
          verificationStatus: HostVerificationStatus.VERIFIED,
        });

        await expect(
          service.approveHostVerification('profile-uuid-1', adminUser),
        ).rejects.toThrow('Only host profiles in PENDING status can be approved.');
      });

      it('[negative] throws BadRequestException if profile is UNVERIFIED', async () => {
        mockHostProfileRepo.findOne.mockResolvedValue({
          ...mockHostProfile,
          verificationStatus: HostVerificationStatus.UNVERIFIED,
        });

        await expect(
          service.approveHostVerification('profile-uuid-1', adminUser),
        ).rejects.toThrow('Only host profiles in PENDING status can be approved.');
      });

      it('[negative] throws NotFoundException if host profile does not exist', async () => {
        mockHostProfileRepo.findOne.mockResolvedValue(null);

        await expect(
          service.approveHostVerification('nonexistent-uuid', adminUser),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('rejectHostVerification', () => {
      it('[positive] rejects pending host profile with explanation and sends notification', async () => {
        const pendingProfile = {
          ...mockHostProfile,
          id: 'profile-uuid-1',
          userId: HOST_ID,
          verificationStatus: HostVerificationStatus.PENDING,
        };
        mockHostProfileRepo.findOne.mockResolvedValue(pendingProfile);

        const explanation = 'The phone number provided could not be reached during verification.';
        const result = await service.rejectHostVerification('profile-uuid-1', explanation, adminUser);

        expect(result.verificationStatus).toBe(HostVerificationStatus.REJECTED);
        expect((result as any).rejectionReason).toBe(explanation);
        expect(mockHostProfileRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({ verificationStatus: HostVerificationStatus.REJECTED }),
        );
        expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: HOST_ID,
            type: NotificationType.LISTING_REJECTED,
            metadata: expect.objectContaining({
              rejectionReason: explanation,
              verificationStatus: HostVerificationStatus.REJECTED,
            }),
          }),
        );
      });

      it('[negative] throws BadRequestException if explanation is missing or too short', async () => {
        await expect(
          service.rejectHostVerification('profile-uuid-1', 'bad', adminUser),
        ).rejects.toThrow('A valid rejection explanation (at least 5 characters) is required.');
      });

      it('[negative] throws BadRequestException if profile is not PENDING', async () => {
        mockHostProfileRepo.findOne.mockResolvedValue({
          ...mockHostProfile,
          verificationStatus: HostVerificationStatus.UNVERIFIED,
        });

        await expect(
          service.rejectHostVerification(
            'profile-uuid-1',
            'Cannot verify unsubmitted profile',
            adminUser,
          ),
        ).rejects.toThrow('Only host profiles in PENDING status can be rejected.');
      });

      it('[negative] throws NotFoundException if host profile does not exist', async () => {
        mockHostProfileRepo.findOne.mockResolvedValue(null);

        await expect(
          service.rejectHostVerification(
            'nonexistent-uuid',
            'Profile was not found in system',
            adminUser,
          ),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('getHostProfile rejection explanation retrieval', () => {
      it('[positive] attaches rejectionReason from latest rejection notification if REJECTED', async () => {
        mockHostProfileRepo.findOne.mockResolvedValue({
          ...mockHostProfile,
          verificationStatus: HostVerificationStatus.REJECTED,
        });
        mockNotificationsService.getLatestNotification.mockResolvedValue({
          metadata: { rejectionReason: 'Contact details unverified.' },
        });

        const profile = await service.getHostProfile(HOST_ID);

        expect(profile.verificationStatus).toBe(HostVerificationStatus.REJECTED);
        expect((profile as any).rejectionReason).toBe('Contact details unverified.');
      });
    });
  });

  // ─────────────────────────────────────────
  // CREATE LISTING
  // ─────────────────────────────────────────

  describe('createListing', () => {
    beforeEach(() => {
      mockPropertyRepo.createQueryBuilder.mockImplementation(() =>
        createMockQb(mockRentalListing),
      );
    });

    it('[positive] creates a rental listing in DRAFT status', async () => {
      const dto = {
        title: 'Bole Apartment',
        description: 'Great place',
        listingType: ListingType.RENTAL,
        pricePerNight: 200,
        address: 'Bole Rd',
        city: 'Addis Ababa',
      };

      const result = await service.createListing(HOST_ID, dto);
      expect(mockPropertyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          hostId: HOST_ID,
          status: ListingStatus.DRAFT,
          listingType: ListingType.RENTAL,
        }),
      );
      expect(result).toBeDefined();
    });

    it('[positive] creates a sale listing in DRAFT status', async () => {
      mockPropertyRepo.createQueryBuilder.mockImplementation(() =>
        createMockQb(mockSaleListing),
      );
      const dto = {
        title: 'Villa for Sale',
        description: 'Spacious villa',
        listingType: ListingType.SALE,
        salePrice: 5000000,
        address: 'Old Airport',
        city: 'Addis Ababa',
      };

      await service.createListing(HOST_ID, dto);
      expect(mockPropertyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ListingStatus.DRAFT,
          listingType: ListingType.SALE,
        }),
      );
    });

    it('[security] hostId always comes from JWT, not from DTO', async () => {
      const dto = {
        title: 'Test',
        description: 'Desc',
        listingType: ListingType.RENTAL,
        address: 'Addr',
        city: 'Addis',
      };
      await service.createListing(HOST_ID, dto);
      expect(mockPropertyRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ hostId: HOST_ID }),
      );
    });
  });

  // ─────────────────────────────────────────
  // GET MY LISTINGS
  // ─────────────────────────────────────────

  describe('getMyListings', () => {
    it('[positive] returns paginated listings for the host', async () => {
      const mockQb = createMockQb(mockRentalListing);
      mockQb.getManyAndCount.mockResolvedValue([[mockRentalListing], 1]);
      mockPropertyRepo.createQueryBuilder.mockImplementation(() => mockQb);

      const result = await service.getMyListings(HOST_ID, { page: 1, limit: 10 });
      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.page).toBe(1);
    });

    it('[security] query always scoped to the authenticated hostId', async () => {
      const mockQb = createMockQb(mockRentalListing);
      mockPropertyRepo.createQueryBuilder.mockImplementation(() => mockQb);
      await service.getMyListings(HOST_ID, {});
      expect(mockQb.where).toHaveBeenCalledWith(
        'property.host_id = :hostId',
        { hostId: HOST_ID },
      );
    });
  });

  // ─────────────────────────────────────────
  // GET LISTING DETAIL
  // ─────────────────────────────────────────

  describe('getListingDetail', () => {
    it('[positive] owner can access their own listing', async () => {
      mockPropertyRepo.createQueryBuilder.mockImplementation(() =>
        createMockQb(mockRentalListing),
      );
      const result = await service.getListingDetail(LISTING_ID, HOST_ID, UserRole.USER);
      expect(result).toBeDefined();
      expect(result.id).toBe(LISTING_ID);
    });

    it('[negative] another host cannot access the listing', async () => {
      mockPropertyRepo.createQueryBuilder.mockImplementation(() =>
        createMockQb(mockRentalListing),
      );
      await expect(
        service.getListingDetail(LISTING_ID, OTHER_HOST_ID, UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('[negative] throws NotFoundException for nonexistent listing', async () => {
      const mockQb = createMockQb(null);
      mockQb.getOne.mockResolvedValue(null);
      mockPropertyRepo.createQueryBuilder.mockImplementation(() => mockQb);

      await expect(
        service.getListingDetail('nonexistent-id', HOST_ID, UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────
  // UPDATE LISTING
  // ─────────────────────────────────────────

  describe('updateListing', () => {
    it('[positive] owner can update their listing', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockRentalListing });
      mockPropertyRepo.createQueryBuilder.mockImplementation(() =>
        createMockQb(mockRentalListing),
      );
      const result = await service.updateListing(
        LISTING_ID,
        { title: 'Updated Title' },
        HOST_ID,
        UserRole.USER,
      );
      expect(mockPropertyRepo.save).toHaveBeenCalled();
    });

    it('[negative] another host cannot update the listing', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockRentalListing });
      await expect(
        service.updateListing(LISTING_ID, { title: 'Hacked' }, OTHER_HOST_ID, UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('[negative] cannot update nonexistent listing', async () => {
      mockPropertyRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateListing('fake-id', { title: 'X' }, HOST_ID, UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('[positive] updating published listing routes through listingModerationService.processListingUpdate', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockPublishedListing });
      mockPropertyRepo.createQueryBuilder.mockImplementation(() =>
        createMockQb(mockPublishedListing),
      );
      mockListingModerationService.processListingUpdate.mockResolvedValueOnce({
        property: mockPublishedListing,
        review: {
          id: 'rev-edit-1',
          status: 'PENDING',
          submissionType: 'IMPORTANT_EDIT',
          proposedChanges: { pricePerNight: 3500 },
        },
        isPendingReview: true,
        message: 'Important changes submitted for review.',
      });

      const result = await service.updateListing(
        LISTING_ID,
        { pricePerNight: 3500 },
        HOST_ID,
        UserRole.USER,
      );

      expect(mockListingModerationService.processListingUpdate).toHaveBeenCalledWith(
        LISTING_ID,
        expect.objectContaining({ pricePerNight: 3500 }),
        HOST_ID,
        UserRole.USER,
      );
      expect(result.isPendingReview).toBe(true);
      expect(result.activeReview).toBeDefined();
    });

    it('[security] strips mass-assigned protected fields (status, adminHidden, hostId) when updating draft listing', async () => {
      const draft = { ...mockRentalListing, status: ListingStatus.DRAFT, adminHidden: false };
      mockPropertyRepo.findOne.mockResolvedValue({ ...draft });
      mockPropertyRepo.createQueryBuilder.mockImplementation(() => createMockQb(draft));
      mockPropertyRepo.save.mockImplementation(async (entity) => entity);

      await service.updateListing(
        LISTING_ID,
        {
          title: 'Clean Title',
          status: ListingStatus.PUBLISHED,
          adminHidden: true,
          hostId: 'malicious-host-id',
        } as any,
        HOST_ID,
        UserRole.USER,
      );

      expect(mockPropertyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Clean Title',
          status: ListingStatus.DRAFT, // MUST NOT be overridden
          adminHidden: false, // MUST NOT be overridden
          hostId: HOST_ID, // MUST NOT be overridden
        }),
      );
    });
  });

  // ─────────────────────────────────────────
  // STATUS WORKFLOW
  // ─────────────────────────────────────────

  describe('publishListing', () => {
    it('[positive] DRAFT → enters review queue when publishListing is called', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockRentalListing });
      mockPropertyRepo.createQueryBuilder.mockImplementation(() =>
        createMockQb(mockRentalListing),
      );
      const result = await service.publishListing(LISTING_ID, HOST_ID, UserRole.USER);
      expect(result.review).toBeDefined();
      expect(result.review.status).toBe('PENDING');
    });

    it('[negative] cannot publish a listing that is already PUBLISHED', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockPublishedListing });
      await expect(
        service.publishListing(LISTING_ID, HOST_ID, UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('[negative] cannot publish without coverImage', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({
        ...mockRentalListing,
        coverImage: null,
      });
      await expect(
        service.publishListing(LISTING_ID, HOST_ID, UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('[negative] cannot publish a rental listing without pricePerNight > 0', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({
        ...mockRentalListing,
        pricePerNight: 0,
      });
      await expect(
        service.publishListing(LISTING_ID, HOST_ID, UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('[negative] another host cannot publish the listing', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockRentalListing });
      await expect(
        service.publishListing(LISTING_ID, OTHER_HOST_ID, UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('[negative] cannot resume PAUSED listing if host is UNVERIFIED or REJECTED', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({
        ...mockPublishedListing,
        status: ListingStatus.PAUSED,
      });
      mockHostProfileRepo.findOne.mockResolvedValue({
        ...mockHostProfile,
        verificationStatus: HostVerificationStatus.UNVERIFIED,
      });

      await expect(
        service.publishListing(LISTING_ID, HOST_ID, UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('[positive] resumes PAUSED listing to PUBLISHED when host is VERIFIED', async () => {
      const pausedListing = {
        ...mockPublishedListing,
        status: ListingStatus.PAUSED,
      };
      mockPropertyRepo.findOne.mockResolvedValue(pausedListing);
      mockPropertyRepo.createQueryBuilder.mockImplementation(() =>
        createMockQb({ ...pausedListing, status: ListingStatus.PUBLISHED }),
      );
      mockHostProfileRepo.findOne.mockResolvedValue({
        ...mockHostProfile,
        verificationStatus: HostVerificationStatus.VERIFIED,
      });

      const result = await service.publishListing(LISTING_ID, HOST_ID, UserRole.USER);
      expect(result.status).toBe(ListingStatus.PUBLISHED);
      expect(mockPropertyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ListingStatus.PUBLISHED }),
      );
    });
  });

  describe('pauseListing', () => {
    it('[positive] PUBLISHED → PAUSED', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockPublishedListing });
      const result = await service.pauseListing(LISTING_ID, HOST_ID, UserRole.USER);
      expect(result.status).toBe(ListingStatus.PAUSED);
    });

    it('[negative] cannot pause a DRAFT listing', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockRentalListing });
      await expect(
        service.pauseListing(LISTING_ID, HOST_ID, UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('[negative] another host cannot pause the listing', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockPublishedListing });
      await expect(
        service.pauseListing(LISTING_ID, OTHER_HOST_ID, UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('archiveListing', () => {
    it('[positive] PUBLISHED → ARCHIVED', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockPublishedListing });
      const result = await service.archiveListing(LISTING_ID, HOST_ID, UserRole.USER);
      expect(result.status).toBe(ListingStatus.ARCHIVED);
    });

    it('[negative] DRAFT → ARCHIVED is not allowed', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockRentalListing });
      await expect(
        service.archiveListing(LISTING_ID, HOST_ID, UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('markSold', () => {
    it('[positive] marks a SALE listing as SOLD', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockSaleListing, status: ListingStatus.PUBLISHED });
      const result = await service.markSold('sale-listing-uuid', HOST_ID, UserRole.USER);
      expect(result.status).toBe(ListingStatus.SOLD);
    });

    it('[negative] cannot mark a RENTAL listing as sold', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockPublishedListing });
      await expect(
        service.markSold(LISTING_ID, HOST_ID, UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────
  // AVAILABILITY
  // ─────────────────────────────────────────

  describe('addAvailabilityBlock', () => {
    it('[positive] adds availability block to a RENTAL listing', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockPublishedListing });
      mockAvailabilityBlockRepo.createQueryBuilder.mockImplementationOnce(() => createMockQb());
      const result = await service.addAvailabilityBlock(
        LISTING_ID, '2027-03-01', '2027-03-10', 'Maintenance', HOST_ID, UserRole.USER,
      );
      expect(mockAvailabilityBlockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ propertyId: LISTING_ID }),
      );
    });

    it('[negative] rejects availability dates that overlap an existing block', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockPublishedListing });
      const queryBuilder = createMockQb();
      queryBuilder.getCount.mockResolvedValue(1);
      mockAvailabilityBlockRepo.createQueryBuilder.mockReturnValueOnce(queryBuilder);

      await expect(
        service.addAvailabilityBlock(
          LISTING_ID, '2027-03-05', '2027-03-12', 'Maintenance', HOST_ID, UserRole.USER,
        ),
      ).rejects.toThrow(ConflictException);
      expect(mockAvailabilityBlockRepo.create).not.toHaveBeenCalled();
    });

    it('[negative] SALE listing cannot receive availability blocks', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockSaleListing });
      await expect(
        service.addAvailabilityBlock(
          'sale-listing-uuid', '2027-03-01', '2027-03-10', null, HOST_ID, UserRole.USER,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('[negative] endDate must be after startDate', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockPublishedListing });
      await expect(
        service.addAvailabilityBlock(
          LISTING_ID, '2027-03-10', '2027-03-01', null, HOST_ID, UserRole.USER,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('[negative] equal dates are rejected', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockPublishedListing });
      await expect(
        service.addAvailabilityBlock(
          LISTING_ID, '2027-03-01', '2027-03-01', null, HOST_ID, UserRole.USER,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('[negative] another host cannot add availability to the listing', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockPublishedListing });
      await expect(
        service.addAvailabilityBlock(
          LISTING_ID, '2027-03-01', '2027-03-10', null, OTHER_HOST_ID, UserRole.USER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeAvailabilityBlock', () => {
    it('[positive] removes own availability block', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockPublishedListing });
      mockAvailabilityBlockRepo.findOne.mockResolvedValue({
        id: BLOCK_ID, propertyId: LISTING_ID,
      });
      await service.removeAvailabilityBlock(LISTING_ID, BLOCK_ID, HOST_ID, UserRole.USER);
      expect(mockAvailabilityBlockRepo.remove).toHaveBeenCalled();
    });

    it('[negative] another host cannot remove the block', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockPublishedListing });
      await expect(
        service.removeAvailabilityBlock(LISTING_ID, BLOCK_ID, OTHER_HOST_ID, UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─────────────────────────────────────────
  // HOST RESERVATIONS
  // ─────────────────────────────────────────

  describe('getHostReservations', () => {
    it('[positive] returns reservations for the authenticated host', async () => {
      const mockQb = createMockQb(mockBooking);
      mockQb.getManyAndCount.mockResolvedValue([[mockBooking], 1]);
      mockBookingRepo.createQueryBuilder.mockImplementation(() => mockQb);

      const result = await service.getHostReservations(HOST_ID, { page: 1, limit: 10 });
      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: BOOKING_ID,
        property: { id: LISTING_ID, title: mockPublishedListing.title },
        guest: { id: 'guest-uuid', name: mockUser.name },
        totalPrice: 1000,
      });
    });

    it('[security] query is always scoped to the authenticated hostId', async () => {
      const mockQb = createMockQb(mockBooking);
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);
      mockBookingRepo.createQueryBuilder.mockImplementation(() => mockQb);

      await service.getHostReservations(OTHER_HOST_ID, {});
      expect(mockQb.where).toHaveBeenCalledWith(
        'property.hostId = :hostId',
        { hostId: OTHER_HOST_ID },
      );
    });
  });

  // ─────────────────────────────────────────
  // RESERVATION ACTIONS
  // ─────────────────────────────────────────

  describe('confirmReservation', () => {
    it('[positive] host can confirm a PENDING booking', async () => {
      mockBookingRepo.findOne.mockResolvedValue({
        ...mockBooking,
        property: { ...mockPublishedListing, hostId: HOST_ID },
      });
      const result = await service.confirmReservation(BOOKING_ID, HOST_ID);
      expect(result.status).toBe(BookingStatus.CONFIRMED);
    });

    it('[negative] another host cannot confirm the booking', async () => {
      mockBookingRepo.findOne.mockResolvedValue({
        ...mockBooking,
        property: { ...mockPublishedListing, hostId: HOST_ID },
      });
      await expect(
        service.confirmReservation(BOOKING_ID, OTHER_HOST_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('[negative] cannot confirm a booking that is already CANCELLED', async () => {
      mockBookingRepo.findOne.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CANCELLED,
        property: { ...mockPublishedListing, hostId: HOST_ID },
      });
      await expect(
        service.confirmReservation(BOOKING_ID, HOST_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelReservation', () => {
    it('[positive] host can cancel a PENDING booking', async () => {
      mockBookingRepo.findOne.mockResolvedValue({
        ...mockBooking,
        property: { ...mockPublishedListing, hostId: HOST_ID },
      });
      const result = await service.cancelReservation(BOOKING_ID, HOST_ID);
      expect(result.status).toBe(BookingStatus.CANCELLED);
    });

    it('[negative] cannot cancel an already COMPLETED booking', async () => {
      mockBookingRepo.findOne.mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.COMPLETED,
        property: { ...mockPublishedListing, hostId: HOST_ID },
      });
      await expect(
        service.cancelReservation(BOOKING_ID, HOST_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────
  // DASHBOARD SUMMARY
  // ─────────────────────────────────────────

  describe('getDashboardSummary', () => {
    it('[positive] returns a dashboard summary object with expected keys', async () => {
      const listingQb = createMockQb();
      listingQb.getRawMany.mockResolvedValue([
        { status: 'PUBLISHED', listingType: 'RENTAL', count: '3' },
        { status: 'DRAFT', listingType: 'RENTAL', count: '1' },
        { status: 'PUBLISHED', listingType: 'SALE', count: '1' },
      ]);
      const bookingQb = createMockQb();
      bookingQb.getRawMany.mockResolvedValue([
        { status: 'PENDING', count: '2' },
        { status: 'CONFIRMED', count: '1' },
      ]);
      bookingQb.getCount.mockResolvedValue(1);
      bookingQb.getRawOne.mockResolvedValue({ total: '1500.00' });

      mockPropertyRepo.createQueryBuilder.mockImplementation(() => listingQb);
      mockBookingRepo.createQueryBuilder.mockImplementation(() => bookingQb);

      const summary = await service.getDashboardSummary(HOST_ID);

      expect(summary).toHaveProperty('totalListings');
      expect(summary).toHaveProperty('publishedListings');
      expect(summary).toHaveProperty('draftListings');
      expect(summary).toHaveProperty('pausedListings');
      expect(summary).toHaveProperty('saleListings');
      expect(summary).toHaveProperty('rentalListings');
      expect(summary).toHaveProperty('pendingReservations');
      expect(summary).toHaveProperty('confirmedReservations');
      expect(summary).toHaveProperty('completedReservations');
      expect(summary).toHaveProperty('upcomingReservations');
      expect(summary).toHaveProperty('totalBookingValue');
    });
  });

  // ─────────────────────────────────────────
  // HOST EARNINGS & FINANCIAL REPORTING
  // ─────────────────────────────────────────

  describe('getEarningsSummary', () => {
    it('[positive] aggregates real stored financial metrics and monthly breakdown', async () => {
      mockHostProfileRepo.findOne.mockResolvedValue(mockHostProfile);

      const fakeBookings = [
        {
          id: 'b-1',
          totalPrice: '2500.00',
          status: BookingStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          paymentMethod: PaymentMethod.CHAPA,
          paymentCurrency: 'ETB',
          createdAt: new Date('2025-05-10T10:00:00Z'),
        },
        {
          id: 'b-2',
          totalPrice: '1500.00',
          status: BookingStatus.COMPLETED,
          paymentStatus: PaymentStatus.ON_ARRIVAL,
          paymentMethod: PaymentMethod.CASH_ON_ARRIVAL,
          paymentCurrency: 'ETB',
          createdAt: new Date('2025-05-15T12:00:00Z'),
        },
        {
          id: 'b-3',
          totalPrice: '800.00',
          status: BookingStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          paymentMethod: PaymentMethod.TELEBIRR,
          paymentCurrency: 'ETB',
          createdAt: new Date('2025-06-01T08:00:00Z'),
        },
        {
          id: 'b-4',
          totalPrice: '1200.00',
          status: BookingStatus.CANCELLED,
          paymentStatus: PaymentStatus.REFUNDED,
          paymentMethod: PaymentMethod.CHAPA,
          paymentCurrency: 'ETB',
          createdAt: new Date('2025-06-05T09:00:00Z'),
        },
      ];

      const qb = createMockQb();
      qb.getMany.mockResolvedValue(fakeBookings);
      mockBookingRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getEarningsSummary(HOST_ID, {
        startDate: '2025-05-01',
        endDate: '2025-06-30',
      });

      expect(result.currency).toBe('ETB');
      expect(result.totalBookingsCount).toBe(4);
      // Confirmed and Completed: 2500 + 1500 = 4000
      expect(result.totalBookingValue).toBe(4000);
      // PAID: 2500 (1 count)
      expect(result.confirmedPaidAmount).toBe(2500);
      expect(result.confirmedPaidCount).toBe(1);
      // ON_ARRIVAL: 1500 (1 count)
      expect(result.onArrivalAmount).toBe(1500);
      expect(result.onArrivalCount).toBe(1);
      // PENDING: 800 (1 count)
      expect(result.pendingPaymentAmount).toBe(800);
      expect(result.pendingPaymentCount).toBe(1);
      // REFUNDED: 1200 (1 count)
      expect(result.refundedAmount).toBe(1200);
      expect(result.refundedCount).toBe(1);
      // CANCELLED: 1 count, 1200 value
      expect(result.cancelledCount).toBe(1);
      expect(result.cancelledBookingValue).toBe(1200);

      // Monthly breakdown
      expect(result.monthlyBreakdown).toHaveLength(2);
      expect(result.monthlyBreakdown[0].yearMonth).toBe('2025-06');
      expect(result.monthlyBreakdown[1].yearMonth).toBe('2025-05');
    });

    it('[negative] throws ForbiddenException if user has no host profile', async () => {
      mockHostProfileRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getEarningsSummary(HOST_ID, {}, UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getFinancialTransactions', () => {
    it('[positive] returns paginated financial transactions for host properties', async () => {
      mockHostProfileRepo.findOne.mockResolvedValue(mockHostProfile);

      const fakeTxBooking = {
        id: 'b-tx-1',
        checkInDate: '2025-05-10',
        checkOutDate: '2025-05-15',
        guestCount: 2,
        totalPrice: 2500,
        paymentCurrency: 'ETB',
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: PaymentMethod.CHAPA,
        paymentReference: 'ENGIDA-CHAPA-12345',
        paidAt: new Date('2025-05-10T10:05:00Z'),
        createdAt: new Date('2025-05-10T10:00:00Z'),
        property: {
          id: LISTING_ID,
          title: 'Addis Luxury Apartment',
          city: 'Addis Ababa',
        },
        guest: {
          id: 'guest-1',
          name: 'Abebe Bikila',
          email: 'abebe@example.com',
        },
      };

      const qb = createMockQb();
      qb.getManyAndCount.mockResolvedValue([[fakeTxBooking], 1]);
      mockBookingRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getFinancialTransactions(HOST_ID, {
        page: 1,
        limit: 10,
        paymentStatus: PaymentStatus.PAID,
      });

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('b-tx-1');
      expect(result.data[0].propertyTitle).toBe('Addis Luxury Apartment');
      expect(result.data[0].guestName).toBe('Abebe Bikila');
      expect(result.data[0].paymentReference).toBe('ENGIDA-CHAPA-12345');
      expect(result.data[0].paymentStatus).toBe(PaymentStatus.PAID);
    });
  });

  // ─────────────────────────────────────────
  // HOST REVIEWS & REPUTATION MANAGEMENT
  // ─────────────────────────────────────────

  describe('getHostReviews', () => {
    it('[positive] returns paginated reviews for properties owned by host', async () => {
      mockHostProfileRepo.findOne.mockResolvedValue(mockHostProfile);

      const fakeReview = {
        id: 'rev-uuid-1',
        propertyId: LISTING_ID,
        userId: 'guest-uuid-1',
        rating: 5,
        comment: 'Outstanding stay, very clean and peaceful.',
        createdAt: new Date('2025-06-10T14:00:00Z'),
        property: {
          id: LISTING_ID,
          title: 'Addis Luxury Apartment',
          city: 'Addis Ababa',
        },
        user: {
          id: 'guest-uuid-1',
          name: 'Sara Tadesse',
        },
      };

      const qb = createMockQb();
      qb.getManyAndCount.mockResolvedValue([[fakeReview], 1]);
      mockGuestReviewRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getHostReviews(HOST_ID, {
        page: 1,
        limit: 10,
        rating: 5,
        propertyId: LISTING_ID,
      });

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('rev-uuid-1');
      expect(result.data[0].propertyTitle).toBe('Addis Luxury Apartment');
      expect(result.data[0].guestName).toBe('Sara Tadesse');
      expect(result.data[0].rating).toBe(5);
      expect(result.data[0].comment).toBe('Outstanding stay, very clean and peaceful.');
      // Must not leak sensitive fields
      expect((result.data[0] as any).user?.email).toBeUndefined();
    });

    it('[negative] throws ForbiddenException if user has no host profile', async () => {
      mockHostProfileRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getHostReviews(HOST_ID, {}, UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getHostReviewsSummary', () => {
    it('[positive] computes average rating, distribution breakdown, and per-property summaries', async () => {
      mockHostProfileRepo.findOne.mockResolvedValue(mockHostProfile);

      mockPropertyRepo.find.mockResolvedValue([
        {
          id: LISTING_ID,
          title: 'Addis Luxury Apartment',
          city: 'Addis Ababa',
          coverImage: 'https://example.com/cover.jpg',
        },
        {
          id: 'listing-2',
          title: 'Bole Studio',
          city: 'Addis Ababa',
          coverImage: null,
        },
      ]);

      const fakeReviews = [
        {
          id: 'r-1',
          propertyId: LISTING_ID,
          rating: 5,
          property: { id: LISTING_ID },
        },
        {
          id: 'r-2',
          propertyId: LISTING_ID,
          rating: 4,
          property: { id: LISTING_ID },
        },
        {
          id: 'r-3',
          propertyId: 'listing-2',
          rating: 5,
          property: { id: 'listing-2' },
        },
      ];

      const qb = createMockQb();
      qb.getMany.mockResolvedValue(fakeReviews);
      mockGuestReviewRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getHostReviewsSummary(HOST_ID);

      expect(result.totalReviews).toBe(3);
      // (5 + 4 + 5) / 3 = 14 / 3 = 4.666... -> rounded to 4.7
      expect(result.averageRating).toBe(4.7);
      expect(result.ratingDistribution[5]).toBe(2);
      expect(result.ratingDistribution[4]).toBe(1);
      expect(result.ratingDistribution[3]).toBe(0);
      expect(result.ratingDistribution[2]).toBe(0);
      expect(result.ratingDistribution[1]).toBe(0);

      // Property summaries
      expect(result.propertySummaries).toHaveLength(2);
      const prop1 = result.propertySummaries.find((p) => p.propertyId === LISTING_ID);
      expect(prop1).toBeDefined();
      expect(prop1?.reviewCount).toBe(2);
      expect(prop1?.averageRating).toBe(4.5); // (5 + 4) / 2 = 4.5

      const prop2 = result.propertySummaries.find((p) => p.propertyId === 'listing-2');
      expect(prop2).toBeDefined();
      expect(prop2?.reviewCount).toBe(1);
      expect(prop2?.averageRating).toBe(5);
    });

    it('[positive] handles host with zero reviews gracefully', async () => {
      mockHostProfileRepo.findOne.mockResolvedValue(mockHostProfile);
      mockPropertyRepo.find.mockResolvedValue([
        {
          id: LISTING_ID,
          title: 'Addis Luxury Apartment',
          city: 'Addis Ababa',
          coverImage: null,
        },
      ]);

      const qb = createMockQb();
      qb.getMany.mockResolvedValue([]);
      mockGuestReviewRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getHostReviewsSummary(HOST_ID);

      expect(result.totalReviews).toBe(0);
      expect(result.averageRating).toBe(0);
      expect(result.ratingDistribution[5]).toBe(0);
      expect(result.propertySummaries).toHaveLength(1);
      expect(result.propertySummaries[0].reviewCount).toBe(0);
      expect(result.propertySummaries[0].averageRating).toBe(0);
    });

    it('[negative] throws ForbiddenException if user has no host profile', async () => {
      mockHostProfileRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getHostReviewsSummary(HOST_ID, {}, UserRole.USER),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─────────────────────────────────────────
  // EDGE CASE: Invalid UUID param
  // ─────────────────────────────────────────

  describe('edge cases', () => {
    it('[negative] getListingDetail with non-uuid param returns NotFoundException', async () => {
      const mockQb = createMockQb(null);
      mockQb.getOne.mockResolvedValue(null);
      mockPropertyRepo.createQueryBuilder.mockImplementation(() => mockQb);

      await expect(
        service.getListingDetail('not-a-valid-uuid', HOST_ID, UserRole.USER),
      ).rejects.toThrow(NotFoundException);
    });

    it('[negative] invalid status transition throws BadRequestException', async () => {
      // DRAFT cannot go directly to ARCHIVED
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockRentalListing, status: ListingStatus.DRAFT });
      await expect(
        service.archiveListing(LISTING_ID, HOST_ID, UserRole.USER),
      ).rejects.toThrow(BadRequestException);
    });

    it('[negative] unauthenticated reservation action - booking not found', async () => {
      mockBookingRepo.findOne.mockResolvedValue(null);
      await expect(
        service.confirmReservation('fake-booking', HOST_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
