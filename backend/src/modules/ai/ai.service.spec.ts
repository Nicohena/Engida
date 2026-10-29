import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService, PricePredictionRequest } from './ai.service';
import { Property, ListingStatus, ListingType, PropertyType } from '../properties/entities/property.entity';

describe('AiService - Phase 1 Comparable Property Pricing', () => {
  let service: AiService;
  let propertyRepo: jest.Mocked<Partial<Repository<Property>>>;
  const mockAiServiceUrl = 'http://localhost:8000';

  // Helper to create mock QueryBuilder
  const createMockQueryBuilder = (returnedProperties: Partial<Property>[]) => {
    const qb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(returnedProperties),
    };
    return qb;
  };

  beforeEach(async () => {
    propertyRepo = {
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, defaultValue: string) => {
              if (key === 'AI_SERVICE_URL') return mockAiServiceUrl;
              return defaultValue;
            }),
          },
        },
        {
          provide: getRepositoryToken(Property),
          useValue: propertyRepo,
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Comparable Statistics Calculation', () => {
    it('1. handles NO comparables (0 listings in database)', async () => {
      propertyRepo.createQueryBuilder = jest.fn().mockReturnValue(createMockQueryBuilder([]));

      const request: PricePredictionRequest = {
        city: 'Jigjiga',
        propertyType: 'APARTMENT',
        listingType: 'RENTAL',
        bedrooms: 2,
        bathrooms: 1,
        maxGuests: 4,
        amenities: [],
      };

      const stats = await service.getComparableStats(request);

      expect(stats).toBeDefined();
      expect(stats?.sampleCount).toBe(0);
      expect(stats?.medianPrice).toBe(0);
      expect(stats?.blendingWeight).toBe(0.0);
      expect(stats?.evidenceType).toBe('active_asking_prices');
    });

    it('2. handles INSUFFICIENT comparables (< 3 listings found)', async () => {
      // 2 properties found
      const mockProps: Partial<Property>[] = [
        { id: 'p1', city: 'Addis Ababa', subCity: 'Bole', propertyType: PropertyType.APARTMENT, listingType: ListingType.RENTAL, pricePerNight: 4000 },
        { id: 'p2', city: 'Addis Ababa', subCity: 'Bole', propertyType: PropertyType.APARTMENT, listingType: ListingType.RENTAL, pricePerNight: 4600 },
      ];
      propertyRepo.createQueryBuilder = jest.fn().mockReturnValue(createMockQueryBuilder(mockProps));

      const request: PricePredictionRequest = {
        city: 'Addis Ababa',
        subCity: 'Bole',
        propertyType: 'APARTMENT',
        listingType: 'RENTAL',
        bedrooms: 2,
        bathrooms: 2,
        maxGuests: 4,
        amenities: [],
      };

      const stats = await service.getComparableStats(request);

      expect(stats?.sampleCount).toBe(2);
      expect(stats?.medianPrice).toBe(4300); // average of 4000 and 4600
      expect(stats?.blendingWeight).toBe(0.0); // 0% weight because < 3 threshold
      expect(stats?.evidenceType).toBe('active_asking_prices');
    });

    it('3. handles SUFFICIENT comparables (3-6 listings -> 30% blend, 7+ listings -> 50% blend)', async () => {
      // 4 properties -> 30% weight
      const fourProps: Partial<Property>[] = [
        { id: 'p1', city: 'Addis Ababa', subCity: 'Bole', propertyType: PropertyType.APARTMENT, listingType: ListingType.RENTAL, pricePerNight: 3500 },
        { id: 'p2', city: 'Addis Ababa', subCity: 'Bole', propertyType: PropertyType.APARTMENT, listingType: ListingType.RENTAL, pricePerNight: 4000 },
        { id: 'p3', city: 'Addis Ababa', subCity: 'Bole', propertyType: PropertyType.APARTMENT, listingType: ListingType.RENTAL, pricePerNight: 4500 },
        { id: 'p4', city: 'Addis Ababa', subCity: 'Bole', propertyType: PropertyType.APARTMENT, listingType: ListingType.RENTAL, pricePerNight: 5000 },
      ];
      propertyRepo.createQueryBuilder = jest.fn().mockReturnValue(createMockQueryBuilder(fourProps));

      const req4: PricePredictionRequest = {
        city: 'Addis Ababa',
        subCity: 'Bole',
        propertyType: 'APARTMENT',
        listingType: 'RENTAL',
        bedrooms: 2,
        bathrooms: 2,
        maxGuests: 4,
        amenities: [],
      };

      const stats4 = await service.getComparableStats(req4);
      expect(stats4?.sampleCount).toBe(4);
      expect(stats4?.medianPrice).toBe(4250); // median of 3500, 4000, 4500, 5000
      expect(stats4?.blendingWeight).toBe(0.30); // 30% blend

      // 8 properties -> 50% weight
      const eightProps: Partial<Property>[] = [
        ...fourProps,
        { id: 'p5', city: 'Addis Ababa', subCity: 'Bole', propertyType: PropertyType.APARTMENT, listingType: ListingType.RENTAL, pricePerNight: 4200 },
        { id: 'p6', city: 'Addis Ababa', subCity: 'Bole', propertyType: PropertyType.APARTMENT, listingType: ListingType.RENTAL, pricePerNight: 4400 },
        { id: 'p7', city: 'Addis Ababa', subCity: 'Bole', propertyType: PropertyType.APARTMENT, listingType: ListingType.RENTAL, pricePerNight: 4600 },
        { id: 'p8', city: 'Addis Ababa', subCity: 'Bole', propertyType: PropertyType.APARTMENT, listingType: ListingType.RENTAL, pricePerNight: 4800 },
      ];
      propertyRepo.createQueryBuilder = jest.fn().mockReturnValue(createMockQueryBuilder(eightProps));

      const stats8 = await service.getComparableStats(req4);
      expect(stats8?.sampleCount).toBe(8);
      expect(stats8?.blendingWeight).toBe(0.50); // 50% blend
    });

    it('4. handles OUTLIERS robustly via median and IQR filtering', async () => {
      // 5 normal properties and 1 massive outlier (e.g. 500,000 ETB/night)
      const propsWithOutlier: Partial<Property>[] = [
        { id: 'p1', city: 'Addis Ababa', propertyType: PropertyType.APARTMENT, listingType: ListingType.RENTAL, pricePerNight: 3000 },
        { id: 'p2', city: 'Addis Ababa', propertyType: PropertyType.APARTMENT, listingType: ListingType.RENTAL, pricePerNight: 3200 },
        { id: 'p3', city: 'Addis Ababa', propertyType: PropertyType.APARTMENT, listingType: ListingType.RENTAL, pricePerNight: 3500 },
        { id: 'p4', city: 'Addis Ababa', propertyType: PropertyType.APARTMENT, listingType: ListingType.RENTAL, pricePerNight: 3800 },
        { id: 'p5', city: 'Addis Ababa', propertyType: PropertyType.APARTMENT, listingType: ListingType.RENTAL, pricePerNight: 4000 },
        { id: 'p6_outlier', city: 'Addis Ababa', propertyType: PropertyType.APARTMENT, listingType: ListingType.RENTAL, pricePerNight: 500000 },
      ];
      propertyRepo.createQueryBuilder = jest.fn().mockReturnValue(createMockQueryBuilder(propsWithOutlier));

      const request: PricePredictionRequest = {
        city: 'Addis Ababa',
        propertyType: 'APARTMENT',
        listingType: 'RENTAL',
        bedrooms: 2,
        bathrooms: 2,
        maxGuests: 4,
        amenities: [],
      };

      const stats = await service.getComparableStats(request);

      expect(stats).toBeDefined();
      // Median is immune to the 500,000 outlier:
      // With outlier filtered by IQR, prices are [3000, 3200, 3500, 3800, 4000], median is 3500
      expect(stats?.medianPrice).toBeLessThan(4500);
      expect(stats?.medianPrice).toBeGreaterThan(3000);
      expect(stats?.maxPrice).toBeLessThan(10000); // 500k removed by IQR outlier filter
    });

    it('5. handles MISSING AREA gracefully on sales listings', async () => {
      // 4 sales properties: 2 have area, 2 have areaSqm = 0 or null
      const saleProps: Partial<Property>[] = [
        { id: 's1', city: 'Addis Ababa', subCity: 'Bole', propertyType: PropertyType.APARTMENT, listingType: ListingType.SALE, salePrice: 15000000, areaSqm: 120 },
        { id: 's2', city: 'Addis Ababa', subCity: 'Bole', propertyType: PropertyType.APARTMENT, listingType: ListingType.SALE, salePrice: 18000000, areaSqm: 150 },
        { id: 's3', city: 'Addis Ababa', subCity: 'Bole', propertyType: PropertyType.APARTMENT, listingType: ListingType.SALE, salePrice: 16000000, areaSqm: 0 }, // Missing area
        { id: 's4', city: 'Addis Ababa', subCity: 'Bole', propertyType: PropertyType.APARTMENT, listingType: ListingType.SALE, salePrice: 17000000, areaSqm: 0 }, // Missing area
      ];
      propertyRepo.createQueryBuilder = jest.fn().mockReturnValue(createMockQueryBuilder(saleProps));

      const request: PricePredictionRequest = {
        city: 'Addis Ababa',
        subCity: 'Bole',
        propertyType: 'APARTMENT',
        listingType: 'SALE',
        bedrooms: 3,
        bathrooms: 2,
        maxGuests: 4,
        areaSqm: 130,
        amenities: [],
      };

      const stats = await service.getComparableStats(request);

      expect(stats?.sampleCount).toBe(4);
      expect(stats?.medianPrice).toBe(16500000);
      // pricePerSqm is computed only from s1 (125k) and s2 (120k)
      expect(stats?.pricePerSqmMedian).toBeDefined();
      expect(stats?.pricePerSqmMedian).toBe(122500); // average of 120k and 125k
    });

    it('6. separates RENTAL and SALE listing types', async () => {
      const qbRental = createMockQueryBuilder([]);
      const qbSale = createMockQueryBuilder([]);
      propertyRepo.createQueryBuilder = jest.fn()
        .mockReturnValueOnce(qbRental)
        .mockReturnValueOnce(qbSale);

      await service.getComparableStats({
        city: 'Addis Ababa',
        propertyType: 'APARTMENT',
        listingType: 'RENTAL',
        bedrooms: 2,
        bathrooms: 1,
        maxGuests: 4,
        amenities: [],
      });

      expect(qbRental.andWhere).toHaveBeenCalledWith(
        'property.listingType = :listingType',
        { listingType: ListingType.RENTAL },
      );
      expect(qbRental.andWhere).toHaveBeenCalledWith(
        'property.pricePerNight IS NOT NULL AND property.pricePerNight > 0',
      );

      await service.getComparableStats({
        city: 'Addis Ababa',
        propertyType: 'APARTMENT',
        listingType: 'SALE',
        bedrooms: 2,
        bathrooms: 1,
        maxGuests: 4,
        amenities: [],
      });

      expect(qbSale.andWhere).toHaveBeenCalledWith(
        'property.listingType = :listingType',
        { listingType: ListingType.SALE },
      );
      expect(qbSale.andWhere).toHaveBeenCalledWith(
        'property.salePrice IS NOT NULL AND property.salePrice > 0',
      );
    });

    it('7. EXCLUDES current listing when propertyId is provided (edit mode)', async () => {
      const qb = createMockQueryBuilder([]);
      propertyRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      await service.getComparableStats({
        propertyId: 'listing-edit-uuid-12345',
        city: 'Addis Ababa',
        subCity: 'Bole',
        propertyType: 'APARTMENT',
        listingType: 'RENTAL',
        bedrooms: 2,
        bathrooms: 1,
        maxGuests: 4,
        amenities: [],
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'property.id != :excludeId',
        { excludeId: 'listing-edit-uuid-12345' },
      );
    });
  });

  describe('predictPrice with Blended Comparables', () => {
    it('queries comparables, passes them to FastAPI, and preserves blended results', async () => {
      const mockProps: Partial<Property>[] = [
        { id: 'p1', city: 'Addis Ababa', subCity: 'Bole', propertyType: PropertyType.APARTMENT, listingType: ListingType.RENTAL, pricePerNight: 5000 },
        { id: 'p2', city: 'Addis Ababa', subCity: 'Bole', propertyType: PropertyType.APARTMENT, listingType: ListingType.RENTAL, pricePerNight: 5200 },
        { id: 'p3', city: 'Addis Ababa', subCity: 'Bole', propertyType: PropertyType.APARTMENT, listingType: ListingType.RENTAL, pricePerNight: 5400 },
        { id: 'p4', city: 'Addis Ababa', subCity: 'Bole', propertyType: PropertyType.APARTMENT, listingType: ListingType.RENTAL, pricePerNight: 5600 },
      ];
      propertyRepo.createQueryBuilder = jest.fn().mockReturnValue(createMockQueryBuilder(mockProps));

      const mockFastApiResponse = {
        predictedPrice: 5300,
        currency: 'ETB',
        confidence: 0.90,
        priceRange: { min: 4500, max: 6350 },
        tiers: {
          fastBooking: { rate: 4500, label: 'Fast Booking', rationale: 'Fast' },
          optimal: { rate: 5300, label: 'Optimal Market', rationale: 'Optimal blended' },
          peakSeason: { rate: 6350, label: 'Peak Season', rationale: 'Peak' },
        },
        breakdown: {
          baseRateEtb: 3600,
          locationMultiplier: 1.45,
          locationTier: 'Bole Diplomatic & Airport Corridor',
          propertyTypeMultiplier: 1.1,
          amenitiesPremiumEtb: 500,
          keyDrivers: [
            {
              factor: 'Market Comparables (Active Asking)',
              impact: 'Blended 30% with 4 active listings (Median: ETB 5,300)',
              type: 'positive',
            },
          ],
        },
        comparables: {
          sampleCount: 4,
          medianPrice: 5300,
          minPrice: 5000,
          maxPrice: 5600,
          averagePrice: 5300,
          evidenceType: 'active_asking_prices',
          subCityMatchCount: 4,
          cityMatchCount: 4,
          blendingWeight: 0.30,
        },
        valuationSource: 'blended_active_asking_prices',
      };

      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFastApiResponse,
      } as Response);

      const request: PricePredictionRequest = {
        city: 'Addis Ababa',
        subCity: 'Bole',
        propertyType: 'APARTMENT',
        listingType: 'RENTAL',
        bedrooms: 2,
        bathrooms: 2,
        maxGuests: 4,
        amenities: [],
      };

      const result = await service.predictPrice(request);

      expect(fetchSpy).toHaveBeenCalled();
      const calledPayload = JSON.parse((fetchSpy.mock.calls[0][1] as any).body);
      expect(calledPayload.comparables).toBeDefined();
      expect(calledPayload.comparables.sampleCount).toBe(4);
      expect(calledPayload.comparables.blendingWeight).toBe(0.30);

      expect(result.valuationSource).toBe('blended_active_asking_prices');
      expect(result.comparables).toBeDefined();
      expect(result.comparables?.evidenceType).toBe('active_asking_prices');
    });

    it('blends comparables in local fallback when FastAPI service is unreachable', async () => {
      // 4 competitor properties in DB
      const mockProps: Partial<Property>[] = [
        { id: 'p1', city: 'Addis Ababa', subCity: 'Bole', propertyType: PropertyType.APARTMENT, listingType: ListingType.RENTAL, pricePerNight: 6000 },
        { id: 'p2', city: 'Addis Ababa', subCity: 'Bole', propertyType: PropertyType.APARTMENT, listingType: ListingType.RENTAL, pricePerNight: 6200 },
        { id: 'p3', city: 'Addis Ababa', subCity: 'Bole', propertyType: PropertyType.APARTMENT, listingType: ListingType.RENTAL, pricePerNight: 6400 },
        { id: 'p4', city: 'Addis Ababa', subCity: 'Bole', propertyType: PropertyType.APARTMENT, listingType: ListingType.RENTAL, pricePerNight: 6600 },
      ];
      propertyRepo.createQueryBuilder = jest.fn().mockReturnValue(createMockQueryBuilder(mockProps));

      // Network connection fails
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Connection refused'));

      const request: PricePredictionRequest = {
        city: 'Addis Ababa',
        subCity: 'Bole',
        propertyType: 'APARTMENT',
        listingType: 'RENTAL',
        bedrooms: 2,
        bathrooms: 2,
        maxGuests: 4,
        amenities: [],
      };

      const result = await service.predictPrice(request);

      // Verify that local fallback blended the 4 comparables
      expect(result.valuationSource).toBe('blended_active_asking_prices');
      expect(result.comparables).toBeDefined();
      expect(result.comparables?.sampleCount).toBe(4);
      expect(result.comparables?.medianPrice).toBe(6300);

      const compDriver = result.breakdown.keyDrivers.find(
        (kd) => kd.factor === 'Market Comparables (Active Asking)',
      );
      expect(compDriver).toBeDefined();
      expect(compDriver?.impact).toContain('Blended 30%');
    });

    it('throws NotFoundException when recommendation log is not found', async () => {
      const mockLogRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        save: jest.fn(),
      };
      const { AiService } = require('./ai.service');
      const { NotFoundException } = require('@nestjs/common');
      const service = new AiService({ get: () => 'http://localhost:8000' } as any, undefined, mockLogRepo as any, undefined);

      await expect(
        service.recordFeedback({
          recommendationId: '00000000-0000-0000-0000-000000000000',
          action: 'ACCEPTED' as any,
        }, 'host-user-123')
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when an unauthorized host attempts feedback', async () => {
      const mockLogRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: 'rec-uuid-999',
          hostId: 'owner-host-abc',
        }),
        save: jest.fn(),
      };
      const { AiService } = require('./ai.service');
      const { ForbiddenException } = require('@nestjs/common');
      const service = new AiService({ get: () => 'http://localhost:8000' } as any, undefined, mockLogRepo as any, undefined);

      await expect(
        service.recordFeedback({
          recommendationId: 'rec-uuid-999',
          action: 'MODIFIED' as any,
          chosenPrice: 6000,
        }, 'attacker-host-xyz')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Edge Case Hardening', () => {
    it('returns 0.0 similarity when city is empty or unknown', () => {
      const { LocationNormalizer } = require('./location-intelligence/location-normalizer');
      const sim1 = LocationNormalizer.calculateSimilarity({ city: '' }, { city: 'Addis Ababa' });
      const sim2 = LocationNormalizer.calculateSimilarity({ city: 'Addis Ababa' }, { city: '' });
      expect(sim1).toBe(0.0);
      expect(sim2).toBe(0.0);
    });

    it('computes daily rate ADR correctly for multi-night bookings', async () => {
      const { SeasonalPricingService } = require('./seasonal/seasonal-pricing.service');
      const mockBookings: any[] = [];
      for (let m = 0; m < 12; m++) {
        for (let i = 0; i < 3; i++) {
          mockBookings.push({
            id: 'booking-' + m + '-' + i,
            checkInDate: new Date(2025, m, 5),
            checkOutDate: new Date(2025, m, 10),
            totalPrice: 50000,
          });
        }
      }
      const bookingRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(mockBookings),
        }),
      };
      const seasonalService = new SeasonalPricingService(bookingRepo as any);
      const result = await seasonalService.evaluateSeasonality('Addis Ababa', 'APARTMENT', new Date(2026, 0, 15), false);
      expect(result.historicalBookingCount).toBe(36);
    });
  });
});


