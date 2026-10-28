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
  MapPin,
  Home,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Layers,
  Award,
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
  areaSqm?: number | string;
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
  areaSqm,
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

  const isSale = (listingType || '').toUpperCase() === 'SALE';

  // Resolve human-readable amenity names
  const selectedAmenityNames: string[] = amenityIds
    .map((id) => amenityCatalog.find((item) => item.id === id)?.name || id)
    .filter(Boolean);

  const numBedrooms = Math.max(0, parseInt(String(bedrooms), 10) || 0);
  const numBathrooms = Math.max(0, parseInt(String(bathrooms), 10) || 0);
  const numMaxGuests = Math.max(1, parseInt(String(maxGuests), 10) || 1);
  const numAreaSqm = parseFloat(String(areaSqm || 0)) || 0;
  const locationSummary = [neighborhood, subCity, city].filter(Boolean).join(', ') || 'Addis Ababa';

  // Highlight key Ethiopian infrastructure amenities
  const hasGenerator = selectedAmenityNames.some((a) =>
    /generator|power|backup|solar|electricity/i.test(a),
  );
  const hasWifi = selectedAmenityNames.some((a) => /wifi|internet|fiber/i.test(a));
  const hasWater = selectedAmenityNames.some((a) => /water|tank|reservoir|heater/i.test(a));
  const hasSecurity = selectedAmenityNames.some((a) => /security|guard|cctv|gated/i.test(a));

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
        bedrooms: numBedrooms,
        bathrooms: numBathrooms,
        maxGuests: numMaxGuests,
        areaSqm: numAreaSqm > 0 ? numAreaSqm : undefined,
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
    const unitLabel = isSale ? '' : ' / night';
    setAppliedNotice(`Applied ETB ${target.toLocaleString()}${unitLabel} to listing price ✓`);
    setTimeout(() => {
      setAppliedNotice(null);
    }, 4000);
  };

  const selectedValue = getTierPrice(selectedTier);
  const currentNumPrice =
    typeof currentPrice === 'string'
      ? parseFloat(currentPrice.replace(/[^0-9.]/g, '')) || 0
      : Number(currentPrice || 0);

  // Price difference vs current input
  const priceDiff = currentNumPrice > 0 ? selectedValue - currentNumPrice : 0;
  const priceDiffPct =
    currentNumPrice > 0
      ? Math.round((Math.abs(priceDiff) / currentNumPrice) * 1000) / 10
      : 0;

  // Monthly revenue estimate (rental only)
  const estMonthlyNights = selectedTier === 'min' ? 25 : selectedTier === 'max' ? 15 : 21;
  const estMonthlyRev = selectedValue * estMonthlyNights;
  const estOccupancyPct = selectedTier === 'min' ? 83 : selectedTier === 'max' ? 50 : 70;

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 ${
        prediction
          ? 'bg-gradient-to-br from-white via-[#FCFAF6] to-[#F5F8F5] border-[#234B36]/30 shadow-md p-4 sm:p-5'
          : 'bg-[#FCFAF6] border-[#E5E0D5] p-4 sm:p-5'
      } ${className}`}
    >
      {/* ════════ HEADER BAR ════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#234B36] to-[#2D5E43] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-4 h-4 text-[#E6C687]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-black text-[#252923] tracking-wide">
                {isSale ? 'AI Property Valuation Engine (ETB)' : 'AI Dynamic Pricing Recommendation (ETB)'}
              </h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#234B36]/10 text-[#234B36] border border-[#234B36]/20">
                <Activity className="w-2.5 h-2.5" />
                Enterprise Model
              </span>
            </div>
            <p className="text-[11px] text-[#73776F] mt-0.5 leading-snug">
              Calibrated for {city || 'Addis Ababa'} market demand, real spatial specs, and verified infrastructure.
            </p>
          </div>
        </div>

        {/* Trigger / Recalculate CTA */}
        {!prediction ? (
          <button
            type="button"
            onClick={handlePredictPrice}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#234B36] hover:bg-[#2D5E43] text-white text-xs font-black shadow-sm hover:shadow transition disabled:opacity-60 whitespace-nowrap cursor-pointer shrink-0"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Benchmarking…</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#E6C687]" />
                <span>Estimate Optimal Rate</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePredictPrice}
            disabled={loading}
            title="Recalculate with latest specs"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5E0D5] bg-white hover:bg-[#F8F5ED] text-[#73776F] hover:text-[#252923] text-xs font-bold transition shrink-0"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Recalculate</span>
          </button>
        )}
      </div>

      {/* ── Pre-estimation Context Pill Bar ── */}
      {!prediction && !loading && (
        <div className="mt-3.5 pt-3 border-t border-[#E5E0D5]/70 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-[10px] font-bold text-[#73776F] uppercase tracking-wider">Evaluating:</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#E5E0D5] font-semibold text-[#252923]">
            <MapPin className="w-3 h-3 text-[#234B36]" />
            {locationSummary}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#E5E0D5] font-semibold text-[#252923]">
            <Home className="w-3 h-3 text-[#234B36]" />
            {propertyType} · {numBedrooms} Bed · {numBathrooms} Bath
            {numAreaSqm > 0 && ` · ${numAreaSqm} m²`}
          </span>

          {/* Verified Infra Badges */}
          {hasGenerator && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
              ⚡ Generator
            </span>
          )}
          {hasWifi && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
              🌐 Fiber WiFi
            </span>
          )}
          {hasWater && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
              💧 Water Tank
            </span>
          )}
          {hasSecurity && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
              🛡️ Security
            </span>
          )}

          {currentNumPrice > 0 && (
            <span className="ml-auto text-xs text-[#73776F]">
              Current set: <strong>ETB {currentNumPrice.toLocaleString()}</strong>{isSale ? '' : ' / night'}
            </span>
          )}
        </div>
      )}

      {/* ── Loading Animation ── */}
      {loading && (
        <div className="mt-4 p-4 rounded-xl bg-white/80 border border-[#234B36]/20 space-y-3 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-3 w-36 bg-[#E5E0D5] rounded" />
            <div className="h-6 w-24 bg-[#E5E0D5] rounded-full" />
          </div>
          <div className="h-8 w-48 bg-[#E5E0D5] rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
            <div className="h-16 bg-[#E5E0D5]/60 rounded-xl" />
            <div className="h-16 bg-[#E5E0D5]/60 rounded-xl" />
            <div className="h-16 bg-[#E5E0D5]/60 rounded-xl" />
          </div>
          <p className="text-xs text-center text-[#73776F] font-semibold pt-1">
            Synthesizing {city || 'regional'} demand corridor, spatial square footage &amp; verified amenities…
          </p>
        </div>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center justify-between gap-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={handlePredictPrice}
            className="text-xs font-bold underline hover:no-underline shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Active Recommendation Results ── */}
      {prediction && !loading && (
        <div className="mt-4 space-y-3.5">
          {/* ════════ HERO VALUATION CARD ════════ */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#234B36]/25 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#73776F]">
                    {isSale ? 'Estimated Property Valuation' : 'Recommended Nightly Rate'}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    {Math.round(prediction.confidence * 100)}% Confidence
                  </span>
                </div>

                {/* Primary Price Display */}
                <div className="flex items-baseline gap-2.5">
                  <span className="text-3xl font-black text-[#252923] tracking-tight">
                    ETB {selectedValue.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-[#73776F]">
                    {isSale ? 'total asking' : '/ night'}
                  </span>
                </div>

                {/* Location tier & Comps */}
                <p className="text-[11px] text-[#73776F] font-medium flex items-center gap-1.5 flex-wrap">
                  <MapPin className="w-3 h-3 text-[#234B36] shrink-0" />
                  <span className="font-bold text-[#252923]">{prediction.breakdown.locationTier}</span>
                  <span>•</span>
                  <span>ETB market index benchmark</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:items-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleApply()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#234B36] hover:bg-[#2D5E43] text-white text-xs font-black shadow-md hover:shadow-lg transition cursor-pointer"
                >
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Apply This Price</span>
                </button>

                {/* Benchmark comparison pill against current input */}
                {currentNumPrice > 0 && (
                  <div className="text-[11px] font-bold">
                    {priceDiff > 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <ArrowUpRight className="w-3 h-3" />
                        +{priceDiffPct}% vs current input (+ETB {priceDiff.toLocaleString()})
                      </span>
                    ) : priceDiff < 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        <ArrowDownRight className="w-3 h-3" />
                        -{priceDiffPct}% lower for faster occupancy
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[#234B36] bg-[#234B36]/10 px-2 py-0.5 rounded-md">
                        <Check className="w-3 h-3" />
                        Exact match to your current input
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Monthly Yield Projection (Rentals only) */}
            {!isSale && (
              <div className="pt-2.5 border-t border-[#EEF3EF] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-[#252923]">
                  <TrendingUp className="w-3.5 h-3.5 text-[#234B36]" />
                  <span>Est. Monthly Revenue:</span>
                  <strong className="text-xs font-black text-[#234B36]">
                    ~ETB {estMonthlyRev.toLocaleString()} / mo
                  </strong>
                </div>
                <span className="text-[#73776F]">
                  Based on <strong>~{estOccupancyPct}% target occupancy</strong> ({estMonthlyNights} booked nights/month)
                </span>
              </div>
            )}
          </div>

          {/* Applied Notice Banner */}
          {appliedNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in duration-200">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{appliedNotice}</span>
            </div>
          )}

          {/* ════════ 3-TIER STRATEGIC CORRIDOR ════════ */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#73776F]">
                Strategic Pricing Corridor (Select to Apply):
              </span>
              <span className="text-[10px] text-[#73776F] font-semibold">
                Click any strategy to inspect
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Tier 1: Fast Booking */}
              <button
                type="button"
                onClick={() => setSelectedTier('min')}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  selectedTier === 'min'
                    ? 'border-[#234B36] bg-[#234B36]/5 ring-2 ring-[#234B36] shadow-xs'
                    : 'border-[#E5E0D5] bg-white hover:border-[#234B36]/40 hover:bg-[#FCFAF6]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#73776F] flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    {isSale ? 'Fast Liquidity' : 'Fast Booking'}
                  </span>
                  <span className="text-[9px] font-bold text-[#73776F] bg-[#F5F8F5] px-1.5 py-0.5 rounded">
                    {isSale ? '-12% closing' : '~83% occupancy'}
                  </span>
                </div>
                <div className="text-base font-black text-[#252923] mt-1">
                  ETB {prediction.priceRange.min.toLocaleString()}
                </div>
                <p className="text-[11px] text-[#73776F] mt-1 leading-snug">
                  {isSale
                    ? 'Priced for rapid buyer acquisition & fast transaction closing.'
                    : 'Initial 5-star reviews, rapid occupancy & near-zero calendar vacancy.'}
                </p>
              </button>

              {/* Tier 2: Recommended Optimal */}
              <button
                type="button"
                onClick={() => setSelectedTier('recommended')}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  selectedTier === 'recommended'
                    ? 'border-[#234B36] bg-emerald-50/50 ring-2 ring-[#234B36] shadow-xs'
                    : 'border-[#E5E0D5] bg-white hover:border-[#234B36]/40 hover:bg-[#FCFAF6]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#234B36] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#234B36]" />
                    Optimal (AI)
                  </span>
                  <span className="text-[9px] font-black bg-[#234B36] text-white px-2 py-0.5 rounded-md shadow-2xs">
                    Recommended
                  </span>
                </div>
                <div className="text-base font-black text-[#252923] mt-1">
                  ETB {prediction.predictedPrice.toLocaleString()}
                </div>
                <p className="text-[11px] text-[#73776F] mt-1 leading-snug">
                  {isSale
                    ? 'Fair market valuation maximizing total net proceeds.'
                    : 'The algorithmic sweet spot balancing ADR yield and steady bookings.'}
                </p>
              </button>

              {/* Tier 3: Peak / High Margin */}
              <button
                type="button"
                onClick={() => setSelectedTier('max')}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  selectedTier === 'max'
                    ? 'border-[#234B36] bg-[#234B36]/5 ring-2 ring-[#234B36] shadow-xs'
                    : 'border-[#E5E0D5] bg-white hover:border-[#234B36]/40 hover:bg-[#FCFAF6]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#73776F] flex items-center gap-1">
                    <Award className="w-3 h-3 text-purple-600" />
                    {isSale ? 'Premium Target' : 'Peak Season'}
                  </span>
                  <span className="text-[9px] font-bold text-[#73776F] bg-[#F5F8F5] px-1.5 py-0.5 rounded">
                    {isSale ? '+15% ceiling' : 'High Margin'}
                  </span>
                </div>
                <div className="text-base font-black text-[#252923] mt-1">
                  ETB {prediction.priceRange.max.toLocaleString()}
                </div>
                <p className="text-[11px] text-[#73776F] mt-1 leading-snug">
                  {isSale
                    ? 'Upper ceiling valuation for unhurried premium negotiations.'
                    : 'Diaspora peaks, AU Summits, Meskel/Timkat holidays & weekends.'}
                </p>
              </button>
            </div>
          </div>

          {/* ════════ TRANSPARENT BREAKDOWN TOGGLE ════════ */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowBreakdown((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#234B36] hover:text-[#2D5E43] hover:underline"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>
                {showBreakdown ? 'Hide Valuation Breakdown' : 'How AI Calculated This Rate (View Valuation Breakdown)'}
              </span>
              {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showBreakdown && (
              <div className="mt-3 p-4 rounded-xl bg-white border border-[#E5E0D5] space-y-3.5 text-xs text-[#252923]">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-3 border-b border-[#EEF3EF]">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#73776F] block">
                      Base Space Allocation
                    </span>
                    <span className="text-sm font-black text-[#252923] mt-0.5 block">
                      ETB {prediction.breakdown.baseRateEtb.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-[#73776F]">
                      {isSale ? 'Base land/sqm index' : 'Base capacity & room layout'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#73776F] block">
                      Location Multiplier
                    </span>
                    <span className="text-sm font-black text-[#234B36] mt-0.5 block">
                      {prediction.breakdown.locationMultiplier}x
                    </span>
                    <span className="text-[11px] text-[#73776F]">
                      {prediction.breakdown.locationTier}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#73776F] block">
                      Verified Amenities Premium
                    </span>
                    <span className="text-sm font-black text-emerald-700 mt-0.5 block">
                      +ETB {prediction.breakdown.amenitiesPremiumEtb.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-[#73776F]">
                      Added value from infrastructure
                    </span>
                  </div>
                </div>

                {/* Key Drivers List */}
                {prediction.breakdown.keyDrivers && prediction.breakdown.keyDrivers.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#73776F] block">
                      Key Valuation Drivers Detected:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {prediction.breakdown.keyDrivers.map((driver, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg border border-[#E5E0D5]/70 bg-[#FCFAF6] flex items-start justify-between gap-2"
                        >
                          <div>
                            <span className="font-bold text-[#252923] block text-[11px]">
                              {driver.factor}
                            </span>
                            <span className="text-[10px] text-[#73776F] mt-0.5 block">
                              {driver.impact}
                            </span>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 ${
                              driver.type === 'premium'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {driver.type === 'premium' ? '★ Premium' : '✓ Verified'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Host Tip */}
                <div className="p-3 rounded-lg bg-[#F8F5ED] border border-[#E5E0D5] flex items-start gap-2 text-[11px] text-[#73776F]">
                  <Info className="w-4 h-4 text-[#234B36] shrink-0 mt-0.5" />
                  <span>
                    <strong>Market Insight:</strong> In Addis Ababa, listings equipped with a verified automatic standby generator and high-speed fiber internet command up to <strong>20-35% higher average daily rates</strong> and experience 40% lower cancellation rates during rainy and festival seasons.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
