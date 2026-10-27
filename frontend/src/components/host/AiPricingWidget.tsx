'use client';

import React, { useState, useTransition } from 'react';
import { apiFetch } from '../../lib/api';
import type { AiPricePredictionResponse } from '../../types/host';
import {
  Sparkles,
  TrendingUp,
  Check,
  RotateCcw,
  Coins,
  Zap,
  ShieldCheck,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AiPricingWidgetProps {
  city: string;
  subCity?: string;
  neighborhood?: string;
  propertyType: string;
  bedrooms: number | string;
  bathrooms: number | string;
  maxGuests: number | string;
  amenityIds: string[];
  currentPrice?: number | string;
  onApplyPrice: (priceInEtb: number) => void;
  className?: string;
}

type SelectedTier = 'min' | 'recommended' | 'max';

export default function AiPricingWidget({
  city,
  subCity,
  neighborhood,
  propertyType,
  bedrooms,
  bathrooms,
  maxGuests,
  amenityIds,
  currentPrice,
  onApplyPrice,
  className = '',
}: AiPricingWidgetProps) {
  const [prediction, setPrediction] = useState<AiPricePredictionResponse | null>(null);
  const [selectedTier, setSelectedTier] = useState<SelectedTier>('recommended');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [, startTransition] = useTransition();

  const handlePredictPrice = async () => {
    setLoading(true);
    setError(null);
    setAppliedNotice(null);

    try {
      const payload = {
        city: city || 'Addis Ababa',
        subCity: subCity || undefined,
        neighborhood: neighborhood || undefined,
        propertyType: propertyType || 'APARTMENT',
        bedrooms: Math.max(0, parseInt(String(bedrooms), 10) || 0),
        bathrooms: Math.max(0, parseInt(String(bathrooms), 10) || 0),
        maxGuests: Math.max(1, parseInt(String(maxGuests), 10) || 1),
        amenities: Array.isArray(amenityIds) ? amenityIds : [],
      };

      const result = await apiFetch<AiPricePredictionResponse>('/ai/predict-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      startTransition(() => {
        setPrediction(result);
        setSelectedTier('recommended');
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not retrieve AI pricing estimation';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const getTierPrice = (tier: SelectedTier) => {
    if (!prediction) return { etb: 0, usd: 0 };
    if (tier === 'min') {
      return {
        etb: prediction.priceRange.min,
        usd: prediction.priceRange.minUsd,
      };
    }
    if (tier === 'max') {
      return {
        etb: prediction.priceRange.max,
        usd: prediction.priceRange.maxUsd,
      };
    }
    return {
      etb: prediction.predictedPrice,
      usd: prediction.predictedPriceUsd,
    };
  };

  const handleApply = (tierToApply?: SelectedTier) => {
    const tier = tierToApply || selectedTier;
    const target = getTierPrice(tier);
    if (!target.etb) return;

    onApplyPrice(target.etb);
    setAppliedNotice(`Applied ETB ${target.etb.toLocaleString()} (≈ $${target.usd.toFixed(2)} USD) to listing`);
    setTimeout(() => {
      setAppliedNotice(null);
    }, 4000);
  };

  const selectedValues = getTierPrice(selectedTier);
  const currentNumPrice = typeof currentPrice === 'string' ? parseFloat(currentPrice) : currentPrice;

  return (
    <div
      className={`rounded-2xl border transition-all ${
        prediction
          ? 'bg-gradient-to-br from-white via-[#FCFAF6] to-[#F5F8F5] border-[#234B36]/30 shadow-md p-5 sm:p-6'
          : 'bg-[#FCFAF6] border-[#E5E0D5] p-4 sm:p-5'
      } ${className}`}
    >
      {/* ── Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#234B36] to-[#2D5E43] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5 text-[#E6C687]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-[#252923]">
                AI Dynamic Pricing Recommendation
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#234B36]/10 text-[#234B36] border border-[#234B36]/20">
                <Coins className="w-3 h-3" /> ETB &amp; USD
              </span>
            </div>
            <p className="text-xs text-[#73776F] mt-0.5">
              Calibrated for Ethiopian urban sub-markets, seasonal demand, and international guest appeal.
            </p>
          </div>
        </div>

        {/* Trigger Button */}
        {!prediction && (
          <button
            type="button"
            onClick={handlePredictPrice}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#234B36] hover:bg-[#2D5E43] text-white text-xs font-black shadow-sm hover:shadow transition disabled:opacity-60 whitespace-nowrap cursor-pointer shrink-0"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Analyzing Market…</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#E6C687]" />
                <span>Estimate Optimal Rate</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center justify-between gap-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={handlePredictPrice}
            className="text-xs font-bold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Loading Skeleton / Shimmer ── */}
      {loading && (
        <div className="mt-4 p-6 rounded-xl bg-white/70 border border-[#E5E0D5] animate-pulse space-y-3">
          <div className="h-4 bg-[#E5E0D5]/60 rounded-md w-1/3" />
          <div className="h-8 bg-[#234B36]/10 rounded-lg w-2/3" />
          <div className="h-3 bg-[#E5E0D5]/50 rounded-md w-1/2" />
        </div>
      )}

      {/* ── Active Recommendation Results ── */}
      {prediction && !loading && (
        <div className="mt-5 space-y-5">
          {/* Main Rate Highlight */}
          <div className="p-4 sm:p-5 rounded-xl bg-white border border-[#234B36]/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#73776F] block mb-1">
                Suggested Nightly Rate
              </span>
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <span className="text-2xl sm:text-3xl font-black text-[#252923]">
                  ETB {selectedValues.etb.toLocaleString()}
                </span>
                <span className="text-base sm:text-lg font-bold text-[#234B36]">
                  ≈ ${selectedValues.usd.toFixed(2)} USD
                </span>
                <span className="text-xs text-[#73776F]">/ night</span>
              </div>
              <p className="text-xs text-[#73776F] mt-1 flex items-center gap-1.5 flex-wrap">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Confidence: <strong>{Math.round(prediction.confidence * 100)}%</strong>
                </span>
                <span>•</span>
                <span>Location: <strong>{prediction.breakdown.locationTier}</strong></span>
                <span>•</span>
                <span className="text-[11px] text-[#8C765C]">Benchmark: 1 USD = {prediction.exchangeRate} ETB</span>
              </p>
            </div>

            {/* Direct Action Button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleApply()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#234B36] hover:bg-[#2D5E43] active:bg-[#1A3828] text-white text-xs font-black shadow-sm transition"
              >
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Apply This Price</span>
              </button>

              <button
                type="button"
                onClick={handlePredictPrice}
                title="Recalculate with updated inputs"
                className="p-2.5 rounded-xl border border-[#E5E0D5] hover:bg-[#F8F5ED] text-[#73776F] transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Applied Notice Banner */}
          {appliedNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in duration-200">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{appliedNotice}</span>
            </div>
          )}

          {/* Current vs AI Comparison Note */}
          {currentNumPrice && currentNumPrice > 0 ? (
            <div className="text-xs text-[#73776F] px-1 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-[#234B36]" />
              <span>
                Your current set price is <strong>ETB {currentNumPrice.toLocaleString()}</strong> (≈ $
                {(currentNumPrice / prediction.exchangeRate).toFixed(2)} USD).{' '}
                {currentNumPrice < prediction.priceRange.min ? (
                  <span className="text-amber-700 font-bold">
                    This is below the recommended corridor and may underprice your stay.
                  </span>
                ) : currentNumPrice > prediction.priceRange.max ? (
                  <span className="text-amber-700 font-bold">
                    This is above the competitive range and could reduce booking frequency.
                  </span>
                ) : (
                  <span className="text-emerald-700 font-bold">
                    Your rate falls neatly within the recommended market band.
                  </span>
                )}
              </span>
            </div>
          ) : null}

          {/* ── 3-Tier Competitive Corridor ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-[#252923] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#234B36]" />
                <span>Competitive Pricing Corridor</span>
              </label>
              <span className="text-[11px] text-[#73776F]">Click a strategy tier to select</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Tier 1: Fast Booking */}
              <button
                type="button"
                onClick={() => setSelectedTier('min')}
                className={`p-3.5 rounded-xl border text-left transition relative ${
                  selectedTier === 'min'
                    ? 'border-[#234B36] bg-[#234B36]/5 ring-1 ring-[#234B36] shadow-xs'
                    : 'border-[#E5E0D5] bg-white hover:border-[#234B36]/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#73776F]">
                    Fast Booking
                  </span>
                  {selectedTier === 'min' && (
                    <span className="w-2 h-2 rounded-full bg-[#234B36]" />
                  )}
                </div>
                <div className="text-sm font-black text-[#252923]">
                  ETB {prediction.priceRange.min.toLocaleString()}
                </div>
                <div className="text-xs font-bold text-[#234B36]">
                  ≈ ${prediction.priceRange.minUsd.toFixed(2)} USD
                </div>
                <p className="text-[11px] text-[#73776F] mt-1">
                  Maximize early bookings &amp; first reviews
                </p>
              </button>

              {/* Tier 2: Recommended Optimal */}
              <button
                type="button"
                onClick={() => setSelectedTier('recommended')}
                className={`p-3.5 rounded-xl border text-left transition relative ${
                  selectedTier === 'recommended'
                    ? 'border-[#234B36] bg-[#234B36]/10 ring-2 ring-[#234B36] shadow-xs'
                    : 'border-[#E5E0D5] bg-white hover:border-[#234B36]/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#234B36]">
                    Optimal (AI)
                  </span>
                  <span className="text-[10px] font-black bg-[#234B36] text-white px-1.5 py-0.5 rounded-md">
                    Recommended
                  </span>
                </div>
                <div className="text-sm font-black text-[#252923]">
                  ETB {prediction.predictedPrice.toLocaleString()}
                </div>
                <div className="text-xs font-bold text-[#234B36]">
                  ≈ ${prediction.predictedPriceUsd.toFixed(2)} USD
                </div>
                <p className="text-[11px] text-[#73776F] mt-1">
                  Balanced revenue and steady occupancy
                </p>
              </button>

              {/* Tier 3: High Margin / Peak */}
              <button
                type="button"
                onClick={() => setSelectedTier('max')}
                className={`p-3.5 rounded-xl border text-left transition relative ${
                  selectedTier === 'max'
                    ? 'border-[#234B36] bg-[#234B36]/5 ring-1 ring-[#234B36] shadow-xs'
                    : 'border-[#E5E0D5] bg-white hover:border-[#234B36]/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#73776F]">
                    Peak / High Margin
                  </span>
                  {selectedTier === 'max' && (
                    <span className="w-2 h-2 rounded-full bg-[#234B36]" />
                  )}
                </div>
                <div className="text-sm font-black text-[#252923]">
                  ETB {prediction.priceRange.max.toLocaleString()}
                </div>
                <div className="text-xs font-bold text-[#234B36]">
                  ≈ ${prediction.priceRange.maxUsd.toFixed(2)} USD
                </div>
                <p className="text-[11px] text-[#73776F] mt-1">
                  Peak holiday seasons, AU Summit &amp; festivals
                </p>
              </button>
            </div>
          </div>

          {/* ── Key Value Drivers & Local Market Realities ── */}
          <div className="border-t border-[#E5E0D5]/70 pt-3">
            <button
              type="button"
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="flex items-center justify-between w-full text-xs font-black text-[#73776F] hover:text-[#252923] transition py-1"
            >
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#234B36]" />
                <span>Pricing Factors &amp; Ethiopian Market Drivers ({prediction.breakdown.keyDrivers.length})</span>
              </span>
              {showBreakdown ? (
                <ChevronUp className="w-4 h-4 text-[#73776F]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#73776F]" />
              )}
            </button>

            {showBreakdown && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {prediction.breakdown.keyDrivers.map((driver, index) => (
                  <div
                    key={index}
                    className="p-2.5 rounded-lg bg-white border border-[#E5E0D5] flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          driver.type === 'premium'
                            ? 'bg-amber-500'
                            : driver.type === 'positive'
                            ? 'bg-[#234B36]'
                            : 'bg-gray-400'
                        }`}
                      />
                      <span className="font-bold text-[#252923] truncate">{driver.factor}</span>
                    </div>
                    <span className="font-semibold text-[#234B36] text-[11px] shrink-0 text-right">
                      {driver.impact}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
