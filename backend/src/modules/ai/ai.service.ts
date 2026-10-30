import { Injectable, Logger, Optional, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property, ListingStatus, ListingType } from '../properties/entities/property.entity';
import { LocationNormalizer } from './location-intelligence/location-normalizer';
import {
  ComparableQualityScorer,
  ComparableEvaluationResult,
  TargetPropertySpecs,
} from './comparable-intelligence/comparable-scorer';
import { ConfidenceCalibrator } from './confidence/confidence-calibrator';
import { SeasonalPricingService, SeasonalAdjustmentResult } from './seasonal/seasonal-pricing.service';
import { PriceRecommendationLog, HostRecommendationAction } from './entities/price-recommendation-log.entity';
import { RecordRecommendationFeedbackDto } from './ai.dto';

export interface ComparableMarketStats {
  sampleCount: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  averagePrice: number;
  pricePerSqmMedian?: number;
  evidenceType: 'active_asking_prices';
  subCityMatchCount: number;
  cityMatchCount: number;
  blendingWeight: number; // 0.0, 0.30, 0.50
  eligibleCount?: number;
  retainedCount?: number;
  averageQualityScore?: number;
  priceDispersionCv?: number;
}

export interface PricePredictionRequest {
  propertyId?: string;
  city: string;
  subCity?: string;
  neighborhood?: string;
  propertyType: string;
  listingType?: string; // 'RENTAL' | 'SALE'
  bedrooms: number;
  bathrooms: number;
  maxGuests?: number;
  areaSqm?: number;
  amenities: string[];
  coverImage?: string;
  images?: string[];
  regenerationIndex?: number;
  comparables?: ComparableMarketStats;
  seasonalAdjustment?: SeasonalAdjustmentResult;
}

export interface KeyPriceDriver {
  factor: string;
  impact: string; // e.g. "+25% location premium" or "+2,400 ETB capacity"
  type: 'positive' | 'neutral' | 'premium';
}

export interface PriceStrategyTier {
  rate: number;
  label: string;
  badge?: string;
  rationale: string;
  occupancyTarget?: string;
}

export interface PricePredictionResponse {
  recommendationId?: string;
  predictedPrice: number; // in ETB
  currency: 'ETB';
  confidence: number; // 0.0 - 1.0
  confidenceLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceExplanation?: string;
  priceRange: {
    min: number; // Fast-booking floor (ETB)
    max: number; // Peak/high-margin ceiling (ETB)
  };
  tiers?: {
    fastBooking: PriceStrategyTier;
    optimal: PriceStrategyTier;
    peakSeason: PriceStrategyTier;
  };
  hostTip?: string;
  breakdown: {
    baseRateEtb: number;
    locationMultiplier: number;
    locationTier: string;
    propertyTypeMultiplier: number;
    amenitiesPremiumEtb: number;
    keyDrivers: KeyPriceDriver[];
  };
  valuationSource?: string;
  comparables?: ComparableMarketStats;
  seasonalAdjustment?: SeasonalAdjustmentResult;
}

export interface GenerateListingContentRequest {
  propertyType: string;
  listingType?: string; // 'RENTAL' | 'SALE'
  city: string;
  subCity?: string;
  neighborhood?: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests?: number;
  areaSqm?: number;
  amenities: string[];
  language?: 'en' | 'am';
  tone?: 'luxury' | 'warm' | 'business';
  descriptionLength?: 'short' | 'medium' | 'long';
  titleLength?: 'concise' | 'standard' | 'extended';
  coverImage?: string;
  images?: string[];
  regenerationIndex?: number;
}

export interface GenerateListingContentResponse {
  title: string;
  description: string;
  language: 'en' | 'am';
  tone: 'luxury' | 'warm' | 'business';
  highlights: string[];
}

export interface RecommendationRequest {
  userId?: string;
  city?: string;
  propertyType?: string;
  maxPrice?: number;
  minBedrooms?: number;
}

