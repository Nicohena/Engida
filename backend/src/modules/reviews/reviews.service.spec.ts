import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { Review, ReviewModerationStatus } from './entities/review.entity';
import { Property, PropertyType, ListingType, ListingStatus } from '../properties/entities/property.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';

describe('ReviewsService Integration Acceptance', () => {
  let service: ReviewsService;
  let mockReviewRepo: any;
  let mockPropertyRepo: any;
  let mockBookingRepo: any;

  const HOST_ID = 'host-uuid-1';
  const GUEST_ID = 'guest-uuid-1';
  const PROPERTY_ID = 'prop-uuid-1';
  const REVIEW_ID = 'review-uuid-1';

  const mockProperty: Property = {
    id: PROPERTY_ID,
    hostId: HOST_ID,
    title: 'Sunny Addis Villa',
    description: 'Lovely villa in Addis',
    propertyType: PropertyType.VILLA,
    listingType: ListingType.RENTAL,
    status: ListingStatus.PUBLISHED,
    address: 'Old Airport',
    city: 'Addis Ababa',
    country: 'Ethiopia',
    region: 'Addis Ababa',
    zone: null,
    subCity: 'Nifas Silk-Lafto',
    woreda: null,
    neighborhood: null,
    latitude: 9.0,
    longitude: 38.7,
    pricePerNight: 3000,
    salePrice: null,
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 2,
    areaSqm: 180,
    parkingSpaces: 2,
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

  const mockReview: Review = {
    id: REVIEW_ID,
    propertyId: PROPERTY_ID,
    userId: GUEST_ID,
    rating: 5,
    comment: 'Exceptional stay and hospitality!',
    createdAt: new Date(),
    updatedAt: new Date(),
    property: mockProperty,
    user: { id: GUEST_ID, name: 'Happy Traveler' } as any,
  };

  const createMockQb = (reviews: Review[] = [mockReview]) => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(reviews),
    getOne: jest.fn().mockResolvedValue(reviews[0] || null),
  });

  beforeEach(async () => {
    mockPropertyRepo = {
      findOne: jest.fn().mockResolvedValue(mockProperty),
    };

    mockBookingRepo = {
      findOne: jest.fn(),
    };

    mockReviewRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((r) => ({ id: REVIEW_ID, ...r })),
      save: jest.fn().mockImplementation((r) => Promise.resolve({ id: REVIEW_ID, ...r })),
      createQueryBuilder: jest.fn().mockImplementation(() => createMockQb([mockReview])),
      manager: {
        transaction: jest.fn().mockImplementation(async (cb: (m: any) => Promise<any>) =>
          cb({
            getRepository: (entity: any) => {
              if (entity === Property) return mockPropertyRepo;
              if (entity === Review) return mockReviewRepo;
              if (entity === Booking) return mockBookingRepo;
              return {};
            },
          }),
        ),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getRepositoryToken(Review), useValue: mockReviewRepo },
        { provide: getRepositoryToken(Property), useValue: mockPropertyRepo },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  describe('Review Submission Rules', () => {
    it('prevents a host from reviewing their own property', async () => {
      await expect(
        service.create(
          PROPERTY_ID,
          { rating: 5, comment: 'Self promotion' },
          HOST_ID, // same as property.hostId
        ),
      ).rejects.toThrow('You cannot review your own property');
    });

    it('prevents a guest from reviewing without completing a stay', async () => {
      mockBookingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          PROPERTY_ID,
          { rating: 5, comment: 'I never stayed here' },
          GUEST_ID,
        ),
      ).rejects.toThrow('You can only review a property after completing a stay');
    });

    it('prevents duplicate reviews by the same guest on the same property', async () => {
      mockBookingRepo.findOne.mockResolvedValue({
        id: 'completed-booking',
        propertyId: PROPERTY_ID,
        guestId: GUEST_ID,
        status: BookingStatus.COMPLETED,
        checkOutDate: '2026-01-01',
      });
      mockReviewRepo.findOne.mockResolvedValue(mockReview); // existing review found

      await expect(
        service.create(
          PROPERTY_ID,
          { rating: 4, comment: 'Second attempt' },
          GUEST_ID,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('successfully creates a review when guest completed stay', async () => {
      mockBookingRepo.findOne.mockResolvedValue({
        id: 'completed-booking',
        propertyId: PROPERTY_ID,
        guestId: GUEST_ID,
        status: BookingStatus.COMPLETED,
        checkOutDate: '2026-01-01',
      });
      mockReviewRepo.findOne.mockResolvedValue(null); // no prior review

      const result = await service.create(
        PROPERTY_ID,
        { rating: 5, comment: 'Loved everything!' },
        GUEST_ID,
      );

      expect(result).toBeDefined();
      expect(result.rating).toBe(5);
      expect(result.comment).toBe('Exceptional stay and hospitality!');
    });
  });

  describe('Review Aggregation & Summaries', () => {
    it('computes average rating rounded to 1 decimal place and counts total reviews', async () => {
      const reviewA = { ...mockReview, id: 'r1', rating: 5 };
      const reviewB = { ...mockReview, id: 'r2', rating: 4 };
      const reviewC = { ...mockReview, id: 'r3', rating: 4 };
      mockReviewRepo.createQueryBuilder = jest.fn().mockImplementation(() => createMockQb([reviewA, reviewB, reviewC]));

      const summary = await service.findByProperty(PROPERTY_ID);

      expect(summary.totalReviews).toBe(3);
      // (5 + 4 + 4) / 3 = 13 / 3 = 4.333... -> 4.3
      expect(summary.averageRating).toBe(4.3);
      expect(summary.reviews).toHaveLength(3);
    });

    it('filters hidden reviews out of public property summaries', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockReviewRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      const summary = await service.findByProperty(PROPERTY_ID);

      expect(qb.andWhere).toHaveBeenCalledWith(
        'review.moderationStatus = :moderationStatus',
        { moderationStatus: ReviewModerationStatus.VISIBLE },
      );
      expect(summary.totalReviews).toBe(0);
      expect(summary.reviews).toEqual([]);
    });

    it('returns hasReviewed boolean correctly', async () => {
      mockReviewRepo.findOne.mockResolvedValueOnce({ id: 'rev-1' });
      const firstCheck = await service.hasReviewed(PROPERTY_ID, GUEST_ID);
      expect(firstCheck.hasReviewed).toBe(true);

      mockReviewRepo.findOne.mockResolvedValueOnce(null);
      const secondCheck = await service.hasReviewed(PROPERTY_ID, 'other-guest');
      expect(secondCheck.hasReviewed).toBe(false);
    });
  });
});
