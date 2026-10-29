/**
 * Confidence Calibration & Explanation Engine.
 *
 * Mathematically evaluates recommendation confidence based on:
 * 1. High-quality comparable sample volume
 * 2. Average comparable match quality
 * 3. Price dispersion (Coefficient of Variation)
 * 4. Input specification completeness (sub-city, neighborhood, areaSqm)
 * 5. Valuation engine connectivity status
 *
 * Produces an explicit level ('HIGH' | 'MEDIUM' | 'LOW') and human-readable explanation.
 */

import { ComparableEvaluationResult } from '../comparable-intelligence/comparable-scorer';
import { TargetPropertySpecs } from '../comparable-intelligence/comparable-scorer';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface CalibratedConfidenceResult {
  confidence: number; // 0.40 - 0.95
  confidenceLevel: ConfidenceLevel;
  confidenceExplanation: string;
}

export class ConfidenceCalibrator {
  public static calibrate(
    target: TargetPropertySpecs,
    comparables: ComparableEvaluationResult | null,
    isFallbackActive = false,
  ): CalibratedConfidenceResult {
    let score = 0.50; // Starting baseline
    const explanations: string[] = [];

    // 1. Data Completeness Contribution
    if (target.city) score += 0.04;
    if (target.subCity) {
      score += 0.05;
      explanations.push(`identified sub-city (${target.subCity})`);
    } else {
      score -= 0.04;
    }

    if (target.neighborhood) {
      score += 0.04;
      explanations.push(`verified neighborhood (${target.neighborhood})`);
    }

    if (Number(target.areaSqm) > 0) {
      score += 0.05;
      explanations.push(`exact ${target.areaSqm} m² footprint`);
    } else {
      score -= 0.03;
    }

    if (target.amenities && target.amenities.length >= 3) {
      score += 0.03;
    }

    // 2. Comparable Evidence & Match Quality Contribution
    if (comparables && comparables.retainedCount > 0) {
      const count = comparables.retainedCount;
      const quality = comparables.averageQualityScore;
      const cv = comparables.priceDispersionCv;

      if (count >= 6 && quality >= 0.75) {
        score += 0.18;
        explanations.push(`${count} high-similarity competitor listings (avg quality: ${Math.round(quality * 100)}%)`);
      } else if (count >= 3 && quality >= 0.50) {
        score += 0.10;
        explanations.push(`${count} comparable listings (avg quality: ${Math.round(quality * 100)}%)`);
      } else {
        score += 0.03;
        explanations.push(`sparse local comparables (${count} listing)`);
      }

      // 3. Price Dispersion Check
      if (count >= 3) {
        if (cv <= 0.18) {
          score += 0.05;
          explanations.push('tight competitor price consistency');
        } else if (cv >= 0.38) {
          score -= 0.08;
          explanations.push('high local price variance');
        }
      }
    } else {
      score -= 0.06;
      explanations.push('no active local competitor listings in this sub-market');
    }

    // 4. Connectivity / Fallback Adjustment
    if (isFallbackActive) {
      score = Math.min(0.65, score * 0.85);
      explanations.push('local heuristic fallback active (AI service offline)');
    }

    // Clamp score within realistic bounds [0.40, 0.95]
    const finalConfidence = Math.min(0.95, Math.max(0.40, Math.round(score * 100) / 100));

    // Assign categorical level
    let confidenceLevel: ConfidenceLevel = 'LOW';
    if (finalConfidence >= 0.80) {
      confidenceLevel = 'HIGH';
    } else if (finalConfidence >= 0.65) {
      confidenceLevel = 'MEDIUM';
    }

    // Construct human-readable explanation
    const locationName = target.neighborhood || target.subCity || target.city;
    let rationale = '';
    if (confidenceLevel === 'HIGH') {
      rationale = `High confidence (${Math.round(finalConfidence * 100)}%): Valued with ${explanations.join(', ')} in ${locationName}.`;
    } else if (confidenceLevel === 'MEDIUM') {
      rationale = `Medium confidence (${Math.round(finalConfidence * 100)}%): Anchored by ${explanations.join(', ')} in ${locationName}.`;
    } else {
      rationale = `Low confidence (${Math.round(finalConfidence * 100)}%): Data limitations present (${explanations.join(', ')}). Recommended rate relies primarily on baseline heuristic indices.`;
    }

    return {
      confidence: finalConfidence,
      confidenceLevel,
      confidenceExplanation: rationale,
    };
  }
}

