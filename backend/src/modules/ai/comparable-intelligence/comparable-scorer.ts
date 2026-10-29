/**
 * Comparable Property Quality Scoring Engine.
 *
 * Evaluates candidate comparable properties against a target property across:
 * - Geographic proximity & hierarchy (weight: 0.35)
 * - Property type compatibility (weight: 0.25)
 * - Usable floor area / footprint (weight: 0.15)
 * - Bedroom & bathroom layout match (weight: 0.15)
 * - Guest capacity & essential utility infrastructure (weight: 0.10)
 *
 * Discards low-quality comparables (< 0.50 quality threshold) to ensure recommendations
 * are never diluted by dissimilar listings.
 */

import { Property, ListingType, PropertyType } from '../../properties/entities/property.entity';
import { LocationNormalizer, LocationInput } from '../location-intelligence/location-normalizer';

export interface TargetPropertySpecs {
  city: string;
  subCity?: string | null;
  neighborhood?: string | null;
  propertyType: string;
  listingType?: string; // 'RENTAL' | 'SALE'
  bedrooms: number;
  bathrooms: number;
  maxGuests?: number;
  areaSqm?: number;
  amenities?: string[];
  propertyId?: string;
}

export interface ComparableScoreBreakdown {
  geoScore: number;
  typeScore: number;
  areaScore: number;
  roomsScore: number;
  amenitiesScore: number;
  compositeQualityScore: number;
}

export interface ScoredComparable {
  property: Property;
  price: number;
  areaSqm: number;
  pricePerSqm?: number;
  qualityScore: number;
  scoreBreakdown: ComparableScoreBreakdown;
  isRetained: boolean;
}

export interface ComparableEvaluationResult {
  eligibleCount: number;
  retainedCount: number;
  averageQualityScore: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  averagePrice: number;
  pricePerSqmMedian?: number;
  pricePerSqmMin?: number;
  pricePerSqmMax?: number;
  priceDispersionCv: number; // Coefficient of Variation (std dev / mean)
  retainedComparables: ScoredComparable[];
  evidenceType: 'active_asking_prices';
  blendingWeight: number;
}

export class ComparableQualityScorer {
  // Quality threshold for retaining a comparable (minimum 50% composite match)
  public static readonly QUALITY_RETENTION_THRESHOLD = 0.50;

  // High quality benchmark for full weighting (minimum 75% match)
  public static readonly HIGH_QUALITY_BENCHMARK = 0.75;

  // Weight constants (sum to 1.0)
  public static readonly WEIGHT_GEO = 0.35;
  public static readonly WEIGHT_TYPE = 0.25;
  public static readonly WEIGHT_AREA = 0.15;
  public static readonly WEIGHT_ROOMS = 0.15;
  public static readonly WEIGHT_AMENITIES = 0.10;

