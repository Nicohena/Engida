import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { Property, PropertyType, ListingType, ListingStatus } from './entities/property.entity';
import { Room } from './entities/room.entity';
import { Amenity } from '../amenities/entities/amenity.entity';
import { AvailabilityBlock } from './entities/availability-block.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UserRole } from '../../users/entities/user.entity';
import { HostService } from '../host/host.service';
import { ListingModerationService } from './listing-moderation.service';

describe('PropertiesService', () => {
  let service: PropertiesService;

  const mockProperty: Property = {
    id: 'prop-uuid-1',
    hostId: 'host-uuid-1',
    title: 'Luxury Bole Apartment',
    description: 'Modern apartment in central Bole',
    propertyType: PropertyType.APARTMENT,
    listingType: ListingType.RENTAL,
    status: ListingStatus.PUBLISHED,
    address: 'Cameroon St, Bole',
    city: 'Addis Ababa',
    country: 'Ethiopia',
    region: 'Addis Ababa',
    zone: 'Bole',
    subCity: 'Bole',
    woreda: 'Woreda 03',
    neighborhood: 'Bole Medhanialem',
    latitude: 9.0012,
    longitude: 38.7845,
    pricePerNight: 150.0,
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
    coverImage: 'https://example.com/cover.jpg',
    images: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    host: null as any,
    rooms: [],
    amenities: [],
    bookings: [],
    reviews: [],
    availabilityBlocks: [],
  };

  const createMockQueryBuilder = (result: any = mockProperty) => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(result),
    getManyAndCount: jest.fn().mockResolvedValue([[result], 1]),
  });

  const mockPropertyRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn().mockImplementation((dto) => ({
      id: 'prop-uuid-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...dto,
    })),
    save: jest.fn().mockImplementation((prop) => Promise.resolve(prop)),
    remove: jest.fn().mockImplementation((prop) => Promise.resolve(prop)),
    createQueryBuilder: jest.fn().mockImplementation(() => createMockQueryBuilder()),
  };

  const mockRoomRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockAmenityRepository = {
    findByIds: jest.fn().mockResolvedValue([]),
  };

  const mockAvailabilityBlockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn().mockImplementation((dto) => ({
      id: 'block-uuid-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...dto,
    })),
    save: jest.fn().mockImplementation((block) => Promise.resolve(block)),
    remove: jest.fn().mockImplementation((block) => Promise.resolve(block)),
  };

  const mockCloudinaryService = {
    uploadImage: jest.fn(),
    uploadImages: jest.fn(),
    deleteImage: jest.fn(),
    deletePropertyImages: jest.fn(),
    extractPublicId: jest.fn(),
  };

  const mockHostService = {
    updateListing: jest.fn(),
  };

  const mockListingModerationService = {
    findPendingReview: jest.fn(),
    processListingUpdate: jest.fn(),
    cleanOrphanImages: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        {
          provide: getRepositoryToken(Property),
          useValue: mockPropertyRepository,
        },
        {
          provide: getRepositoryToken(Room),
          useValue: mockRoomRepository,
        },
        {
          provide: getRepositoryToken(Amenity),
          useValue: mockAmenityRepository,
        },
        {
          provide: getRepositoryToken(AvailabilityBlock),
          useValue: mockAvailabilityBlockRepository,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
        {
          provide: HostService,
          useValue: mockHostService,
        },
        {
          provide: ListingModerationService,
          useValue: mockListingModerationService,
        },
      ],
    }).compile();

    service = module.get<PropertiesService>(PropertiesService);
    jest.clearAllMocks();
    mockPropertyRepository.findOne.mockReset();
    mockPropertyRepository.createQueryBuilder.mockReset();
    mockPropertyRepository.createQueryBuilder.mockImplementation(() => createMockQueryBuilder());
    mockListingModerationService.findPendingReview.mockReset();
    mockListingModerationService.processListingUpdate.mockReset();
    mockListingModerationService.cleanOrphanImages.mockReset();
    mockCloudinaryService.uploadImage.mockReset();
    mockCloudinaryService.uploadImages.mockReset();
    mockCloudinaryService.deletePropertyImages.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create property', () => {
    it('should create a rental property with Ethiopian location hierarchy', async () => {
      mockPropertyRepository.findOne.mockResolvedValue(mockProperty);

      const result = await service.create(
        {
          title: 'Luxury Bole Apartment',
          description: 'Modern apartment in central Bole',
          propertyType: PropertyType.APARTMENT,
          listingType: ListingType.RENTAL,
          status: ListingStatus.PUBLISHED,
          address: 'Cameroon St, Bole',
          city: 'Addis Ababa',
          country: 'Ethiopia',
          region: 'Addis Ababa',
          zone: 'Bole',
          subCity: 'Bole',
          woreda: 'Woreda 03',
          neighborhood: 'Bole Medhanialem',
          latitude: 9.0012,
          longitude: 38.7845,
          pricePerNight: 150.0,
          maxGuests: 4,
          bedrooms: 2,
          bathrooms: 2,
        },
        'host-uuid-1',
      );

      expect(mockPropertyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          listingType: ListingType.RENTAL,
          subCity: 'Bole',
          hostId: 'host-uuid-1',
        }),
      );
      expect(result).toBeDefined();
    });

    it('should create a sale property with sale price', async () => {
      const saleProperty = {
        ...mockProperty,
        listingType: ListingType.SALE,
        salePrice: 12500000.0,
      };
      mockPropertyRepository.createQueryBuilder.mockImplementationOnce(() =>
        createMockQueryBuilder(saleProperty),
      );

      const result = await service.create(
        {
          title: 'Luxury Villa for Sale',
          description: 'Spacious villa in Old Airport',
          propertyType: PropertyType.VILLA,
          listingType: ListingType.SALE,
          status: ListingStatus.PUBLISHED,
          address: 'Old Airport',
          city: 'Addis Ababa',
          subCity: 'Lideta',
          pricePerNight: 0,
          salePrice: 12500000.0,
          maxGuests: 6,
          bedrooms: 4,
          bathrooms: 3,
        },
        'host-uuid-1',
      );

      expect(mockPropertyRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          listingType: ListingType.SALE,
          salePrice: 12500000.0,
        }),
      );
      expect(result.listingType).toBe(ListingType.SALE);
    });
  });

  describe('update', () => {
    it('should delegate to hostService.updateListing canonically', async () => {
      mockHostService.updateListing.mockResolvedValue({ ...mockProperty, title: 'Delegated Title' });

      const result = await service.update(
        'prop-uuid-1',
        { title: 'Delegated Title' },
        'host-uuid-1',
        UserRole.USER,
      );

      expect(mockHostService.updateListing).toHaveBeenCalledWith(
        'prop-uuid-1',
        { title: 'Delegated Title' },
        'host-uuid-1',
        UserRole.USER,
      );
      expect(result.title).toBe('Delegated Title');
    });
  });

  describe('uploadCoverImage', () => {
    const mockFile: any = {
      fieldname: 'file',
      originalname: 'new-cover.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('fake'),
      size: 1024,
    };
    const uploadedUrl = 'https://cloudinary.com/new-cover-uploaded.jpg';

    it('should stage cover image in moderation proposal when listing is PUBLISHED and leave live cover unchanged', async () => {
      const liveProperty = {
        ...mockProperty,
        status: ListingStatus.PUBLISHED,
        coverImage: 'https://cloudinary.com/approved-cover.jpg',
      };
      mockPropertyRepository.findOne.mockResolvedValue({ ...liveProperty });
      mockPropertyRepository.createQueryBuilder.mockImplementation(() =>
        createMockQueryBuilder({ ...liveProperty }),
      );
      mockCloudinaryService.uploadImage.mockResolvedValue({ secureUrl: uploadedUrl });
      mockListingModerationService.findPendingReview.mockResolvedValue(null);
      mockListingModerationService.processListingUpdate.mockResolvedValue({
        property: liveProperty,
        review: { id: 'rev-1', proposedChanges: { coverImage: uploadedUrl } },
        isPendingReview: true,
        message: 'Important changes submitted for review.',
      });

      const result = await service.uploadCoverImage(
        'prop-uuid-1',
        mockFile,
        'host-uuid-1',
        UserRole.USER,
      );

      expect(mockCloudinaryService.uploadImage).toHaveBeenCalled();
      expect(mockListingModerationService.processListingUpdate).toHaveBeenCalledWith(
        'prop-uuid-1',
        { coverImage: uploadedUrl },
        'host-uuid-1',
        UserRole.USER,
      );
      expect(mockPropertyRepository.save).not.toHaveBeenCalled();
      expect(result.coverImage).toBe('https://cloudinary.com/approved-cover.jpg');
      expect(result.isPendingReview).toBe(true);
      expect(result.activeReview.proposedChanges.coverImage).toBe(uploadedUrl);
    });

    it('should stage cover image in moderation proposal when listing is PAUSED', async () => {
      const pausedProperty = {
        ...mockProperty,
        status: ListingStatus.PAUSED,
        coverImage: 'https://cloudinary.com/approved-cover.jpg',
      };
      mockPropertyRepository.findOne.mockResolvedValue({ ...pausedProperty });
      mockPropertyRepository.createQueryBuilder.mockImplementation(() =>
        createMockQueryBuilder({ ...pausedProperty }),
      );
      mockCloudinaryService.uploadImage.mockResolvedValue({ secureUrl: uploadedUrl });
      mockListingModerationService.findPendingReview.mockResolvedValue(null);
      mockListingModerationService.processListingUpdate.mockResolvedValue({
        property: pausedProperty,
        review: { id: 'rev-1', proposedChanges: { coverImage: uploadedUrl } },
        isPendingReview: true,
        message: 'Important changes submitted for review.',
      });

      const result = await service.uploadCoverImage(
        'prop-uuid-1',
        mockFile,
        'host-uuid-1',
        UserRole.USER,
      );

      expect(mockListingModerationService.processListingUpdate).toHaveBeenCalledWith(
        'prop-uuid-1',
        { coverImage: uploadedUrl },
        'host-uuid-1',
        UserRole.USER,
      );
      expect(result.isPendingReview).toBe(true);
    });

    it('should clean up superseded proposed cover image if another was already staged', async () => {
      const liveProperty = {
        ...mockProperty,
        status: ListingStatus.PUBLISHED,
        coverImage: 'https://cloudinary.com/approved-cover.jpg',
      };
      const previouslyStagedCover = 'https://cloudinary.com/superseded-staged-cover.jpg';
      mockPropertyRepository.findOne.mockResolvedValue({ ...liveProperty });
      mockPropertyRepository.createQueryBuilder.mockImplementation(() =>
        createMockQueryBuilder({ ...liveProperty }),
      );
      mockCloudinaryService.uploadImage.mockResolvedValue({ secureUrl: uploadedUrl });
      mockListingModerationService.findPendingReview.mockResolvedValue({
        id: 'rev-1',
        proposedChanges: { coverImage: previouslyStagedCover },
      });
      mockListingModerationService.processListingUpdate.mockResolvedValue({
        property: liveProperty,
        review: { id: 'rev-1', proposedChanges: { coverImage: uploadedUrl } },
        isPendingReview: true,
        message: 'Important changes submitted for review.',
      });

      await service.uploadCoverImage(
        'prop-uuid-1',
        mockFile,
        'host-uuid-1',
        UserRole.USER,
      );

      expect(mockListingModerationService.cleanOrphanImages).toHaveBeenCalledWith(
        'prop-uuid-1',
        [previouslyStagedCover],
      );
    });

    it('should update directly on DRAFT listing and delete detached old cover', async () => {
      const draftProperty = {
        ...mockProperty,
        status: ListingStatus.DRAFT,
        coverImage: 'https://cloudinary.com/old-draft-cover.jpg',
      };
      mockPropertyRepository.findOne.mockResolvedValue({ ...draftProperty });
      mockPropertyRepository.createQueryBuilder.mockImplementation(() =>
        createMockQueryBuilder({ ...draftProperty, coverImage: uploadedUrl }),
      );
      mockCloudinaryService.uploadImage.mockResolvedValue({ secureUrl: uploadedUrl });

      const result = await service.uploadCoverImage(
        'prop-uuid-1',
        mockFile,
        'host-uuid-1',
        UserRole.USER,
      );

      expect(mockPropertyRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ coverImage: uploadedUrl }),
      );
      expect(mockCloudinaryService.deletePropertyImages).toHaveBeenCalledWith(
        'prop-uuid-1',
        ['https://cloudinary.com/old-draft-cover.jpg'],
      );
      expect(result.coverImage).toBe(uploadedUrl);
    });

    it('should throw ForbiddenException if user is not property owner or admin', async () => {
      mockPropertyRepository.findOne.mockResolvedValue({ ...mockProperty, hostId: 'host-uuid-1' });

      await expect(
        service.uploadCoverImage(
          'prop-uuid-1',
          mockFile,
          'stranger-uuid',
          UserRole.USER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if property does not exist', async () => {
      mockPropertyRepository.findOne.mockResolvedValue(null);

      await expect(
        service.uploadCoverImage(
          'nonexistent-uuid',
          mockFile,
          'host-uuid-1',
          UserRole.USER,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadGalleryImages', () => {
    const mockFiles: any[] = [
      { fieldname: 'files', originalname: 'g1.jpg', size: 1024 },
      { fieldname: 'files', originalname: 'g2.jpg', size: 1024 },
    ];
    const newUrls = ['https://cloudinary.com/g1.jpg', 'https://cloudinary.com/g2.jpg'];

    it('should stage gallery images in moderation review when listing is PUBLISHED and leave live gallery unchanged', async () => {
      const liveProperty = {
        ...mockProperty,
        status: ListingStatus.PUBLISHED,
        images: ['https://cloudinary.com/live-g1.jpg'],
      };
      mockPropertyRepository.findOne.mockResolvedValue({ ...liveProperty });
      mockPropertyRepository.createQueryBuilder.mockImplementation(() =>
        createMockQueryBuilder({ ...liveProperty }),
      );
      mockListingModerationService.findPendingReview.mockResolvedValue(null);
      mockCloudinaryService.uploadImages.mockResolvedValue(newUrls.map((secureUrl) => ({ secureUrl })));
      mockListingModerationService.processListingUpdate.mockResolvedValue({
        property: liveProperty,
        review: { id: 'rev-1', proposedChanges: { images: ['https://cloudinary.com/live-g1.jpg', ...newUrls] } },
        isPendingReview: true,
        message: 'Important changes submitted for review.',
      });

      const result = await service.uploadGalleryImages(
        'prop-uuid-1',
        mockFiles,
        'host-uuid-1',
        UserRole.USER,
      );

      expect(mockListingModerationService.processListingUpdate).toHaveBeenCalledWith(
        'prop-uuid-1',
        { images: ['https://cloudinary.com/live-g1.jpg', ...newUrls] },
        'host-uuid-1',
        UserRole.USER,
      );
      expect(mockPropertyRepository.save).not.toHaveBeenCalled();
      expect(result.images).toEqual(['https://cloudinary.com/live-g1.jpg']);
      expect(result.activeReview.proposedChanges.images).toEqual(['https://cloudinary.com/live-g1.jpg', ...newUrls]);
    });

    it('should enforce max 20 images limit on published listings considering staged images', async () => {
      const liveProperty = {
        ...mockProperty,
        status: ListingStatus.PUBLISHED,
        images: ['https://cloudinary.com/live-g1.jpg'],
      };
      const existing19Images = Array.from({ length: 19 }, (_, i) => `https://cloudinary.com/staged-${i}.jpg`);
      mockPropertyRepository.findOne.mockResolvedValue({ ...liveProperty });
      mockListingModerationService.findPendingReview.mockResolvedValue({
        id: 'rev-1',
        proposedChanges: { images: existing19Images },
      });

      await expect(
        service.uploadGalleryImages(
          'prop-uuid-1',
          mockFiles,
          'host-uuid-1',
          UserRole.USER,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update gallery directly on DRAFT listing', async () => {
      const draftProperty = {
        ...mockProperty,
        status: ListingStatus.DRAFT,
        images: ['https://cloudinary.com/draft-g1.jpg'],
      };
      mockPropertyRepository.findOne.mockResolvedValue({ ...draftProperty });
      mockPropertyRepository.createQueryBuilder.mockImplementation(() =>
        createMockQueryBuilder({ ...draftProperty, images: ['https://cloudinary.com/draft-g1.jpg', ...newUrls] }),
      );
      mockCloudinaryService.uploadImages.mockResolvedValue(newUrls.map((secureUrl) => ({ secureUrl })));

      const result = await service.uploadGalleryImages(
        'prop-uuid-1',
        mockFiles,
        'host-uuid-1',
        UserRole.USER,
      );

      expect(mockPropertyRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          images: ['https://cloudinary.com/draft-g1.jpg', ...newUrls],
        }),
      );
      expect(result.images).toEqual(['https://cloudinary.com/draft-g1.jpg', ...newUrls]);
    });
  });

  describe('removeGalleryImage', () => {
    it('should stage gallery image removal in review on PUBLISHED listing without deleting live image', async () => {
      const liveProperty = {
        ...mockProperty,
        status: ListingStatus.PUBLISHED,
        images: ['https://cloudinary.com/g1.jpg', 'https://cloudinary.com/g2.jpg'],
      };
      mockPropertyRepository.findOne.mockResolvedValue({ ...liveProperty });
      mockPropertyRepository.createQueryBuilder.mockImplementation(() =>
        createMockQueryBuilder({ ...liveProperty }),
      );
      mockListingModerationService.findPendingReview.mockResolvedValue(null);
      mockListingModerationService.processListingUpdate.mockResolvedValue({
        property: liveProperty,
        review: { id: 'rev-1', proposedChanges: { images: ['https://cloudinary.com/g1.jpg'] } },
        isPendingReview: true,
        message: 'Important changes submitted for review.',
      });

      const result = await service.removeGalleryImage(
        'prop-uuid-1',
        'https://cloudinary.com/g2.jpg',
        'host-uuid-1',
        UserRole.USER,
      );

      expect(mockListingModerationService.processListingUpdate).toHaveBeenCalledWith(
        'prop-uuid-1',
        { images: ['https://cloudinary.com/g1.jpg'] },
        'host-uuid-1',
        UserRole.USER,
      );
      expect(mockListingModerationService.cleanOrphanImages).toHaveBeenCalledWith(
        'prop-uuid-1',
        ['https://cloudinary.com/g2.jpg'],
      );
      expect(mockPropertyRepository.save).not.toHaveBeenCalled();
      expect(result.images).toEqual(['https://cloudinary.com/g1.jpg', 'https://cloudinary.com/g2.jpg']);
    });

    it('should remove gallery image directly and delete from Cloudinary on DRAFT listing', async () => {
      const draftProperty = {
        ...mockProperty,
        status: ListingStatus.DRAFT,
        coverImage: 'https://cloudinary.com/draft-cover.jpg',
        images: ['https://cloudinary.com/g1.jpg', 'https://cloudinary.com/g2.jpg'],
      };
      mockPropertyRepository.findOne.mockResolvedValue({ ...draftProperty });
      mockPropertyRepository.createQueryBuilder.mockImplementation(() =>
        createMockQueryBuilder({ ...draftProperty, images: ['https://cloudinary.com/g1.jpg'] }),
      );

      const result = await service.removeGalleryImage(
        'prop-uuid-1',
        'https://cloudinary.com/g2.jpg',
        'host-uuid-1',
        UserRole.USER,
      );

      expect(mockPropertyRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ images: ['https://cloudinary.com/g1.jpg'] }),
      );
      expect(mockCloudinaryService.deletePropertyImages).toHaveBeenCalledWith(
        'prop-uuid-1',
        ['https://cloudinary.com/g2.jpg'],
      );
      expect(result.images).toEqual(['https://cloudinary.com/g1.jpg']);
    });

    it('should throw NotFoundException if image is not present in gallery', async () => {
      mockPropertyRepository.findOne.mockResolvedValue({
        ...mockProperty,
        status: ListingStatus.PUBLISHED,
        images: ['https://cloudinary.com/g1.jpg'],
      });
      mockListingModerationService.findPendingReview.mockResolvedValue(null);

      await expect(
        service.removeGalleryImage(
          'prop-uuid-1',
          'https://cloudinary.com/nonexistent.jpg',
          'host-uuid-1',
          UserRole.USER,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('availability blocks', () => {
    it('should add an availability block when dates are valid (endDate > startDate)', async () => {
      mockPropertyRepository.findOne.mockResolvedValue(mockProperty);

      const block = await service.addAvailabilityBlock(
        'prop-uuid-1',
        '2026-11-01',
        '2026-11-10',
        'Renovation',
        'host-uuid-1',
        UserRole.USER,
      );

      expect(block).toBeDefined();
      expect(mockAvailabilityBlockRepository.create).toHaveBeenCalledWith({
        propertyId: 'prop-uuid-1',
        startDate: '2026-11-01',
        endDate: '2026-11-10',
        reason: 'Renovation',
      });
      expect(mockAvailabilityBlockRepository.save).toHaveBeenCalled();
    });

    it('should reject availability block when endDate <= startDate', async () => {
      mockPropertyRepository.findOne.mockResolvedValue(mockProperty);

      await expect(
        service.addAvailabilityBlock(
          'prop-uuid-1',
          '2026-11-10',
          '2026-11-01',
          'Invalid dates',
          'host-uuid-1',
          UserRole.USER,
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.addAvailabilityBlock(
          'prop-uuid-1',
          '2026-11-10',
          '2026-11-10',
          'Equal dates',
          'host-uuid-1',
          UserRole.USER,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user is not property owner or admin', async () => {
      mockPropertyRepository.findOne.mockResolvedValue(mockProperty);

      await expect(
        service.addAvailabilityBlock(
          'prop-uuid-1',
          '2026-11-01',
          '2026-11-10',
          'Unauthorized',
          'other-user-uuid',
          UserRole.USER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if property does not exist', async () => {
      mockPropertyRepository.findOne.mockResolvedValue(null);

      await expect(
        service.addAvailabilityBlock(
          'non-existent-prop',
          '2026-11-01',
          '2026-11-10',
          'Block',
          'host-uuid-1',
          UserRole.USER,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should get availability blocks for a property', async () => {
      const mockBlocks = [
        {
          id: 'block-1',
          propertyId: 'prop-uuid-1',
          startDate: '2026-11-01',
          endDate: '2026-11-10',
          reason: 'Maintenance',
        },
      ];
      mockPropertyRepository.findOne.mockResolvedValue(mockProperty);
      mockAvailabilityBlockRepository.find.mockResolvedValue(mockBlocks);

      const result = await service.getAvailabilityBlocks('prop-uuid-1');
      expect(result).toEqual(mockBlocks);
      expect(mockAvailabilityBlockRepository.find).toHaveBeenCalledWith({
        where: { propertyId: 'prop-uuid-1' },
        order: { startDate: 'ASC' },
      });
    });

    it('should remove an availability block', async () => {
      const mockBlock = {
        id: 'block-1',
        propertyId: 'prop-uuid-1',
        startDate: '2026-11-01',
        endDate: '2026-11-10',
      };
      mockPropertyRepository.findOne.mockResolvedValue(mockProperty);
      mockAvailabilityBlockRepository.findOne.mockResolvedValue(mockBlock);

      await service.removeAvailabilityBlock(
        'prop-uuid-1',
        'block-1',
        'host-uuid-1',
        UserRole.USER,
      );

      expect(mockAvailabilityBlockRepository.remove).toHaveBeenCalledWith(mockBlock);
    });
  });
});
