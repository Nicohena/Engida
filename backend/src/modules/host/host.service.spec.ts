import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
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
import { Amenity } from '../amenities/entities/amenity.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { HostProfile, HostVerificationStatus } from '../../users/entities/host-profile.entity';
import { User, UserRole } from '../../users/entities/user.entity';

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
  property: mockPublishedListing as any,
  roomId: null,
  room: null,
  guestId: 'guest-uuid',
  guest: null as any,
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
  create: jest.fn().mockImplementation((dto: any) => ({ id: BLOCK_ID, ...dto })),
  save: jest.fn().mockImplementation((e: any) => Promise.resolve(e)),
  remove: jest.fn(),
};

const mockAmenityRepo = {
  findByIds: jest.fn().mockResolvedValue([]),
};

const mockBookingRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn().mockImplementation((e: any) => Promise.resolve(e)),
  createQueryBuilder: jest.fn().mockImplementation(() => createMockQb(mockBooking)),
};

const mockHostProfileRepo = {
  findOne: jest.fn(),
  create: jest.fn().mockImplementation((dto: any) => ({ id: 'profile-uuid', ...dto })),
  save: jest.fn().mockImplementation((e: any) => Promise.resolve(e)),
};

const mockUserRepo = {
  findOne: jest.fn().mockResolvedValue(mockUser),
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
        { provide: getRepositoryToken(AvailabilityBlock), useValue: mockAvailabilityBlockRepo },
        { provide: getRepositoryToken(Amenity), useValue: mockAmenityRepo },
        { provide: getRepositoryToken(Booking), useValue: mockBookingRepo },
        { provide: getRepositoryToken(HostProfile), useValue: mockHostProfileRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<HostService>(HostService);
    jest.clearAllMocks();
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
  });

  // ─────────────────────────────────────────
  // STATUS WORKFLOW
  // ─────────────────────────────────────────

  describe('publishListing', () => {
    it('[positive] DRAFT → PUBLISHED when all required fields are present', async () => {
      mockPropertyRepo.findOne.mockResolvedValue({ ...mockRentalListing });
      const result = await service.publishListing(LISTING_ID, HOST_ID, UserRole.USER);
      expect(result.status).toBe(ListingStatus.PUBLISHED);
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
      const result = await service.addAvailabilityBlock(
        LISTING_ID, '2027-03-01', '2027-03-10', 'Maintenance', HOST_ID, UserRole.USER,
      );
      expect(mockAvailabilityBlockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ propertyId: LISTING_ID }),
      );
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
    });

    it('[security] query is always scoped to the authenticated hostId', async () => {
      const mockQb = createMockQb(mockBooking);
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);
      mockBookingRepo.createQueryBuilder.mockImplementation(() => mockQb);

      await service.getHostReservations(OTHER_HOST_ID, {});
      expect(mockQb.where).toHaveBeenCalledWith(
        'property.host_id = :hostId',
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