  /**
   * Scores a single candidate comparable property against the target specifications.
   */
  public static scoreComparable(
    target: TargetPropertySpecs,
    candidate: Property,
  ): ScoredComparable {
    const isTargetSale = (target.listingType || 'RENTAL').toUpperCase() === 'SALE';
    const isCandidateSale = candidate.listingType === ListingType.SALE;

    // Strict listing type separation: RENTAL and SALE never compare
    if (isTargetSale !== isCandidateSale) {
      return {
        property: candidate,
        price: 0,
        areaSqm: Number(candidate.areaSqm) || 0,
        qualityScore: 0,
        scoreBreakdown: {
          geoScore: 0,
          typeScore: 0,
          areaScore: 0,
          roomsScore: 0,
          amenitiesScore: 0,
          compositeQualityScore: 0,
        },
        isRetained: false,
      };
    }

    const price = isTargetSale ? Number(candidate.salePrice) : Number(candidate.pricePerNight);
    const candidateArea = Number(candidate.areaSqm) || 0;
    const pricePerSqm = isTargetSale && candidateArea > 0 && price > 0 ? price / candidateArea : undefined;

    // 1. Geographic similarity (weight: 0.35)
    const targetLoc: LocationInput = {
      city: target.city,
      subCity: target.subCity,
      neighborhood: target.neighborhood,
    };
    const candLoc: LocationInput = {
      city: candidate.city,
      subCity: candidate.subCity,
      neighborhood: candidate.neighborhood,
    };
    const geoScore = LocationNormalizer.calculateSimilarity(targetLoc, candLoc);

    // 2. Property type compatibility (weight: 0.25)
    const typeScore = this.calculatePropertyTypeSimilarity(target.propertyType, candidate.propertyType);

    // 3. Area / Footprint similarity (weight: 0.15)
    const targetArea = Number(target.areaSqm) || 0;
    let areaScore = 0.75; // Default if neither has area
    if (targetArea > 0 && candidateArea > 0) {
      areaScore = Math.min(targetArea, candidateArea) / Math.max(targetArea, candidateArea);
    } else if (targetArea > 0 || candidateArea > 0) {
      // One has area, other does not -> fallback to bedroom correlation
      const bedDiff = Math.abs((target.bedrooms || 1) - (candidate.bedrooms || 1));
      areaScore = Math.max(0.3, 1.0 - bedDiff * 0.25);
    }

    // 4. Rooms similarity: bedrooms & bathrooms (weight: 0.15)
    const bedDiff = Math.abs((target.bedrooms || 0) - (candidate.bedrooms || 0));
    const bathDiff = Math.abs((target.bathrooms || 0) - (candidate.bathrooms || 0));
    const bedScore = Math.max(0, 1.0 - bedDiff * 0.25);
    const bathScore = Math.max(0, 1.0 - bathDiff * 0.20);
    const roomsScore = 0.65 * bedScore + 0.35 * bathScore;

    // 5. Capacity & Amenities match (weight: 0.10)
    let capacityScore = 1.0;
    if (!isTargetSale) {
      const targetGuests = target.maxGuests || 2;
      const candidateGuests = candidate.maxGuests || 2;
      const guestDiff = Math.abs(targetGuests - candidateGuests);
      capacityScore = Math.max(0.4, 1.0 - guestDiff * 0.15);
    }

    // Key utilities check (generator, reservoir, wifi)
    let amenitiesScore = capacityScore;
    if (target.amenities && target.amenities.length > 0 && candidate.amenities) {
      const targetAmens = target.amenities.map((a) => a.toLowerCase());
      const candidateAmens = candidate.amenities
        .map((a: any) => (typeof a === 'string' ? a : a?.name || ''))
        .filter(Boolean)
        .map((a: string) => a.toLowerCase());
      const sharedCount = targetAmens.filter((ta) => candidateAmens.some((ca) => ca.includes(ta) || ta.includes(ca))).length;
      const overlapRatio = sharedCount / Math.max(1, targetAmens.length);
      amenitiesScore = 0.6 * capacityScore + 0.4 * overlapRatio;
    }

    // Composite Quality Score
    const compositeQualityScore = Math.round((
      this.WEIGHT_GEO * geoScore +
      this.WEIGHT_TYPE * typeScore +
      this.WEIGHT_AREA * areaScore +
      this.WEIGHT_ROOMS * roomsScore +
      this.WEIGHT_AMENITIES * amenitiesScore
    ) * 100) / 100;

    const isRetained = compositeQualityScore >= this.QUALITY_RETENTION_THRESHOLD && price > 0;

    return {
      property: candidate,
      price,
      areaSqm: candidateArea,
      pricePerSqm,
      qualityScore: compositeQualityScore,
      scoreBreakdown: {
        geoScore,
        typeScore,
        areaScore,
        roomsScore,
        amenitiesScore,
        compositeQualityScore,
      },
      isRetained,
    };
  }