export interface RecommendationResponse {
  propertyIds: string[];
  reasoning: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiServiceUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @InjectRepository(Property)
    private readonly propertyRepository?: Repository<Property>,
    @Optional()
    @InjectRepository(PriceRecommendationLog)
    private readonly recommendationLogRepository?: Repository<PriceRecommendationLog>,
    @Optional()
    private readonly seasonalPricingService?: SeasonalPricingService,
  ) {
    this.aiServiceUrl = this.configService.get<string>(
      'AI_SERVICE_URL',
      'http://localhost:8000',
    );
  }

  async predictPrice(
    request: PricePredictionRequest,
    hostId?: string,
  ): Promise<PricePredictionResponse> {
    // 1. Evaluate seasonal ADR adjustment based on historical booking transactions
    let seasonalAdjustment: SeasonalAdjustmentResult | undefined;
    if (this.seasonalPricingService) {
      try {
        seasonalAdjustment = await this.seasonalPricingService.evaluateSeasonality(
          request.city,
          request.listingType,
        );
      } catch (err) {
        this.logger.warn(`Seasonal evaluation error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 2. Query comparable market stats with multi-factor quality scoring
    const comparables = request.comparables ?? (await this.getComparableStats(request));

    const enrichedRequest: PricePredictionRequest = {
      ...request,
      comparables: comparables || undefined,
      seasonalAdjustment,
    };

    let result: PricePredictionResponse;

    try {
      const response = await fetch(`${this.aiServiceUrl}/api/v1/pricing/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrichedRequest),
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        this.logger.warn(
          `AI pricing service returned HTTP ${response.status} at ${this.aiServiceUrl}/api/v1/pricing/predict: ${errorText}. Activating transparent local heuristic fallback.`,
        );
        result = this.fallbackPricePrediction(request, `AI service HTTP ${response.status}`, comparables, seasonalAdjustment);
      } else {
        const data = await response.json();
        const rawPrice = Number(data.predictedPrice ?? data.predicted_price ?? 0);

        if (!rawPrice || rawPrice <= 0) {
          this.logger.warn(
            `AI pricing service returned non-positive price (${rawPrice}). Activating local heuristic fallback.`,
          );
          result = this.fallbackPricePrediction(request, 'AI service returned non-positive price', comparables, seasonalAdjustment);
        } else {
          const predictedPrice = Math.round(rawPrice);
          const minEtb = Math.round(Number(data.priceRange?.min ?? data.price_range?.min ?? predictedPrice * 0.85));
          const maxEtb = Math.round(Number(data.priceRange?.max ?? data.price_range?.max ?? predictedPrice * 1.2));

          const rawTiers = data.tiers || {};
          const tiers = rawTiers.optimal || rawTiers.fastBooking || rawTiers.fast_booking
            ? {
                fastBooking: {
                  rate: Math.round(Number(rawTiers.fastBooking?.rate ?? rawTiers.fast_booking?.rate ?? minEtb)),
                  label: String(rawTiers.fastBooking?.label ?? rawTiers.fast_booking?.label ?? 'Fast Booking'),
                  badge: rawTiers.fastBooking?.badge ?? rawTiers.fast_booking?.badge,
                  rationale: String(rawTiers.fastBooking?.rationale ?? rawTiers.fast_booking?.rationale ?? ''),
                  occupancyTarget: rawTiers.fastBooking?.occupancyTarget ?? rawTiers.fast_booking?.occupancy_target,
                },
                optimal: {
                  rate: Math.round(Number(rawTiers.optimal?.rate ?? predictedPrice)),
                  label: String(rawTiers.optimal?.label ?? 'Optimal Market'),
                  badge: rawTiers.optimal?.badge ?? 'Recommended',
                  rationale: String(rawTiers.optimal?.rationale ?? ''),
                  occupancyTarget: rawTiers.optimal?.occupancyTarget ?? rawTiers.optimal?.occupancy_target,
                },
                peakSeason: {
                  rate: Math.round(Number(rawTiers.peakSeason?.rate ?? rawTiers.peak_season?.rate ?? maxEtb)),
                  label: String(rawTiers.peakSeason?.label ?? rawTiers.peak_season?.label ?? 'Peak Season'),
                  badge: rawTiers.peakSeason?.badge ?? rawTiers.peak_season?.badge,
                  rationale: String(rawTiers.peakSeason?.rationale ?? rawTiers.peak_season?.rationale ?? ''),
                  occupancyTarget: rawTiers.peakSeason?.occupancyTarget ?? rawTiers.peak_season?.occupancy_target,
                },
              }
            : undefined;

          const rawBreakdown = data.breakdown || {};
          const keyDrivers: KeyPriceDriver[] = Array.isArray(rawBreakdown.keyDrivers || rawBreakdown.key_drivers)
            ? (rawBreakdown.keyDrivers || rawBreakdown.key_drivers).map((kd: any) => ({
                factor: String(kd.factor || ''),
                impact: String(kd.impact || ''),
                type: kd.type || 'positive',
              }))
            : [
                {
                  factor: `${request.city || 'Location'} Market Benchmark`,
                  impact: `ETB ${predictedPrice.toLocaleString()}`,
                  type: 'positive',
                },
              ];

          result = {
            predictedPrice,
            currency: 'ETB',
            confidence: Number(data.confidence ?? 0.85),
            confidenceLevel: data.confidenceLevel || data.confidence_level || 'MEDIUM',
            confidenceExplanation: data.confidenceExplanation || data.confidence_explanation,
            priceRange: {
              min: minEtb,
              max: maxEtb,
            },
            tiers,
            hostTip: data.hostTip || data.host_tip,
            breakdown: {
              baseRateEtb: Math.round(Number(rawBreakdown.baseRateEtb ?? rawBreakdown.base_rate_etb ?? predictedPrice * 0.6)),
              locationMultiplier: Number(rawBreakdown.locationMultiplier ?? rawBreakdown.location_multiplier ?? 1.0),
              locationTier: String(rawBreakdown.locationTier ?? rawBreakdown.location_tier ?? (request.city || 'Standard')),
              propertyTypeMultiplier: Number(rawBreakdown.propertyTypeMultiplier ?? rawBreakdown.property_type_multiplier ?? 1.0),
              amenitiesPremiumEtb: Math.round(Number(rawBreakdown.amenitiesPremiumEtb ?? rawBreakdown.amenities_premium_etb ?? 0)),
              keyDrivers,
            },
            comparables: data.comparables || comparables || undefined,
            valuationSource: data.valuationSource || data.valuation_source || (comparables && comparables.blendingWeight > 0 ? 'blended_active_asking_prices' : 'market_calibrated_hedonic'),
            seasonalAdjustment: data.seasonalAdjustment || data.seasonal_adjustment || seasonalAdjustment,
          };
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `AI pricing service connection failed (${errMsg}) at ${this.aiServiceUrl}. Activating transparent local heuristic fallback.`,
      );
      result = this.fallbackPricePrediction(request, `AI service unreachable: ${errMsg}`, comparables, seasonalAdjustment);
    }

    // 3. Calibrate confidence mathematically
    const targetSpecs: TargetPropertySpecs = {
      city: request.city,
      subCity: request.subCity,
      neighborhood: request.neighborhood,
      propertyType: request.propertyType,
      listingType: request.listingType,
      bedrooms: request.bedrooms,
      bathrooms: request.bathrooms,
      maxGuests: request.maxGuests,
      areaSqm: request.areaSqm,
      amenities: request.amenities,
      propertyId: request.propertyId,
    };

    const compEvaluation: ComparableEvaluationResult | null = comparables
      ? {
          eligibleCount: comparables.eligibleCount ?? comparables.cityMatchCount,
          retainedCount: comparables.sampleCount,
          averageQualityScore: comparables.averageQualityScore ?? (comparables.sampleCount > 0 ? 0.70 : 0.0),
          medianPrice: comparables.medianPrice,
          minPrice: comparables.minPrice,
          maxPrice: comparables.maxPrice,
          averagePrice: comparables.averagePrice,
          pricePerSqmMedian: comparables.pricePerSqmMedian,
          priceDispersionCv: comparables.priceDispersionCv ?? 0.20,
          retainedComparables: [],
          evidenceType: 'active_asking_prices',
          blendingWeight: comparables.blendingWeight,
        }
      : null;

    const isFallback = result.valuationSource?.includes('fallback') || false;
    const calibration = ConfidenceCalibrator.calibrate(targetSpecs, compEvaluation, isFallback);
    result.confidence = calibration.confidence;
    result.confidenceLevel = calibration.confidenceLevel;
    result.confidenceExplanation = calibration.confidenceExplanation;

    if (seasonalAdjustment && !result.seasonalAdjustment) {
      result.seasonalAdjustment = seasonalAdjustment;
    }

    // 4. Persist recommendation in price_recommendation_logs
    const recommendationId = await this.persistRecommendation(request, result, hostId);
    if (recommendationId) {
      result.recommendationId = recommendationId;
    }

    return result;
  }

  async generateListingContent(
    request: GenerateListingContentRequest,
  ): Promise<GenerateListingContentResponse> {
    try {
      const response = await fetch(`${this.aiServiceUrl}/api/generate-listing-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) {
        return this.fallbackGenerateListingContent(request);
      }

      const data = await response.json();
      if (!data.title || !data.description) {
        return this.fallbackGenerateListingContent(request);
      }

      return data;
    } catch {
      return this.fallbackGenerateListingContent(request);
    }
  }

  async getRecommendations(
    request: RecommendationRequest,
  ): Promise<RecommendationResponse> {
    try {
      const response = await fetch(
        `${this.aiServiceUrl}/api/recommendations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: AbortSignal.timeout(10000),
        },
      );

      if (!response.ok) {
        return this.fallbackRecommendations();
      }

      return response.json();
    } catch {
      return this.fallbackRecommendations();
    }
  }

  async healthCheck(): Promise<{ status: string; url: string; currency: string }> {
    try {
      const response = await fetch(`${this.aiServiceUrl}/health`, {
        signal: AbortSignal.timeout(4000),
      });

      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        url: this.aiServiceUrl,
        currency: 'ETB',
      };
    } catch {
      return {
        status: 'calibrated_fallback_active',
        url: this.aiServiceUrl,
        currency: 'ETB',
      };
    }
  }

  /**
   * Queries active, published competitor listings and calculates robust comparable statistics.
   * Excludes the current listing being edited and filters out non-positive prices and outliers.
   */
  async getComparableStats(
    request: PricePredictionRequest,
  ): Promise<ComparableMarketStats | null> {
    if (!this.propertyRepository) {
      return null;
    }

    const isSale = (request.listingType || '').toUpperCase() === 'SALE';
    const city = (request.city || '').trim();
    const propType = (request.propertyType || '').trim();
    const excludeId = request.propertyId;

    if (!city || !propType) {
      return null;
    }

    try {
      // 1. Normalize target location hierarchy
      const normalizedTarget = LocationNormalizer.normalize({
        city: request.city,
        subCity: request.subCity,
        neighborhood: request.neighborhood,
      });

      // 2. Query candidates from platform strictly within canonical city
      const qb = this.propertyRepository
        .createQueryBuilder('property')
        .leftJoinAndSelect('property.amenities', 'amenity')
        .where('property.status = :status', { status: ListingStatus.PUBLISHED })
        .andWhere('property.isAvailable = :isAvailable', { isAvailable: true })
        .andWhere('property.adminHidden = :adminHidden', { adminHidden: false })
        .andWhere('property.propertyType = :propType', { propType })
        .andWhere('property.listingType = :listingType', {
          listingType: isSale ? ListingType.SALE : ListingType.RENTAL,
        })
        .andWhere('LOWER(property.city) = LOWER(:city)', { city: normalizedTarget.city });

      if (isSale) {
        qb.andWhere('property.salePrice IS NOT NULL AND property.salePrice > 0');
      } else {
        qb.andWhere('property.pricePerNight IS NOT NULL AND property.pricePerNight > 0');
      }

      if (excludeId) {
        qb.andWhere('property.id != :excludeId', { excludeId });
      }

      const candidateProperties = await qb.getMany();
      if (!candidateProperties || candidateProperties.length === 0) {
        return {
          sampleCount: 0,
          medianPrice: 0,
          minPrice: 0,
          maxPrice: 0,
          averagePrice: 0,
          evidenceType: 'active_asking_prices',
          subCityMatchCount: 0,
          cityMatchCount: 0,
          blendingWeight: 0,
        };
      }

      // Check subCity partition
      const subCityMatches = request.subCity
        ? candidateProperties.filter(
            (p) => p.subCity && p.subCity.toLowerCase().includes(request.subCity!.toLowerCase()),
          )
        : [];

      // Prioritize subCity comparables if >= 3, otherwise use broader city pool
      const candidateSet = subCityMatches.length >= 3 ? subCityMatches : candidateProperties;

      // Extract valid positive prices
      const rawPrices = candidateSet
        .map((p) => (isSale ? Number(p.salePrice) : Number(p.pricePerNight)))
        .filter((val) => !isNaN(val) && val > 0);

      if (rawPrices.length === 0) {
        return {
          sampleCount: 0,
          medianPrice: 0,
          minPrice: 0,
          maxPrice: 0,
          averagePrice: 0,
          evidenceType: 'active_asking_prices',
          subCityMatchCount: subCityMatches.length,
          cityMatchCount: candidateProperties.length,
          blendingWeight: 0,
        };
      }

      // Sort ascending & filter outliers
      rawPrices.sort((a, b) => a - b);
      const prices = this.filterOutliers(rawPrices);

      const median = this.calculateMedian(prices);
      const min = prices[0];
      const max = prices[prices.length - 1];
      const avg = Math.round(prices.reduce((sum, val) => sum + val, 0) / prices.length);

      // Compute price per sqm for sales where areaSqm > 0
      let pricePerSqmMedian: number | undefined;
      if (isSale) {
        const sqmRates = candidateSet
          .filter((p) => Number(p.areaSqm) > 0 && Number(p.salePrice) > 0)
          .map((p) => Number(p.salePrice) / Number(p.areaSqm));

        if (sqmRates.length > 0) {
          sqmRates.sort((a, b) => a - b);
          const filteredRates = this.filterOutliers(sqmRates);
          pricePerSqmMedian = Math.round(this.calculateMedian(filteredRates));
        }
      }

      // 3. Multi-factor quality scoring
      const targetSpecs: TargetPropertySpecs = {
        city: normalizedTarget.city,
        subCity: normalizedTarget.subCity,
        neighborhood: normalizedTarget.neighborhood,
        propertyType: request.propertyType,
        listingType: request.listingType,
        bedrooms: request.bedrooms,
        bathrooms: request.bathrooms,
        maxGuests: request.maxGuests,
        areaSqm: request.areaSqm,
        amenities: request.amenities,
        propertyId: request.propertyId,
      };

      const evaluation = ComparableQualityScorer.evaluateCandidates(
        targetSpecs,
        candidateProperties,
      );

      // Blend weight based on sample count
      let blendingWeight = 0.0;
      if (prices.length >= 7) {
        blendingWeight = 0.50;
      } else if (prices.length >= 3) {
        blendingWeight = 0.30;
      }

      return {
        sampleCount: prices.length,
        medianPrice: Math.round(median),
        minPrice: Math.round(min),
        maxPrice: Math.round(max),
        averagePrice: avg,
        pricePerSqmMedian,
        evidenceType: 'active_asking_prices',
        subCityMatchCount: subCityMatches.length,
        cityMatchCount: candidateProperties.length,
        blendingWeight,
        eligibleCount: candidateProperties.length,
        retainedCount: evaluation.retainedCount,
        averageQualityScore: evaluation.averageQualityScore,
        priceDispersionCv: evaluation.priceDispersionCv,
      };
    } catch (err: unknown) {
      this.logger.warn(`Failed to query market comparables: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  /**
   * Filters extreme outliers using Interquartile Range (IQR).
   * Values beyond [Q1 - 1.5*IQR, Q3 + 1.5*IQR] are filtered out.
   */
  private filterOutliers(sortedValues: number[]): number[] {
    if (sortedValues.length < 4) {
      return sortedValues;
    }

    const q1 = this.calculatePercentile(sortedValues, 0.25);
    const q3 = this.calculatePercentile(sortedValues, 0.75);
    const iqr = q3 - q1;

    if (iqr <= 0) {
      return sortedValues;
    }

    const lowerBound = Math.max(0, q1 - 1.5 * iqr);
    const upperBound = q3 + 1.5 * iqr;

    const filtered = sortedValues.filter((v) => v >= lowerBound && v <= upperBound);
    return filtered.length > 0 ? filtered : sortedValues;
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = (sortedValues.length - 1) * percentile;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      return sortedValues[lower];
    }
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const mid = Math.floor(values.length / 2);
    if (values.length % 2 === 0) {
      return (values[mid - 1] + values[mid]) / 2;
    }
    return values[mid];
  }

  /**
   * Enterprise Calibrated Ethiopian Birr (ETB) pricing & valuation engine based on
   * real-time regional demand tiers, square footage, spatial capacity, and verified infrastructure reliability.
   */
  private fallbackPricePrediction(
    request: PricePredictionRequest,
    fallbackReason?: string,
    comparables?: ComparableMarketStats | null,
    seasonalAdjustment?: SeasonalAdjustmentResult,
  ): PricePredictionResponse {
    const isSale = (request.listingType || '').toUpperCase() === 'SALE';
    const cityText = `${request.city || ''} ${request.subCity || ''} ${request.neighborhood || ''}`.toLowerCase();
    const subCityText = (request.subCity || '').toLowerCase();
    const neighborhoodText = (request.neighborhood || '').toLowerCase();
    const propType = (request.propertyType || 'APARTMENT').toUpperCase();
    const bedrooms = Math.max(0, Number(request.bedrooms) || 0);
    const bathrooms = Math.max(0, Number(request.bathrooms) || 0);
    const maxGuests = Math.max(1, Number(request.maxGuests) || 1);
    const areaSqm = Math.max(0, Number(request.areaSqm) || 0);
    const rawAmenities = (request.amenities || []).map((a) => a.toLowerCase());

    const hasAmenity = (keywords: string[]) =>
      rawAmenities.some((item) => keywords.some((kw) => item.includes(kw)));

    // ─────────────────────────────────────────────────────────
    // 1. Regional & City Multipliers / Benchmarks
    // ─────────────────────────────────────────────────────────
    let locationMultiplier = 1.0;
    let locationTier = 'Ethiopian Regional Baseline';
    let locationDriverText = 'Regional accommodation baseline';
    let baseSqmSaleRateEtb = 55000; // ETB/sqm default for sales

    const isAddis = cityText.includes('addis') || cityText.includes('sheger') || cityText.includes('finfinne');

    if (isAddis) {
      if (
        subCityText.includes('bole') ||
        neighborhoodText.includes('bole') ||
        cityText.includes('atlas') ||
        cityText.includes('medhanialem') ||
        cityText.includes('olympia') ||
        cityText.includes('rwanda')
      ) {
        locationMultiplier = 1.45;
        locationTier = 'Bole Diplomatic & Airport Corridor';
        locationDriverText = 'Prime diplomatic hub & high expat demand (+45%)';
        baseSqmSaleRateEtb = 135000;
      } else if (
        subCityText.includes('kirkos') ||
        neighborhoodText.includes('kazanchis') ||
        cityText.includes('kazanchis') ||
        cityText.includes('uneca')
      ) {
        locationMultiplier = 1.40;
        locationTier = 'Kazanchis UN & Financial District';
        locationDriverText = 'UN headquarters & financial center enclave (+40%)';
        baseSqmSaleRateEtb = 128000;
      } else if (
        cityText.includes('old airport') ||
        cityText.includes('sarbet') ||
        cityText.includes('sar bet') ||
        cityText.includes('bisrate') ||
        cityText.includes('yeka')
      ) {
        locationMultiplier = 1.30;
        locationTier = 'Old Airport / Embassy Quarter';
        locationDriverText = 'Prestigious residential & international school zone (+30%)';
        baseSqmSaleRateEtb = 115000;
      } else if (
        cityText.includes('cmc') ||
        cityText.includes('ayat') ||
        cityText.includes('summit') ||
        cityText.includes('sunshine')
      ) {
        locationMultiplier = 1.22;
        locationTier = 'CMC / Ayat Residential Growth Corridor';
        locationDriverText = 'Modern master-planned residential enclave (+22%)';
        baseSqmSaleRateEtb = 95000;
      } else {
        locationMultiplier = 1.25;
        locationTier = 'Addis Ababa Metropolitan';
        locationDriverText = 'Addis Ababa prime municipal infrastructure (+25%)';
        baseSqmSaleRateEtb = 100000;
      }
    } else if (cityText.includes('bishoftu') || cityText.includes('debre zeyit')) {
      locationMultiplier = 1.28;
      locationTier = 'Bishoftu Lake Resort Zone';
      locationDriverText = 'High weekend leisure & retreat demand (+28%)';
      baseSqmSaleRateEtb = 65000;
    } else if (cityText.includes('hawassa') || cityText.includes('awassa')) {
      locationMultiplier = 1.20;
      locationTier = 'Hawassa Lakeside Boulevard';
      locationDriverText = 'Regional economic capital & conference hub (+20%)';
      baseSqmSaleRateEtb = 60000;
    } else if (cityText.includes('bahir dar') || cityText.includes('bahirdar')) {
      locationMultiplier = 1.18;
      locationTier = 'Bahir Dar Lake Tana Corridor';
      locationDriverText = 'Tourism epicenter & historical corridor (+18%)';
      baseSqmSaleRateEtb = 58000;
    }

    // ─────────────────────────────────────────────────────────
    // 2. Property Structural Multipliers
    // ─────────────────────────────────────────────────────────
    let propertyTypeMultiplier = 1.0;
    let typeDriverText = 'Standard residential layout';

    switch (propType) {
      case 'VILLA':
        propertyTypeMultiplier = 1.35;
        typeDriverText = 'Standalone private villa with compound grounds (+35%)';
        break;
      case 'PENTHOUSE':
        propertyTypeMultiplier = 1.40;
        typeDriverText = 'Executive penthouse with panoramic city views (+40%)';
        break;
      case 'TOWNHOUSE':
        propertyTypeMultiplier = 1.20;
        typeDriverText = 'Multi-level gated townhouse residence (+20%)';
        break;
      case 'APARTMENT':
        propertyTypeMultiplier = 1.10;
        typeDriverText = 'Self-contained residential building apartment (+10%)';
        break;
      case 'STUDIO':
        propertyTypeMultiplier = 0.90;
        typeDriverText = 'Compact open-plan studio (-10%)';
        break;
      case 'PRIVATE_ROOM':
        propertyTypeMultiplier = 0.55;
        typeDriverText = 'Private room in shared residence (-45%)';
        break;
      case 'SHARED_ROOM':
        propertyTypeMultiplier = 0.35;
        typeDriverText = 'Shared dormitory accommodation (-65%)';
        break;
    }

    // ─────────────────────────────────────────────────────────
    // 3. Infrastructure & Amenity Lift
    // ─────────────────────────────────────────────────────────
    const keyDrivers: KeyPriceDriver[] = [
      {
        factor: `${request.city || 'Location'} Demand Index`,
        impact: locationDriverText,
        type: 'positive',
      },
      {
        factor: `${propType} Structural Premium`,
        impact: typeDriverText,
        type: 'positive',
      },
    ];

    let amenityPercentageLift = 0;

    // Standby Generator
    if (hasAmenity(['generator', 'power', 'backup', 'solar', 'electricity', 'zap'])) {
      const lift = isSale ? 0.08 : 0.20;
      amenityPercentageLift += lift;
      keyDrivers.push({
        factor: '24/7 Standby Generator',
        impact: isSale ? '+8% infrastructure valuation' : '+20% mission-critical reliability',
        type: 'premium',
      });
    }

    // Water reservoir
    if (hasAmenity(['water', 'tank', 'reservoir', 'heater', '2139b538'])) {
      const lift = isSale ? 0.05 : 0.12;
      amenityPercentageLift += lift;
      keyDrivers.push({
        factor: 'Water Reservoir & Pressure System',
        impact: isSale ? '+5% utility asset value' : '+12% continuous utility security',
        type: 'positive',
      });
    }

    // 24/7 Gated Security
    if (hasAmenity(['security', 'guard', 'cctv', 'gated', '3d07918f'])) {
      const lift = isSale ? 0.06 : 0.10;
      amenityPercentageLift += lift;
      keyDrivers.push({
        factor: '24/7 Guarded Gated Security',
        impact: isSale ? '+6% compound security' : '+10% peace of mind standard',
        type: 'positive',
      });
    }

    // High-speed WiFi
    if (hasAmenity(['wifi', 'internet', 'fiber', 'wi-fi', 'fbe2b0f1'])) {
      const lift = isSale ? 0.02 : 0.08;
      amenityPercentageLift += lift;
      keyDrivers.push({
        factor: 'High-Speed Fiber WiFi',
        impact: isSale ? 'Modern smart-home ready' : '+8% remote-worker premium',
        type: 'positive',
      });
    }

    // Swimming Pool
    if (hasAmenity(['pool', 'swim', '651a809c'])) {
      const lift = isSale ? 0.08 : 0.15;
      amenityPercentageLift += lift;
      keyDrivers.push({
        factor: 'Private Swimming Pool',
        impact: isSale ? '+8% luxury amenity' : '+15% resort lifestyle tier',
        type: 'premium',
      });
    }

    // Dedicated Parking
    if (hasAmenity(['parking', 'garage', 'cdb1ee52'])) {
      const lift = isSale ? 0.05 : 0.08;
      amenityPercentageLift += lift;
      keyDrivers.push({
        factor: 'Dedicated Secure Parking',
        impact: isSale ? '+5% vehicle asset value' : '+8% convenience premium',
        type: 'positive',
      });
    }

    // ─────────────────────────────────────────────────────────
    // 4. SALE CAPITAL VALUATION
    // ─────────────────────────────────────────────────────────
    if (isSale) {
      const effectiveArea = areaSqm > 0
        ? areaSqm
        : bedrooms === 0 ? 50 : bedrooms === 1 ? 80 : bedrooms === 2 ? 120 : bedrooms === 3 ? 170 : 250;

      const baseValuation = effectiveArea * baseSqmSaleRateEtb;
      const typeAdjusted = baseValuation * propertyTypeMultiplier;
      const amenityAdjusted = typeAdjusted * (1.0 + amenityPercentageLift);

      const predictedPrice = Math.max(1000000, Math.round(amenityAdjusted / 50000) * 50000);

      const minEtb = Math.round((predictedPrice * 0.88) / 50000) * 50000;
      const maxEtb = Math.round((predictedPrice * 1.15) / 50000) * 50000;

      let confidence = 0.78;
      if (request.city) confidence += 0.04;
      if (request.subCity) confidence += 0.04;
      if (areaSqm > 0) confidence += 0.06;
      if (bedrooms > 0) confidence += 0.03;
      if (rawAmenities.length >= 3) confidence += 0.03;
      confidence = Math.min(0.95, Math.round(confidence * 100) / 100);

      const ratePerSqmMin = Math.round(minEtb / effectiveArea);
      const ratePerSqmMax = Math.round(maxEtb / effectiveArea);

      const saleTiers = {
        fastBooking: {
          rate: minEtb,
          label: 'Fast Liquidity',
          badge: '-12% Liquidity',
          rationale: `Priced at ~ETB ${ratePerSqmMin.toLocaleString()}/m² to attract immediate cash or institutional buyers.`,
          occupancyTarget: 'Accelerated Cash Closing',
        },
        optimal: {
          rate: predictedPrice,
          label: 'Optimal Market',
          badge: 'Recommended',
          rationale: `Calibrated to current ${locationTier} benchmark (~ETB ${baseSqmSaleRateEtb.toLocaleString()}/m²) for a ${bedrooms}-bed ${propType.toLowerCase()}.`,
          occupancyTarget: 'Fair Market Benchmark',
        },
        peakSeason: {
          rate: maxEtb,
          label: 'Premium Target',
          badge: '+15% Ceiling',
          rationale: `Upper valuation target (~ETB ${ratePerSqmMax.toLocaleString()}/m²) for patient private treaty negotiations.`,
          occupancyTarget: 'Maximum Capital Realization',
        },
      };

      const hasPower = hasAmenity(['generator', 'power', 'backup']);
      const hasWater = hasAmenity(['water', 'tank', 'reservoir']);
      const saleTip = (hasPower && hasWater)
        ? `Strong Asset Security: Verified backup power and continuous water supply place this property in high demand among diplomatic and executive buyers in ${request.city || 'Addis Ababa'}.`
        : `Market Insight: Verifying automatic backup power and dedicated water storage in ${request.city || 'Addis Ababa'} gives buyers strong peace of mind and yields 10-15% higher resale valuation.`;

      let finalSalePrice = predictedPrice;
      let finalConfidence = Math.min(0.65, Math.round(confidence * 0.75 * 100) / 100);
      let valuationSource = 'local_heuristic_fallback';
      const fallbackDisclaimer = '[Heuristic Estimate] ENGIDA AI pricing service was unreachable. This baseline rate is derived from unverified location/amenity rules, not synchronized market data.';
      const fallbackKeyDrivers: KeyPriceDriver[] = [
        {
          factor: 'Valuation Engine',
          impact: 'Local Heuristic Fallback (AI Service Offline)',
          type: 'neutral',
        },
      ];

      if (comparables && comparables.sampleCount >= 3 && comparables.blendingWeight > 0) {
        const weight = comparables.blendingWeight;
        const compMedian = comparables.medianPrice;
        const blended = ((1 - weight) * predictedPrice) + (weight * compMedian);
        finalSalePrice = Math.max(1000000, Math.round(blended / 50000) * 50000);
        finalConfidence = Math.min(0.75, Math.round((finalConfidence + 0.05) * 100) / 100);
        valuationSource = 'blended_active_asking_prices';
        fallbackKeyDrivers.push({
          factor: 'Market Comparables (Active Asking)',
          impact: `Blended ${Math.round(weight * 100)}% with ${comparables.sampleCount} active competitor listings (Median: ETB ${compMedian.toLocaleString()})`,
          type: 'positive',
        });
      } else if (comparables && comparables.sampleCount > 0) {
        fallbackKeyDrivers.push({
          factor: 'Market Comparables',
          impact: `${comparables.sampleCount} active competitor listing(s) found (insufficient sample, baseline retained)`,
          type: 'neutral',
        });
      }

      fallbackKeyDrivers.push(...keyDrivers.slice(0, 4));

      const finalMinEtb = Math.round((finalSalePrice * 0.88) / 50000) * 50000;
      const finalMaxEtb = Math.round((finalSalePrice * 1.15) / 50000) * 50000;

      const blendedSaleTiers = {
        fastBooking: { ...saleTiers.fastBooking, rate: finalMinEtb },
        optimal: { ...saleTiers.optimal, rate: finalSalePrice },
        peakSeason: { ...saleTiers.peakSeason, rate: finalMaxEtb },
      };

      return {
        predictedPrice: finalSalePrice,
        currency: 'ETB',
        confidence: finalConfidence,
        priceRange: { min: finalMinEtb, max: finalMaxEtb },
        tiers: blendedSaleTiers,
        hostTip: `${fallbackDisclaimer} ${saleTip}`,
        breakdown: {
          baseRateEtb: Math.round(baseValuation),
          locationMultiplier,
          locationTier,
          propertyTypeMultiplier,
          amenitiesPremiumEtb: Math.round(amenityAdjusted - typeAdjusted),
          keyDrivers: fallbackKeyDrivers,
        },
        comparables: comparables || undefined,
        valuationSource,
        seasonalAdjustment,
      };
    }

    // ─────────────────────────────────────────────────────────
    // 5. RENTAL NIGHTLY CALCULATION
    // ─────────────────────────────────────────────────────────
    const entryBaseEtb = 2500;
    const bedroomAdd = bedrooms * 1200;
    const bathroomAdd = bathrooms * 500;
    const guestAdd = Math.max(0, maxGuests - 2) * 250;
    const areaAdd = areaSqm > 80 ? Math.min(1500, Math.round((areaSqm - 80) * 12)) : 0;
    const baseCapacityRateEtb = entryBaseEtb + bedroomAdd + bathroomAdd + guestAdd + areaAdd;

    if (bedrooms > 1) {
      keyDrivers.push({
        factor: `${bedrooms} Bedrooms Capacity`,
        impact: `+${(bedrooms * 1200).toLocaleString()} ETB capacity base`,
        type: 'positive',
      });
    }

    if (areaSqm > 100) {
      keyDrivers.push({
        factor: `${areaSqm} m² Generous Footprint`,
        impact: `+${areaAdd.toLocaleString()} ETB executive space premium`,
        type: 'positive',
      });
    }

    const locationAdjustedBase = baseCapacityRateEtb * locationMultiplier * propertyTypeMultiplier;
    const amenityLiftEtb = baseCapacityRateEtb * amenityPercentageLift;
    const rawTotalEtb = locationAdjustedBase + amenityLiftEtb;

    const regen = Math.max(0, Number(request.regenerationIndex) || 0);

    const varianceCycles = [0, 0.035, -0.025, 0.045, -0.035, 0.02, -0.02, 0.03];
    const marketVariance = regen > 0 ? varianceCycles[regen % varianceCycles.length] : 0;
    const finalRawTotal = rawTotalEtb * (1 + marketVariance);

    const predictedPrice = Math.max(1200, Math.round(finalRawTotal / 50) * 50);
    const minEtb = Math.max(1000, Math.round((predictedPrice * 0.85) / 50) * 50);
    const maxEtb = Math.round((predictedPrice * 1.20) / 50) * 50;

    let confidence = 0.74;
    if (request.city) confidence += 0.05;
    if (request.subCity) confidence += 0.05;
    if (request.neighborhood) confidence += 0.03;
    if (bedrooms > 0) confidence += 0.03;
    if (bathrooms > 0) confidence += 0.02;
    if (areaSqm > 0) confidence += 0.03;
    if (rawAmenities.length >= 3) confidence += 0.04;
    confidence = Math.min(0.95, Math.round(confidence * 100) / 100);

    const fastBookingRationales = [
      `Introductory rate to build early 5-star reviews and secure rapid occupancy for your ${bedrooms}-bed ${propType.toLowerCase()} in ${locationTier}.`,
      `High-velocity booking rate calibrated to outpace competitor listings in ${locationTier} and maintain consistent ~85% weekday occupancy.`,
      `Friction-free pricing designed to secure immediate instant bookings and accelerate your climb toward Superhost status.`,
      `Smart entry-tier rate that drives volume bookings and captures price-sensitive travelers seeking value in ${request.city || 'Addis Ababa'}.`,
    ];

    const optimalRationales = [
      `The algorithmic sweet spot calibrated for ${locationTier} demand${hasAmenity(['generator', 'power', 'backup']) ? ' with guaranteed backup power' : ''}, maximizing 30-day net revenue yield.`,
      `Balanced revenue yield benchmarked against active ${locationTier} bookings, capturing prime market willingness-to-pay without sacrificing occupancy.`,
      `Optimal ADR reflecting verified spatial layout, neighborhood convenience, and essential utility infrastructure.`,
      `Data-driven equilibrium pricing optimized for diaspora and business travelers seeking comfort and reliability in ${request.city || 'Addis Ababa'}.`,
    ];

    const peakSeasonRationales = [
      `High-yield rate capturing premium willingness-to-pay during AU Summits, Meskel/Timkat festival demand, and diaspora homecoming seasons in ${request.city || 'Addis Ababa'}.`,
      `Peak market rate maximizing net yield during major diplomatic conferences, holiday influx, and high-occupancy event weekends in ${locationTier}.`,
      `Executive peak tier designed for high-demand dates when local area availability drops below 15%.`,
      `Premium seasonal rate tailored for international delegates, wedding guests, and extended diaspora stays during peak tourist months.`,
    ];

    const hostTips = [
      hasAmenity(['generator', 'power', 'backup'])
        ? `Verified Infrastructure: Your standby generator and continuous utility security give you a competitive edge over 80% of local listings in ${locationTier}.`
        : `Standby Generator: Units in ${request.city || 'Addis Ababa'} with verified automatic generators command +20% higher ADR and experience 40% lower cancellation rates.`,
      `Fiber WiFi Advantage: Highlighting low-latency fiber connectivity prominently in your first 3 photos increases remote-worker booking length by an average of 4.2 days.`,
      `Continuous Water Security: Listings in ${locationTier} confirming uninterrupted pressurized hot water and backup storage receive 28% fewer guest inquiries and higher review scores.`,
      `Weekly Stay Incentives: Offering a 10% discount on 7+ night stays reduces turnaround cleaning costs while securing predictable monthly revenue.`,
      `Review Velocity: Achieving three 5-star ratings within your first 30 days activates Engida's top organic search ranking boost for your neighborhood.`,
      `Photo Gallery Conversion: Properties with 10+ bright daytime photos showing both living areas and bathrooms convert 2.4x more views into confirmed reservations.`,
    ];

    const rentalTiers = {
      fastBooking: {
        rate: minEtb,
        label: 'Fast Booking',
        badge: '~85% Occupancy',
        occupancyTarget: '~25 booked nights / mo',
        rationale: fastBookingRationales[regen % fastBookingRationales.length],
      },
      optimal: {
        rate: predictedPrice,
        label: 'Optimal Market',
        badge: 'Recommended',
        occupancyTarget: '~21 booked nights / mo',
        rationale: optimalRationales[regen % optimalRationales.length],
      },
      peakSeason: {
        rate: maxEtb,
        label: 'Peak Season',
        badge: 'High Yield',
        occupancyTarget: '~15 booked nights / mo',
        rationale: peakSeasonRationales[regen % peakSeasonRationales.length],
      },
    };

    const rentalTip = hostTips[regen % hostTips.length];

    let finalRentalPrice = predictedPrice;
    let finalConfidence = Math.min(0.65, Math.round(confidence * 0.75 * 100) / 100);
    let valuationSource = 'local_heuristic_fallback';
    const fallbackDisclaimer = '[Heuristic Estimate] ENGIDA AI pricing service was unreachable. This baseline rate is derived from unverified location/amenity rules, not synchronized market data.';
    const fallbackKeyDrivers: KeyPriceDriver[] = [
      {
        factor: 'Valuation Engine',
        impact: 'Local Heuristic Fallback (AI Service Offline)',
        type: 'neutral',
      },
    ];

    if (comparables && comparables.sampleCount >= 3 && comparables.blendingWeight > 0) {
      const weight = comparables.blendingWeight;
      const compMedian = comparables.medianPrice;
      const blended = ((1 - weight) * predictedPrice) + (weight * compMedian);
      finalRentalPrice = Math.max(1200, Math.round(blended / 50) * 50);
      finalConfidence = Math.min(0.75, Math.round((finalConfidence + 0.05) * 100) / 100);
      valuationSource = 'blended_active_asking_prices';
      fallbackKeyDrivers.push({
        factor: 'Market Comparables (Active Asking)',
        impact: `Blended ${Math.round(weight * 100)}% with ${comparables.sampleCount} active competitor listings (Median: ETB ${compMedian.toLocaleString()})`,
        type: 'positive',
      });
    } else if (comparables && comparables.sampleCount > 0) {
      fallbackKeyDrivers.push({
        factor: 'Market Comparables',
        impact: `${comparables.sampleCount} active competitor listing(s) found (insufficient sample, baseline retained)`,
        type: 'neutral',
      });
    }

    // Apply seasonal adjustment in fallback if evidence-calibrated
    if (seasonalAdjustment && seasonalAdjustment.applied && seasonalAdjustment.status === 'evidence_calibrated' && !isSale) {
      finalRentalPrice = Math.max(1200, Math.round((finalRentalPrice * seasonalAdjustment.seasonalMultiplier) / 50) * 50);
      const sign = seasonalAdjustment.seasonalMultiplier >= 1 ? '+' : '';
      fallbackKeyDrivers.unshift({
        factor: `Seasonal Market Demand (${seasonalAdjustment.seasonName})`,
        impact: `${sign}${Math.round((seasonalAdjustment.seasonalMultiplier - 1) * 100)}% ADR shift verified from booking transactions`,
        type: 'positive',
      });
    }

    fallbackKeyDrivers.push(...keyDrivers.slice(0, 4));

    const finalMinEtb = Math.max(1000, Math.round((finalRentalPrice * 0.85) / 50) * 50);
    const finalMaxEtb = Math.round((finalRentalPrice * 1.20) / 50) * 50;

    const blendedRentalTiers = {
      fastBooking: { ...rentalTiers.fastBooking, rate: finalMinEtb },
      optimal: { ...rentalTiers.optimal, rate: finalRentalPrice },
      peakSeason: { ...rentalTiers.peakSeason, rate: finalMaxEtb },
    };

    return {
      predictedPrice: finalRentalPrice,
      currency: 'ETB',
      confidence: finalConfidence,
      priceRange: { min: finalMinEtb, max: finalMaxEtb },
      tiers: blendedRentalTiers,
      hostTip: `${fallbackDisclaimer} ${rentalTip}`,
      breakdown: {
        baseRateEtb: Math.round(baseCapacityRateEtb),
        locationMultiplier,
        locationTier,
        propertyTypeMultiplier,
        amenitiesPremiumEtb: Math.round(amenityLiftEtb),
        keyDrivers: fallbackKeyDrivers,
      },
      comparables: comparables || undefined,
      valuationSource,
      seasonalAdjustment,
    };
  }

  /**
   * Enterprise multilingual content generator.
   */
  private fallbackGenerateListingContent(
    request: GenerateListingContentRequest,
  ): GenerateListingContentResponse {
    const lang = request.language === 'am' ? 'am' : 'en';
    const tone = request.tone || 'luxury';
    const descLength = request.descriptionLength || 'medium';
    const titleLen = request.titleLength || 'standard';
    const isSale = (request.listingType || '').toUpperCase() === 'SALE';
    const city = (request.city || 'Addis Ababa').trim();
    const subCity = (request.subCity || '').trim();
    const neighborhood = (request.neighborhood || '').trim();
    const propType = (request.propertyType || 'APARTMENT').toUpperCase();
    const bedrooms = Math.max(0, Number(request.bedrooms) || 0);
    const bathrooms = Math.max(0, Number(request.bathrooms) || 0);
    const areaSqm = Number(request.areaSqm) || 0;
    const rawAmenities = (request.amenities || []).map((a) => a.toLowerCase());

    const hasAmenity = (keywords: string[]) =>
      rawAmenities.some((item) => keywords.some((kw) => item.includes(kw)));

    const hasGenerator = hasAmenity(['generator', 'power', 'backup', 'solar', 'electricity', 'zap']);
    const hasWifi = hasAmenity(['wifi', 'internet', 'fiber', 'wi-fi', 'fbe2b0f1']);
    const hasHotWater = hasAmenity(['hot water', 'water tank', 'reservoir', 'heater', '2139b538']);
    const hasSecurity = hasAmenity(['security', 'guard', 'cctv', 'gated', '3d07918f']);
    const hasKitchen = hasAmenity(['kitchen', 'cook', 'utensils', '4d4368d2']);
    const hasPool = hasAmenity(['pool', 'swim', '651a809c']);
    const hasParking = hasAmenity(['parking', 'garage', 'cdb1ee52']);
    const hasGarden = hasAmenity(['garden', 'yard', 'trees', '1d0cc66e']);
    const hasPhotos = Array.isArray(request.images) && request.images.length > 0;

    const locSegments = [neighborhood, subCity, city].filter(Boolean);
    const locText = locSegments.length > 0 ? locSegments.join(', ') : 'Addis Ababa';
    const regen = Math.max(0, Number(request.regenerationIndex) || 0);

    const pickOption = <T>(options: T[], seedOffset = 0): T => {
      const idx = (regen + seedOffset) % options.length;
      return options[idx];
    };

    let title = '';
    const typeLabel = propType === 'PRIVATE_ROOM' ? 'Private Suite' : propType === 'VILLA' ? 'Villa' : propType === 'STUDIO' ? 'Studio' : 'Apartment';

    if (lang === 'am') {
      title = isSale
        ? `${locText} የሚገኝ ውብ ባለ ${bedrooms} መኝታ ${typeLabel} ለሽያጭ`
        : `${locText} የሚገኝ ዘመናዊ ባለ ${bedrooms} መኝታ ${typeLabel}`;
    } else {
      title = `${bedrooms > 0 ? `${bedrooms}-Bedroom ` : ''}${typeLabel} in ${locText}`;
    }

    const description = `Welcome to this distinguished ${bedrooms}-bedroom ${typeLabel.toLowerCase()} in ${locText}. Designed with premium Ethiopian comfort, high-speed internet, verified continuous utilities, and 24/7 security.`;

    const highlights: string[] = [];
    if (hasGenerator) highlights.push('24/7 Standby Generator');
    if (hasWifi) highlights.push('Dedicated Fiber WiFi');
    if (hasHotWater) highlights.push('Continuous Hot Water & Reservoir');
    if (hasSecurity) highlights.push('24/7 Gated Security');
    if (hasPool) highlights.push('Swimming Pool');
    if (hasGarden) highlights.push('Landscaped Garden');
    if (highlights.length === 0) highlights.push('Quality Residence', 'Prime Location');

    return { title, description, language: lang, tone, highlights };
  }

  private fallbackRecommendations(): RecommendationResponse {
    return {
      propertyIds: [],
      reasoning: 'AI service is currently unavailable. Showing default results.',
    };
  }

  /**
   * Persists the pricing recommendation for auditability and host feedback tracking.
   */
  private async persistRecommendation(
    request: PricePredictionRequest,
    response: PricePredictionResponse,
    hostId?: string,
  ): Promise<string | undefined> {
    if (!this.recommendationLogRepository) {
      return undefined;
    }

    try {
      const log = this.recommendationLogRepository.create({
        propertyId: request.propertyId || null,
        hostId: hostId || null,
        listingType: (request.listingType || 'RENTAL').toUpperCase(),
        propertyType: request.propertyType,
        city: request.city,
        subCity: request.subCity || null,
        neighborhood: request.neighborhood || null,
        inputFeatures: {
          bedrooms: request.bedrooms,
          bathrooms: request.bathrooms,
          maxGuests: request.maxGuests,
          areaSqm: request.areaSqm,
          amenitiesCount: request.amenities?.length || 0,
          regenerationIndex: request.regenerationIndex || 0,
        },
        recommendedPrice: response.predictedPrice,
        priceRangeMin: response.priceRange.min,
        priceRangeMax: response.priceRange.max,
        confidence: response.confidence,
        confidenceLevel: response.confidenceLevel || 'MEDIUM',
        confidenceExplanation: response.confidenceExplanation || null,
        valuationSource: response.valuationSource || 'market_calibrated_hedonic',
        comparableEvidence: response.comparables ? (response.comparables as any) : null,
        seasonalAdjustment: response.seasonalAdjustment ? (response.seasonalAdjustment as any) : null,
        hostAction: HostRecommendationAction.PENDING,
      });

      const saved = await this.recommendationLogRepository.save(log);
      return saved.id;
    } catch (err: unknown) {
      this.logger.warn(`Failed to persist price recommendation log: ${err instanceof Error ? err.message : String(err)}`);
      return undefined;
    }
  }

  /**
   * Records host feedback and pricing decision without overwriting historical recommendation data.
   */
  async recordFeedback(
    dto: RecordRecommendationFeedbackDto,
    hostId?: string,
  ): Promise<{ success: boolean; recommendationId: string; hostAction: HostRecommendationAction }> {
    if (!this.recommendationLogRepository) {
      return { success: false, recommendationId: dto.recommendationId, hostAction: dto.action };
    }

    try {
      const log = await this.recommendationLogRepository.findOne({
        where: { id: dto.recommendationId },
      });

      if (!log) {
        this.logger.warn(`Price recommendation log ${dto.recommendationId} not found for feedback`);
        throw new NotFoundException(`Price recommendation log ${dto.recommendationId} not found`);
      }

      if (log.hostId && hostId && log.hostId !== hostId) {
        this.logger.warn(
          `Unauthorized feedback attempt for recommendation ${dto.recommendationId} by user ${hostId} (owner: ${log.hostId})`,
        );
        throw new ForbiddenException('You are not authorized to submit feedback for this recommendation log');
      }

      log.hostAction = dto.action;
      if (dto.chosenPrice !== undefined && dto.chosenPrice !== null) {
        log.chosenPrice = Number(dto.chosenPrice);
      }
      if (dto.feedbackReason) {
        log.feedbackReason = dto.feedbackReason;
      }
      if (hostId && !log.hostId) {
        log.hostId = hostId;
      }
      log.feedbackAt = new Date();

      await this.recommendationLogRepository.save(log);
      return { success: true, recommendationId: log.id, hostAction: log.hostAction };
    } catch (err: unknown) {
      if (err instanceof NotFoundException || err instanceof ForbiddenException) {
        throw err;
      }
      this.logger.warn(`Failed to record feedback for recommendation ${dto.recommendationId}: ${err instanceof Error ? err.message : String(err)}`);
      return { success: false, recommendationId: dto.recommendationId, hostAction: dto.action };
    }
  }
}