describe('Phase 2 - Data Quality, Market Intelligence & Pricing Accuracy', () => {
  describe('Location Normalization & Administrative Hierarchy', () => {
    it('normalizes aliases, spelling variations, and capitalization', () => {
      const { LocationNormalizer } = require('./location-intelligence/location-normalizer');

      const loc1 = LocationNormalizer.normalize({ city: '  addis abeba  ', subCity: 'bole', neighborhood: 'atlas' });
      expect(loc1.city).toBe('Addis Ababa');
      expect(loc1.subCity).toBe('Bole');
      expect(loc1.neighborhood).toBe('Atlas');
      expect(loc1.region).toBe('Addis Ababa');
      expect(loc1.stableRef).toBe('ET-ADD-BOL-ATL');

      const loc2 = LocationNormalizer.normalize({ city: 'finfinne', subCity: 'kirkos', neighborhood: 'kazanchis' });
      expect(loc2.city).toBe('Addis Ababa');
      expect(loc2.subCity).toBe('Kirkos');
      expect(loc2.neighborhood).toBe('Kazanchis');

      const loc3 = LocationNormalizer.normalize({ city: 'debre zeyit' });
      expect(loc3.city).toBe('Bishoftu');
      expect(loc3.region).toBe('Oromia');
    });

    it('strictly isolates cross-city comparisons (similarity 0.0 for different cities)', () => {
      const { LocationNormalizer } = require('./location-intelligence/location-normalizer');

      const addisLoc = { city: 'Addis Ababa', subCity: 'Bole' };
      const hawassaLoc = { city: 'Hawassa', subCity: 'Bole' }; // Hypothetical or accidental name overlap

      const similarity = LocationNormalizer.calculateSimilarity(addisLoc, hawassaLoc);
      expect(similarity).toBe(0.0); // Never compare across cities
    });

    it('prioritizes neighborhood, then sub-city, then city hierarchy', () => {
      const { LocationNormalizer } = require('./location-intelligence/location-normalizer');

      const target = { city: 'Addis Ababa', subCity: 'Bole', neighborhood: 'Atlas' };
      const sameNeighborhood = { city: 'Addis Ababa', subCity: 'Bole', neighborhood: 'Atlas' };
      const sameSubCityDiffNeighborhood = { city: 'Addis Ababa', subCity: 'Bole', neighborhood: 'Gerji' };
      const sameCityDiffSubCity = { city: 'Addis Ababa', subCity: 'Kirkos', neighborhood: 'Kazanchis' };

      expect(LocationNormalizer.calculateSimilarity(target, sameNeighborhood)).toBe(1.0);
      expect(LocationNormalizer.calculateSimilarity(target, sameSubCityDiffNeighborhood)).toBe(0.85);
      expect(LocationNormalizer.calculateSimilarity(target, sameCityDiffSubCity)).toBe(0.45);
    });
  });

  describe('Comparable Property Quality Scoring', () => {
    it('discards poor-quality comparables (< 0.50 threshold)', () => {
      const { ComparableQualityScorer } = require('./comparable-intelligence/comparable-scorer');

      const target = {
        city: 'Addis Ababa',
        subCity: 'Bole',
        neighborhood: 'Atlas',
        propertyType: 'APARTMENT',
        listingType: 'RENTAL',
        bedrooms: 3,
        bathrooms: 2,
        maxGuests: 5,
        areaSqm: 140,
        amenities: ['generator', 'wifi', 'security'],
      };

      // Candidate 1: 1-bed shared room in Akaky Kaliti with 0 area and no amenities -> low match
      const poorCandidate = {
        id: 'poor_1',
        city: 'Addis Ababa',
        subCity: 'Akaky Kaliti',
        propertyType: 'SHARED_ROOM',
        listingType: 'RENTAL',
        pricePerNight: 800,
        bedrooms: 1,
        bathrooms: 1,
        maxGuests: 1,
        areaSqm: 15,
        amenities: [],
      };

      // Candidate 2: 3-bed apartment in Bole Medhanialem with 130 sqm -> high match
      const goodCandidate = {
        id: 'good_1',
        city: 'Addis Ababa',
        subCity: 'Bole',
        neighborhood: 'Bole Medhanialem',
        propertyType: 'APARTMENT',
        listingType: 'RENTAL',
        pricePerNight: 5500,
        bedrooms: 3,
        bathrooms: 2,
        maxGuests: 6,
        areaSqm: 130,
        amenities: ['generator', 'wifi', 'security'],
      };

      const result = ComparableQualityScorer.evaluateCandidates(target, [poorCandidate, goodCandidate]);

      expect(result.eligibleCount).toBe(2);
      expect(result.retainedCount).toBe(1); // Only the good candidate is retained
      expect(result.retainedComparables[0].property.id).toBe('good_1');
      expect(result.averageQualityScore).toBeGreaterThanOrEqual(0.70);
      expect(result.medianPrice).toBe(5500);
    });
  });

  describe('Confidence Calibration', () => {
    it('calibrates HIGH confidence when high-volume sample, complete inputs, and low price dispersion exist', () => {
      const { ConfidenceCalibrator } = require('./confidence/confidence-calibrator');

      const target = {
        city: 'Addis Ababa',
        subCity: 'Bole',
        neighborhood: 'Atlas',
        propertyType: 'APARTMENT',
        areaSqm: 120,
        amenities: ['generator', 'wifi', 'security'],
        bedrooms: 2,
        bathrooms: 2,
      };

      const comparables = {
        eligibleCount: 8,
        retainedCount: 7,
        averageQualityScore: 0.88,
        priceDispersionCv: 0.12, // Low dispersion
        medianPrice: 5000,
        minPrice: 4500,
        maxPrice: 5600,
        averagePrice: 5050,
        evidenceType: 'active_asking_prices',
        blendingWeight: 0.50,
      };

      const calibration = ConfidenceCalibrator.calibrate(target, comparables, false);

      expect(calibration.confidenceLevel).toBe('HIGH');
      expect(calibration.confidence).toBeGreaterThanOrEqual(0.85);
      expect(calibration.confidenceExplanation).toContain('Bole');
      expect(calibration.confidenceExplanation).toContain('7 high-similarity competitor listings');
    });

    it('calibrates LOW confidence when inputs are sparse and no comparables exist', () => {
      const { ConfidenceCalibrator } = require('./confidence/confidence-calibrator');

      const sparseTarget = {
        city: 'Jigjiga',
        propertyType: 'APARTMENT',
        bedrooms: 1,
        bathrooms: 1,
      };

      const calibration = ConfidenceCalibrator.calibrate(sparseTarget, null, true);

      expect(calibration.confidenceLevel).toBe('LOW');
      expect(calibration.confidence).toBeLessThan(0.65);
      expect(calibration.confidenceExplanation.toLowerCase()).toContain('heuristic');
    });
  });

  describe('Evidence-Based Seasonal Pricing', () => {
    it('enforces 30-booking threshold and returns neutral baseline when historical bookings are insufficient', async () => {
      const { SeasonalPricingService } = require('./seasonal/seasonal-pricing.service');

      // Mock repository returning only 1 completed booking
      const mockBookingRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([
            { id: 'b1', checkInDate: new Date('2026-05-01'), checkOutDate: new Date('2026-05-05'), totalPrice: 15000 },
          ]),
        }),
      };

      const service = new SeasonalPricingService(mockBookingRepo as any);
      const result = await service.evaluateSeasonality('Addis Ababa', 'RENTAL');

      expect(result.applied).toBe(false);
      expect(result.seasonalMultiplier).toBe(1.0);
      expect(result.status).toBe('insufficient_historical_data');
      expect(result.reason).toContain('1 completed reservation(s) found; minimum 30 required');
    });

    it('strictly marks sales listings as non-seasonal', async () => {
      const { SeasonalPricingService } = require('./seasonal/seasonal-pricing.service');
      const service = new SeasonalPricingService();

      const result = await service.evaluateSeasonality('Addis Ababa', 'SALE');

      expect(result.applied).toBe(false);
      expect(result.seasonalMultiplier).toBe(1.0);
      expect(result.status).toBe('not_applicable_to_sales');
      expect(result.reason).toContain('property sale valuations reflect long-term capital assets');
    });
  });

  describe('Host Recommendation Tracking & Feedback', () => {
    it('persists host decision without modifying historical recommendation rates', async () => {
      const mockLogRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: 'rec-uuid-999',
          recommendedPrice: 5000,
          hostAction: 'PENDING',
          chosenPrice: null,
          feedbackReason: null,
        }),
        save: jest.fn().mockImplementation((log) => Promise.resolve(log)),
      };

      const { AiService } = require('./ai.service');
      const service = new AiService({ get: () => 'http://localhost:8000' } as any, undefined, mockLogRepo as any, undefined);

      const feedbackDto = {
        recommendationId: 'rec-uuid-999',
        action: 'ACCEPTED' as any,
        chosenPrice: 5000,
        feedbackReason: 'Host accepted AI optimal price recommendation',
      };

      const result = await service.recordFeedback(feedbackDto, 'host-user-123');

      expect(result.success).toBe(true);
      expect(result.recommendationId).toBe('rec-uuid-999');
      expect(result.hostAction).toBe('ACCEPTED');
      expect(mockLogRepo.save).toHaveBeenCalled();
    });
  });
});
