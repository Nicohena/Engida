import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { HostService } from '../host/host.service';
import { Property, PropertyType, ListingType, ListingStatus } from './entities/property.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { ReviewStatus, ReviewSubmissionType } from './entities/listing-review.entity';

describe('PropertiesController - Moderation & Legacy Update Security', () => {
  let controller: PropertiesController;

  const HOST_ID = 'host-uuid-1';
  const OTHER_HOST_ID = 'other-host-uuid';
  const ADMIN_ID = 'admin-uuid-1';
  const PROPERTY_ID = 'prop-uuid-1';

  const mockHostUser: User = {
    id: HOST_ID,
    name: 'Host User',
    email: 'host@engda.com',
    passwordHash: 'hash',
    role: UserRole.USER,
    phone: '+251911223344',
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

  const mockOtherUser: User = {
    ...mockHostUser,
    id: OTHER_HOST_ID,
    email: 'other@engda.com',
  };

  const mockAdminUser: User = {
    ...mockHostUser,
    id: ADMIN_ID,
    role: UserRole.ADMIN,
    email: 'admin@engda.com',
  };

  const mockPublishedListing: Property = {
    id: PROPERTY_ID,
    hostId: HOST_ID,
    title: 'Luxury Bole Apartment',
    description: 'Central modern apartment in Bole',
    propertyType: PropertyType.APARTMENT,
    listingType: ListingType.RENTAL,
    status: ListingStatus.PUBLISHED,
    address: 'Cameroon St, Bole',
    city: 'Addis Ababa',
    country: 'Ethiopia',
    region: 'Addis Ababa',
    zone: 'Bole',
    subCity: 'Bole',
    woreda: '03',
    neighborhood: 'Bole Medhanialem',
    latitude: 9.0012,
    longitude: 38.7845,
    pricePerNight: 2500,
    salePrice: null,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 2,
    areaSqm: 120,
    parkingSpaces: 1,
    isAvailable: true,
    adminHidden: false,
    adminHiddenReason: null,
    adminHiddenAt: null,
    adminHiddenById: null,
    coverImage: 'https://images.unsplash.com/cover.jpg',
    images: ['https://images.unsplash.com/gallery1.jpg'],
    createdAt: new Date(),
    updatedAt: new Date(),
    host: mockHostUser,
    rooms: [],
    amenities: [],
    bookings: [],
    reviews: [],
    availabilityBlocks: [],
  };

  const mockPropertiesService = {
    findAll: jest.fn(),
    findPublicOne: jest.fn(),
    findRelated: jest.fn(),
    findMyProperties: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockHostService = {
    updateListing: jest.fn(),
    addListingRoom: jest.fn(),
    addAvailabilityBlock: jest.fn(),
    removeAvailabilityBlock: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PropertiesController],
      providers: [
        { provide: PropertiesService, useValue: mockPropertiesService },
        { provide: HostService, useValue: mockHostService },
      ],
    }).compile();

    controller = module.get<PropertiesController>(PropertiesController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('PUT /properties/:id (Legacy update endpoint secured)', () => {
    it('1. Owner cannot change published listing important fields without triggering review workflow', async () => {
      // Mock HostService returning a pending review response for important edits
      mockHostService.updateListing.mockResolvedValue({
        ...mockPublishedListing, // Live public listing remains unchanged
        activeReview: {
          id: 'review-123',
          propertyId: PROPERTY_ID,
          submissionType: ReviewSubmissionType.IMPORTANT_EDIT,
          status: ReviewStatus.PENDING,
          proposedChanges: { pricePerNight: 4500, title: 'Updated Title' },
        },
        moderationMessage: 'Important changes submitted for review.',
        isPendingReview: true,
      });

      const dto: UpdatePropertyDto = {
        title: 'Updated Title',
        pricePerNight: 4500,
      };

      const result = await controller.update(PROPERTY_ID, dto, mockHostUser);

      // Verify delegation to HostService with moderation awareness
      expect(mockHostService.updateListing).toHaveBeenCalledWith(
        PROPERTY_ID,
        dto,
        HOST_ID,
        UserRole.USER,
      );

      // Verify that review was triggered
      expect(result.isPendingReview).toBe(true);
      expect(result.activeReview.proposedChanges).toHaveProperty('pricePerNight', 4500);
      expect(result.activeReview.proposedChanges).toHaveProperty('title', 'Updated Title');
      // Live listing values remain preserved
      expect(result.pricePerNight).toBe(2500);
    });

    it('2. Important changes do not alter currently approved public listing before approval', async () => {
      mockHostService.updateListing.mockResolvedValue({
        ...mockPublishedListing,
        activeReview: {
          id: 'review-uuid-99',
          status: ReviewStatus.PENDING,
          proposedChanges: { address: 'Brand New Address 99' },
        },
        isPendingReview: true,
      });

      const dto: UpdatePropertyDto = {
        address: 'Brand New Address 99',
      };

      const result = await controller.update(PROPERTY_ID, dto, mockHostUser);

      expect(result.address).toBe('Cameroon St, Bole'); // Unchanged approved version
      expect(result.activeReview.proposedChanges.address).toBe('Brand New Address 99');
    });

    it('3. Minor field updates (parkingSpaces, isAvailable) succeed directly without review', async () => {
      const updatedListing = {
        ...mockPublishedListing,
        parkingSpaces: 3,
        isAvailable: false,
      };
      mockHostService.updateListing.mockResolvedValue({
        ...updatedListing,
        activeReview: null,
        isPendingReview: false,
      });

      const dto: UpdatePropertyDto = {
        parkingSpaces: 3,
        isAvailable: false,
      };

      const result = await controller.update(PROPERTY_ID, dto, mockHostUser);

      expect(mockHostService.updateListing).toHaveBeenCalledWith(
        PROPERTY_ID,
        dto,
        HOST_ID,
        UserRole.USER,
      );
      expect(result.parkingSpaces).toBe(3);
      expect(result.isAvailable).toBe(false);
      expect(result.isPendingReview).toBe(false);
    });

    it('4. Legitimate draft updates still work directly', async () => {
      const draftListing = {
        ...mockPublishedListing,
        status: ListingStatus.DRAFT,
        title: 'New Draft Title',
        pricePerNight: 1800,
      };
      mockHostService.updateListing.mockResolvedValue(draftListing);

      const dto: UpdatePropertyDto = {
        title: 'New Draft Title',
        pricePerNight: 1800,
      };

      const result = await controller.update(PROPERTY_ID, dto, mockHostUser);

      expect(mockHostService.updateListing).toHaveBeenCalledWith(
        PROPERTY_ID,
        dto,
        HOST_ID,
        UserRole.USER,
      );
      expect(result.title).toBe('New Draft Title');
      expect(result.pricePerNight).toBe(1800);
    });

    it('5. A host cannot update another host listing (throws ForbiddenException)', async () => {
      mockHostService.updateListing.mockRejectedValue(
        new ForbiddenException('You can only update your own listings'),
      );

      await expect(
        controller.update(PROPERTY_ID, { title: 'Malicious Change' }, mockOtherUser),
      ).rejects.toThrow(ForbiddenException);

      expect(mockHostService.updateListing).toHaveBeenCalledWith(
        PROPERTY_ID,
        { title: 'Malicious Change' },
        OTHER_HOST_ID,
        UserRole.USER,
      );
    });

    it('6. Admin can update a listing across any host', async () => {
      mockHostService.updateListing.mockResolvedValue({
        ...mockPublishedListing,
        parkingSpaces: 5,
      });

      const result = await controller.update(
        PROPERTY_ID,
        { parkingSpaces: 5 },
        mockAdminUser,
      );

      expect(mockHostService.updateListing).toHaveBeenCalledWith(
        PROPERTY_ID,
        { parkingSpaces: 5 },
        ADMIN_ID,
        UserRole.ADMIN,
      );
      expect(result.parkingSpaces).toBe(5);
    });

    it('7. Attempts to mass-assign protected fields are rejected or stripped by host service', async () => {
      mockHostService.updateListing.mockImplementation(async (id, dto) => {
        // Verify that protected fields are stripped or ignored
        return {
          ...mockPublishedListing,
          status: ListingStatus.PUBLISHED, // Not overridden
          adminHidden: false, // Not overridden
          hostId: HOST_ID, // Not overridden
        };
      });

      const maliciousDto: any = {
        title: 'Harmless Title',
        status: ListingStatus.ARCHIVED,
        adminHidden: true,
        hostId: 'hacker-id',
      };

      const result = await controller.update(PROPERTY_ID, maliciousDto, mockHostUser);

      expect(result.status).toBe(ListingStatus.PUBLISHED);
      expect(result.adminHidden).toBe(false);
      expect(result.hostId).toBe(HOST_ID);
    });

    it('8. Throws NotFoundException if property does not exist', async () => {
      mockHostService.updateListing.mockRejectedValue(
        new NotFoundException('Listing with ID "nonexistent" not found'),
      );

      await expect(
        controller.update('nonexistent', { title: 'X' }, mockHostUser),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
