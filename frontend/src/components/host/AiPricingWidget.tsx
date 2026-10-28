'use client';

import React, { useState, useTransition } from 'react';
import { apiFetch } from '../../lib/api';
import type { AiPricePredictionResponse } from '../../types/host';
import {
  Sparkles,
  TrendingUp,
  Check,
  RotateCcw,
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
  listingType?: string;
  bedrooms: number | string;
  bathrooms: number | string;
  maxGuests: number | string;
  amenityIds: string[];
  amenityCatalog?: Array<{ id: string; name: string }>;
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
  listingType = 'RENTAL',
  bedrooms,
  bathrooms,
  maxGuests,
  amenityIds,
  amenityCatalog = [],
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

  // Resolve human-readable amenity names
  const selectedAmenityNames: string[] = amenityIds
    .map((id) => amenityCatalog.find((item) => item.id === id)?.name || id)
    .filter(Boolean);

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
        listingType: listingType || 'RENTAL',
        bedrooms: Math.max(0, parseInt(String(bedrooms), 10) || 0),
        bathrooms: Math.max(0, parseInt(String(bathrooms), 10) || 0),
        maxGuests: Math.max(1, parseInt(String(maxGuests), 10) || 1),
        amenities: selectedAmenityNames.length > 0 ? selectedAmenityNames : amenityIds,
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
    if (!prediction) return 0;
    if (tier === 'min') return prediction.priceRange.min;
    if (tier === 'max') return prediction.priceRange.max;
    return prediction.predictedPrice;
  };

  const handleApply = (tierToApply?: SelectedTier) => {
    const tier = tierToApply || selectedTier;
    const target = getTierPrice(tier);
    if (!target) return;

    onApplyPrice(target);
    setAppliedNotice(`Applied ETB ${target.toLocaleString()} to listing price`);
    setTimeout(() => {
      setAppliedNotice(null);
    }, 3500);
  };

  const selectedValue = getTierPrice(selectedTier);
  const currentNumPrice = typeof currentPrice === 'string' ? parseFloat(currentPrice) : currentPrice;

  return (
    <div
      className={`rounded-2xl border transition-all ${
        prediction
          ? 'bg-gradient-to-br from-white via-[#FCFAF6] to-[#F5F8F5] border-[#234B36]/30 shadow-md p-4 sm:p-5'
          : 'bg-[#FCFAF6] border-[#E5E0D5] p-3.5 sm:p-4'
      } ${className}`}
    >
      {/* ── Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#234B36] to-[#2D5E43] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles className="w-4 h-4 text-[#E6C687]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black text-[#252923]">
                AI Price Recommendation (ETB)
              </h4>
            </div>
            <p className="text-[11px] text-[#73776F] mt-0.5">
              Calibrated for {city || 'regional'} demand, property type, and verified amenities.
            </p>
          </div>
        </div>

        {/* Trigger Button */}
        {!prediction && (
          <button
            type="button"
            onClick={handlePredictPrice}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#234B36] hover:bg-[#2D5E43] text-white text-xs font-black shadow-2xs transition disabled:opacity-60 whitespace-nowrap cursor-pointer shrink-0"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Calculating…</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#E6C687]" />
                <span>Estimate Optimal Rate</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="mt-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center justify-between gap-2">
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

      {/* ── Active Recommendation Results ── */}
      {prediction && !loading && (
        <div className="mt-4 space-y-4">
          {/* Main Rate Highlight */}
          <div className="p-4 rounded-xl bg-white border border-[#234B36]/20 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#73776F] block">
                Recommended Nightly Rate
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-[#252923]">
                  ETB {selectedValue.toLocaleString()}
                </span>
                <span className="text-xs text-[#73776F]">/ night</span>
              </div>
              <p className="text-[11px] text-[#73776F] mt-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Confidence: <strong>{Math.round(prediction.confidence * 100)}%</strong></span>
                <span>•</span>
                <span>{prediction.breakdown.locationTier}</span>
              </p>
            </div>

            {/* Direct Action Button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleApply()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#234B36] hover:bg-[#2D5E43] text-white text-xs font-black shadow-xs transition"
              >
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Apply This Price</span>
              </button>

              <button
                type="button"
                onClick={handlePredictPrice}
                title="Recalculate rate"
                className="p-2 rounded-xl border border-[#E5E0D5] hover:bg-[#F8F5ED] text-[#73776F] transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Applied Notice */}
          {appliedNotice && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{appliedNotice}</span>
            </div>
          )}

          {/* ── 3-Tier Competitive Corridor ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Tier 1: Fast Booking */}
            <button
              type="button"
              onClick={() => setSelectedTier('min')}
              className={`p-3 rounded-xl border text-left transition ${
                selectedTier === 'min'
                  ? 'border-[#234B36] bg-[#234B36]/5 ring-1 ring-[#234B36]'
                  : 'border-[#E5E0D5] bg-white hover:border-[#234B36]/40'
              }`}
            >
              <div className="text-[10px] font-black uppercase tracking-wider text-[#73776F]">
                Fast Booking
              </div>
              <div className="text-sm font-black text-[#252923] mt-0.5">
                ETB {prediction.priceRange.min.toLocaleString()}
              </div>
              <p className="text-[10px] text-[#73776F] mt-0.5">
                Early reviews &amp; quick occupancy
              </p>
            </button>

            {/* Tier 2: Recommended Optimal */}
            <button
              type="button"
              onClick={() => setSelectedTier('recommended')}
              className={`p-3 rounded-xl border text-left transition ${
                selectedTier === 'recommended'
                  ? 'border-[#234B36] bg-[#234B36]/10 ring-2 ring-[#234B36]'
                  : 'border-[#E5E0D5] bg-white hover:border-[#234B36]/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#234B36]">
                  Optimal (AI)
                </span>
                <span className="text-[9px] font-black bg-[#234B36] text-white px-1.5 py-0.2 rounded">
                  Recommended
                </span>
              </div>
              <div className="text-sm font-black text-[#252923] mt-0.5">
                ETB {prediction.predictedPrice.toLocaleString()}
              </div>
              <p className="text-[10px] text-[#73776F] mt-0.5">
                Balanced revenue &amp; steady bookings
              </p>
            </button>

            {/* Tier 3: Peak / High Margin */}
            <button
              type="button"
              onClick={() => setSelectedTier('max')}
              className={`p-3 rounded-xl border text-left transition ${
                selectedTier === 'max'
                  ? 'border-[#234B36] bg-[#234B36]/5 ring-1 ring-[#234B36]'
                  : 'border-[#E5E0D5] bg-white hover:border-[#234B36]/40'
              }`}
            >
              <div className="text-[10px] font-black uppercase tracking-wider text-[#73776F]">
                Peak Season
              </div>
              <div className="text-sm font-black text-[#252923] mt-0.5">
                ETB {prediction.priceRange.max.toLocaleString()}
              </div>
              <p className="text-[10px] text-[#73776F] mt-0.5">
                Holidays, summits &amp; festivals
              </p>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