  /**
   * Evaluates an entire collection of raw candidate properties.
   * Filters out low-quality matches, calculates robust statistics and dispersion.
   */
  public static evaluateCandidates(
    target: TargetPropertySpecs,
    candidates: Property[],
  ): ComparableEvaluationResult {
    const scoredList = candidates
      .filter((c) => !target.propertyId || c.id !== target.propertyId)
      .map((c) => this.scoreComparable(target, c));

    const eligibleCount = scoredList.length;
    const retained = scoredList.filter((s) => s.isRetained);
    const retainedCount = retained.length;

    if (retainedCount === 0) {
      return {
        eligibleCount,
        retainedCount: 0,
        averageQualityScore: 0,
        medianPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        averagePrice: 0,
        priceDispersionCv: 0,
        retainedComparables: [],
        evidenceType: 'active_asking_prices',
        blendingWeight: 0.0,
      };
    }

    // Sort retained by price ascending
    retained.sort((a, b) => a.price - b.price);

    const prices = retained.map((r) => r.price);
    const medianPrice = Math.round(this.calculateMedian(prices));
    const minPrice = Math.round(prices[0]);
    const maxPrice = Math.round(prices[prices.length - 1]);
    const averagePrice = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);

    // Calculate Coefficient of Variation (CV = stdDev / mean) for price dispersion
    const variance = prices.reduce((s, p) => s + Math.pow(p - averagePrice, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const priceDispersionCv = averagePrice > 0 ? Math.round((stdDev / averagePrice) * 100) / 100 : 0;

    // Average quality score
    const avgQuality = Math.round(
      (retained.reduce((s, r) => s + r.qualityScore, 0) / retainedCount) * 100,
    ) / 100;

    // Sales price per sqm calculations
    let pricePerSqmMedian: number | undefined;
    let pricePerSqmMin: number | undefined;
    let pricePerSqmMax: number | undefined;

    const validSqmRates = retained
      .map((r) => r.pricePerSqm)
      .filter((rate): rate is number => typeof rate === 'number' && rate > 0);

    if (validSqmRates.length > 0) {
      validSqmRates.sort((a, b) => a - b);
      pricePerSqmMedian = Math.round(this.calculateMedian(validSqmRates));
      pricePerSqmMin = Math.round(validSqmRates[0]);
      pricePerSqmMax = Math.round(validSqmRates[validSqmRates.length - 1]);
    }

    // Quality-based blending weight determination:
    // Requires retainedCount >= 3 to even consider blending.
    // Scales dynamically with average quality score.
    let blendingWeight = 0.0;
    if (retainedCount >= 6 && avgQuality >= this.HIGH_QUALITY_BENCHMARK) {
      blendingWeight = 0.50; // High volume & high quality match -> 50% weight
    } else if (retainedCount >= 3 && avgQuality >= this.QUALITY_RETENTION_THRESHOLD) {
      blendingWeight = 0.30; // Moderate volume / quality match -> 30% weight
    }

    return {
      eligibleCount,
      retainedCount,
      averageQualityScore: avgQuality,
      medianPrice,
      minPrice,
      maxPrice,
      averagePrice,
      pricePerSqmMedian,
      pricePerSqmMin,
      pricePerSqmMax,
      priceDispersionCv,
      retainedComparables: retained,
      evidenceType: 'active_asking_prices',
      blendingWeight,
    };
  }

  private static calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const mid = Math.floor(values.length / 2);
    if (values.length % 2 === 0) {
      return (values[mid - 1] + values[mid]) / 2;
    }
    return values[mid];
  }

  private static calculatePropertyTypeSimilarity(typeA: string, typeB: string): number {
    const a = (typeA || '').trim().toUpperCase();
    const b = (typeB || '').trim().toUpperCase();
    if (a === b) return 1.0;

    // Compatible pairs
    if ((a === 'HOUSE' && b === 'TOWNHOUSE') || (a === 'TOWNHOUSE' && b === 'HOUSE')) return 0.85;
    if ((a === 'VILLA' && b === 'HOUSE') || (a === 'HOUSE' && b === 'VILLA')) return 0.70;
    if ((a === 'APARTMENT' && b === 'STUDIO') || (a === 'STUDIO' && b === 'APARTMENT')) return 0.65;
    if ((a === 'PENTHOUSE' && b === 'APARTMENT') || (a === 'APARTMENT' && b === 'PENTHOUSE')) return 0.65;

    // Incompatible layouts
    if (a.includes('ROOM') || b.includes('ROOM')) return 0.25;

    return 0.40;
  }
}

