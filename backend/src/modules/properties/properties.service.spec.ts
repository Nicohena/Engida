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
    extractPublicId: jest.fn(),
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
      ],
    }).compile();

    service = module.get<PropertiesService>(PropertiesService);
    jest.clearAllMocks();
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
