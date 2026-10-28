import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AdminCatalogService } from './admin-catalog.service';
import { PropertyCategory } from './entities/property-category.entity';
import { Destination } from './entities/destination.entity';
import { Amenity, AmenityCategory } from '../amenities/entities/amenity.entity';
import { Property } from '../properties/entities/property.entity';

describe('AdminCatalogService', () => {
  let service: AdminCatalogService;
  let categoryRepo: any;
  let destinationRepo: any;
  let amenityRepo: any;
  let propertyRepo: any;

  beforeEach(async () => {
    categoryRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'cat-1', ...entity })),
      remove: jest.fn((entity) => Promise.resolve(entity)),
    };

    destinationRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'dest-1', ...entity })),
      remove: jest.fn((entity) => Promise.resolve(entity)),
    };

    amenityRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'am-1', ...entity })),
      remove: jest.fn((entity) => Promise.resolve(entity)),
    };

    propertyRepo = {
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminCatalogService,
        {
          provide: getRepositoryToken(PropertyCategory),
          useValue: categoryRepo,
        },
        {
          provide: getRepositoryToken(Destination),
          useValue: destinationRepo,
        },
        {
          provide: getRepositoryToken(Amenity),
          useValue: amenityRepo,
        },
        {
          provide: getRepositoryToken(Property),
          useValue: propertyRepo,
        },
      ],
    }).compile();

    service = module.get<AdminCatalogService>(AdminCatalogService);
  });

  describe('categories', () => {
    it('creates a category with normalized slug', async () => {
      categoryRepo.findOne.mockResolvedValue(null);

      const result = await service.createCategory({
        slug: 'Eco-Lodges ',
        name: 'Eco Lodges',
      });

      expect(categoryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'eco-lodges', name: 'Eco Lodges' }),
      );
      expect(result.slug).toBe('eco-lodges');
    });

    it('rejects duplicate category slug', async () => {
      categoryRepo.findOne.mockResolvedValue({ id: 'existing', slug: 'villas' });

      await expect(
        service.createCategory({ slug: 'villas', name: 'Villas' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('destinations', () => {
    it('creates a destination successfully', async () => {
      destinationRepo.findOne.mockResolvedValue(null);

      const result = await service.createDestination({
        slug: 'hawassa',
        name: 'Hawassa',
        region: 'Sidama',
        isFeatured: true,
      });

      expect(result.slug).toBe('hawassa');
      expect(destinationRepo.save).toHaveBeenCalled();
    });
  });

  describe('amenities', () => {
    it('creates an amenity with category grouping', async () => {
      amenityRepo.findOne.mockResolvedValue(null);

      const result = await service.createAmenity({
        name: 'Backup Generator',
        category: AmenityCategory.ESSENTIALS,
      });

      expect(result.name).toBe('Backup Generator');
      expect(result.category).toBe(AmenityCategory.ESSENTIALS);
    });
  });
});
