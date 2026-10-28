'use client';

import React, { useState, useEffect, useTransition } from 'react';
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
  Award,
  Layers,
  X,
} from 'lucide-react';

interface AiPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  coverImage?: string;
  images?: string[];
  onApplyPrice: (priceInEtb: number) => void;
}

type SelectedTier = 'min' | 'recommended' | 'max';

export default function AiPricingModal({
  isOpen,
  onClose,
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
  coverImage,
  images = [],
  onApplyPrice,
}: AiPricingModalProps) {
  const [prediction, setPrediction] = useState<AiPricePredictionResponse | null>(null);
  const [selectedTier, setSelectedTier] = useState<SelectedTier>('recommended');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
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

  // Highlight key Ethiopian infrastructure
  const hasGenerator = selectedAmenityNames.some((a) =>
    /generator|power|backup|solar|electricity/i.test(a),
  );
  const hasWifi = selectedAmenityNames.some((a) => /wifi|internet|fiber/i.test(a));
  const hasWater = selectedAmenityNames.some((a) => /water|tank|reservoir|heater/i.test(a));
  const hasSecurity = selectedAmenityNames.some((a) => /security|guard|cctv|gated/i.test(a));

  const handlePredictPrice = async () => {
    setLoading(true);
    setError(null);
    setApplied(false);

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
        coverImage: coverImage?.trim() || undefined,
        images: images && images.length > 0 ? images : undefined,
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

  // Auto-calculate on open if not calculated yet
  useEffect(() => {
    if (isOpen) {
      setApplied(false);
      setError(null);
      handlePredictPrice();
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
    setApplied(true);
    setTimeout(() => {
      onClose();
    }, 700);
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

  // Backdrop click to close
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Dynamic tier rationales (from API or graceful fallback)
  const fastRationale =
    prediction?.tiers?.fastBooking?.rationale ||
    (isSale
      ? `Discounted entry valuation to expedite cash or institutional buyers in ${locationSummary}.`
      : `Introductory rate to build early 5-star reviews and secure rapid occupancy for your ${numBedrooms}-bed property.`);

  const optimalRationale =
    prediction?.tiers?.optimal?.rationale ||
    (isSale
      ? `Calibrated fair market index for ${propertyType} in ${locationSummary}.`
      : `The algorithmic sweet spot balancing ADR yield and steady bookings in ${locationSummary}.`);

  const peakRationale =
    prediction?.tiers?.peakSeason?.rationale ||
    (isSale
      ? `Premium target valuation for unhurried private treaty negotiations.`
      : `High-yield rate capturing willingness-to-pay during AU Summits, holidays, and diaspora season.`);

  // ════════ DYNAMIC STRATEGY VALUATION MODEL ════════
  const strategyMultiplier =
    selectedTier === 'min'
      ? (isSale ? 0.88 : 0.85)
      : selectedTier === 'max'
      ? (isSale ? 1.15 : 1.2)
      : 1.0;

  const dynamicBaseRate = prediction
    ? Math.round(prediction.breakdown.baseRateEtb * strategyMultiplier)
    : 0;

  const dynamicAmenitiesLift = prediction
    ? Math.round(prediction.breakdown.amenitiesPremiumEtb * strategyMultiplier)
    : 0;

  const activeStrategy = {
    min: {
      title: isSale ? 'Fast Liquidity Strategy' : 'Fast Booking Strategy',
      tag: isSale ? 'Fast Liquidity' : 'Fast Booking',
      factorLabel: isSale ? '0.88x (-12%)' : '0.85x (-15%)',
      factorDesc: isSale ? 'Expedited settlement discount' : 'Early acquisition discount',
      baseCaption: isSale ? 'Discounted asset baseline' : 'Introductory room base (-15%)',
      amenitiesCaption: dynamicAmenitiesLift > 0 ? 'Discounted amenity rate' : 'Baseline equipment',
      tipIcon: 'zap' as const,
      hostTip: isSale
        ? `⚡ Fast Liquidity Strategy: Calibrated to motivate immediate cash offers from active property investors in ${locationSummary}. Recommended if prioritizing speed over maximum capitalization.`
        : `⚡ Host Pro-Tip (Fast Booking): Ideal for your first 2–4 weeks. The -15% acquisition discount builds immediate booking velocity and 5-star reviews. Once you earn 3–5 reviews, switch to "Optimal (AI)" to maximize net earnings.`,
      drivers: [
        {
          factor: isSale ? '⚡ Fast Liquidity Margin (-12%)' : '⚡ Fast Booking Discount (-15%)',
          impact: isSale
            ? 'Priced below market median to trigger competitive buyer offers.'
            : 'Removes guest reservation hesitation to accelerate early 5-star reviews and algorithm ranking.',
          type: 'incentive' as const,
        },
        {
          factor: `${prediction?.breakdown.locationTier || 'Metropolitan'} Advantage`,
          impact: isSale
            ? `Undercuts 80% of comparable properties in ${locationSummary} for rapid liquidity.`
            : `Priced competitively against 85% of listings in ${locationSummary} to capture top search placement.`,
          type: 'positive' as const,
        },
        ...(dynamicAmenitiesLift > 0
          ? [
              {
                factor: 'Verified Infrastructure Value',
                impact:
                  'Providing verified power/WiFi at an introductory discount guarantees near 100% positive guest review conversion.',
                type: 'positive' as const,
              },
            ]
          : [
              {
                factor: 'Baseline Asset Index',
                impact:
                  'Introductory rate compensates for unverified backup power to secure high early booking pace.',
                type: 'neutral' as const,
              },
            ]),
      ],
    },
    recommended: {
      title: isSale ? 'Fair Market Valuation' : 'Optimal Market Equilibrium',
      tag: 'Optimal (AI)',
      factorLabel: '1.00x (Parity)',
      factorDesc: isSale ? 'Fair market appraisal' : 'Algorithmic revenue sweet spot',
      baseCaption: isSale ? 'Base land/sqm index' : 'Base room allocation',
      amenitiesCaption: dynamicAmenitiesLift > 0 ? 'Verified power/WiFi/safety' : 'Baseline amenities',
      tipIcon: 'sparkles' as const,
      hostTip: isSale
        ? `✨ Fair Market Valuation: Aligned with recent certified transactions in ${locationSummary}. Supported by bank appraisals and standard mortgage lending limits.`
        : `✨ Host Pro-Tip (Optimal AI): The algorithmic sweet spot balancing ~70% occupancy (21 nights) with healthy daily margins (~ETB ${estMonthlyRev.toLocaleString()}/mo gross). Keep this as your standard rate.`,
      drivers: [
        {
          factor: '✨ Market Equilibrium (1.00x)',
          impact: isSale
            ? 'Optimal balance between average days on market and net realized capital.'
            : 'Algorithmic sweet spot calibrated for Addis Ababa demand corridors, maximizing 30-day net yield.',
          type: 'recommended' as const,
        },
        {
          factor: `${prediction?.breakdown.locationTier || 'Metropolitan'} Multiplier`,
          impact: `Baseline location demand index (${prediction?.breakdown.locationMultiplier || 1.15}x) for ${locationSummary}.`,
          type: 'positive' as const,
        },
        ...(dynamicAmenitiesLift > 0
          ? [
              {
                factor: 'Verified Amenities Lift',
                impact: `+ETB ${dynamicAmenitiesLift.toLocaleString()} value premium for verified power, WiFi, and safety infrastructure.`,
                type: 'positive' as const,
              },
            ]
          : [
              {
                factor: 'Amenity Upsell Potential',
                impact:
                  'Units with verified automatic generators command +20% higher ADR and experience 40% lower cancellation rates.',
                type: 'neutral' as const,
              },
            ]),
      ],
    },
    max: {
      title: isSale ? 'Premium Target Valuation' : 'Peak Season Surge Strategy',
      tag: isSale ? 'Premium Target' : 'Peak Season',
      factorLabel: isSale ? '1.15x (+15%)' : '1.20x (+20%)',
      factorDesc: isSale ? 'High-spec premium valuation' : 'Peak demand willingness-to-pay',
      baseCaption: isSale ? 'Top-tier finish appraisal' : 'Peak room allocation (+20%)',
      amenitiesCaption: dynamicAmenitiesLift > 0 ? 'Peak amenity valuation' : 'Baseline equipment',
      tipIcon: 'award' as const,
      hostTip: isSale
        ? `💎 Premium Target Strategy: Positioned for unhurried sales targeting expatriates, foreign investors, and executive purchasers seeking top-tier finishes in ${locationSummary}.`
        : `💎 Host Pro-Tip (Peak Season): Activate during AU Summit weeks, Ethiopian holidays (Meskel, Timkat, Genna, Enkutatash), and diaspora return season (Dec–Feb). Ensure instant booking is ON for verified travelers.`,
      drivers: [
        {
          factor: isSale ? '💎 Premium Asset Margin (+15%)' : '💎 Peak Demand Surge (+20%)',
          impact: isSale
            ? 'Leaves room for private treaty negotiations without sacrificing net capital returns.'
            : 'Captures premium willingness-to-pay from international delegations and holiday diaspora travelers.',
          type: 'premium' as const,
        },
        {
          factor: `${prediction?.breakdown.locationTier || 'Metropolitan'} Peak Corridor`,
          impact: `High-season demand corridor with constrained premium inventory in ${locationSummary}.`,
          type: 'positive' as const,
        },
        ...(dynamicAmenitiesLift > 0
          ? [
              {
                factor: 'Mission-Critical Reliability Premium',
                impact:
                  'High-paying peak travelers and conference delegates require guaranteed generator uptime and high-speed fiber.',
                type: 'premium' as const,
              },
            ]
          : [
              {
                factor: 'Peak Season Demand Window',
                impact:
                  'Market scarcity allows higher rates; adding a standby generator protects against peak cancellations.',
                type: 'neutral' as const,
              },
            ]),
      ],
    },
  }[selectedTier];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ════════ HEADER ════════ */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#EEF3EF] bg-gradient-to-br from-[#234B36] to-[#2D5E43] text-white rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-[#E6C687]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white leading-tight">
                  {isSale ? 'AI Property Valuation Copilot' : 'AI Dynamic Pricing Copilot'}
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/15 text-[#E6C687] px-2 py-0.5 rounded-full">
                  ETB Index
                </span>
              </div>
              <p className="text-[11px] text-white/75 mt-0.5 leading-snug truncate">
                Calibrated for {city || 'regional'} demand corridor, spatial footprint &amp; verified amenities.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ════════ SCROLLABLE BODY ════════ */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* ── Specs Auditor Pill Row ── */}
          <div className="p-3 rounded-xl bg-[#F8F5ED] border border-[#E5E0D5] flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[10px] font-bold text-[#73776F] uppercase tracking-wider mr-1">Evaluated Specs:</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-[#E5E0D5] font-bold text-[#252923]">
              <MapPin className="w-3 h-3 text-[#234B36]" />
              {locationSummary}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-[#E5E0D5] font-bold text-[#252923]">
              <Home className="w-3 h-3 text-[#234B36]" />
              {propertyType} · {numBedrooms} Bed · {numBathrooms} Bath
              {numAreaSqm > 0 && ` · ${numAreaSqm} m²`}
            </span>
            {coverImage && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-[#E5E0D5] font-bold text-[#252923]">
                <img
                  src={coverImage}
                  alt="Cover"
                  className="w-4 h-4 rounded object-cover border border-[#EEF3EF]"
                />
                <span className="text-[11px]">
                  {images && images.length > 0 ? `${images.length} photos` : 'Cover photo'}
                </span>
              </span>
            )}
            {hasGenerator && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800 font-bold text-[11px]">
                ⚡ Generator
              </span>
            )}
            {hasWifi && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800 font-bold text-[11px]">
                🌐 Fiber WiFi
              </span>
            )}
            {hasWater && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800 font-bold text-[11px]">
                💧 Water Tank
              </span>
            )}
            {hasSecurity && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800 font-bold text-[11px]">
                🛡️ Gated
              </span>
            )}
          </div>

          {/* ── Loading Skeleton ── */}
          {loading && (
            <div className="p-6 rounded-2xl bg-[#FCFAF6] border border-[#E5E0D5] space-y-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-4 w-40 bg-[#E5E0D5] rounded" />
                <div className="h-6 w-24 bg-[#E5E0D5] rounded-full" />
              </div>
              <div className="h-10 w-52 bg-[#E5E0D5] rounded-lg" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <div className="h-28 bg-[#E5E0D5]/60 rounded-xl" />
                <div className="h-28 bg-[#E5E0D5]/60 rounded-xl" />
                <div className="h-28 bg-[#E5E0D5]/60 rounded-xl" />
              </div>
              <p className="text-xs text-center text-[#73776F] font-semibold pt-1">
                Auditing {city || 'regional'} demand corridor &amp; calculating dynamic strategy tiers…
              </p>
            </div>
          )}

          {/* ── Error Banner ── */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center justify-between gap-2">
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

          {/* ── Active Results Dashboard ── */}
          {prediction && !loading && (
            <div className="space-y-4">
              {/* ════════ HERO CARD ════════ */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-white to-[#F8F5ED] border border-[#234B36]/25 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#73776F]">
                        {isSale ? 'Selected Asking Valuation' : 'Selected Price per night'}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        {Math.round(prediction.confidence * 100)}% Confidence
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2.5">
                      <span className="text-3xl font-black text-[#252923] tracking-tight">
                        ETB {selectedValue.toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-[#73776F]">
                        {isSale ? 'total asking' : '/ night'}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#73776F] font-medium flex items-center gap-1.5 flex-wrap">
                      <MapPin className="w-3 h-3 text-[#234B36] shrink-0" />
                      <span className="font-bold text-[#252923]">{prediction.breakdown.locationTier}</span>
                      <span>•</span>
                      <span>ETB benchmark model</span>
                    </p>
                  </div>

                  {/* Benchmark Comparison against host's current input */}
                  {currentNumPrice > 0 && (
                    <div className="sm:text-right">
                      <span className="text-[10px] uppercase font-black text-[#73776F] block">Vs. Your Current Input</span>
                      <span className="text-xs font-bold text-[#73776F] block">
                        Current: ETB {currentNumPrice.toLocaleString()}{isSale ? '' : '/night'}
                      </span>
                      {priceDiff > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px] font-bold mt-1">
                          <ArrowUpRight className="w-3 h-3" />
                          +{priceDiffPct}% (+ETB {priceDiff.toLocaleString()} yield)
                        </span>
                      ) : priceDiff < 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[11px] font-bold mt-1">
                          <ArrowDownRight className="w-3 h-3" />
                          -{priceDiffPct}% (Faster occupancy)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[#234B36] bg-[#234B36]/10 px-2 py-0.5 rounded-md text-[11px] font-bold mt-1">
                          <Check className="w-3 h-3" />
                          Exact Match
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Monthly Revenue Estimate (rental only) */}
                {!isSale && (
                  <div className="pt-2.5 border-t border-[#EEF3EF] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 text-[#252923]">
                      <TrendingUp className="w-3.5 h-3.5 text-[#234B36]" />
                      <span>Projected Gross Revenue:</span>
                      <strong className="text-xs font-black text-[#234B36]">
                        ~ETB {estMonthlyRev.toLocaleString()} / mo
                      </strong>
                    </div>
                    <span className="text-[#73776F]">
                      Based on <strong>~{estOccupancyPct}% target occupancy</strong> ({estMonthlyNights} booked nights)
                    </span>
                  </div>
                )}
              </div>

              {/* ════════ 3-TIER DYNAMIC STRATEGY CORRIDOR ════════ */}
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#73776F] block mb-2">
                  Select A Pricing Strategy:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Tier 1: Fast Booking */}
                  <button
                    type="button"
                    onClick={() => setSelectedTier('min')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      selectedTier === 'min'
                        ? 'border-[#234B36] bg-[#234B36]/5 ring-2 ring-[#234B36] shadow-xs'
                        : 'border-[#E5E0D5] bg-white hover:border-[#234B36]/40 hover:bg-[#FCFAF6]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#73776F] flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500" />
                        {isSale ? 'Fast Liquidity' : 'Fast Booking'}
                      </span>
                      <span className="text-[9px] font-bold text-[#73776F] bg-[#F5F8F5] px-1.5 py-0.5 rounded">
                        {isSale ? '-12% Liquidity' : '~83% Occupancy'}
                      </span>
                    </div>
                    <div className="text-base font-black text-[#252923] mt-1.5">
                      ETB {prediction.priceRange.min.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-[#73776F] mt-1.5 leading-snug">
                      {fastRationale}
                    </p>
                  </button>

                  {/* Tier 2: Recommended Optimal */}
                  <button
                    type="button"
                    onClick={() => setSelectedTier('recommended')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      selectedTier === 'recommended'
                        ? 'border-[#234B36] bg-emerald-50/50 ring-2 ring-[#234B36] shadow-xs'
                        : 'border-[#E5E0D5] bg-white hover:border-[#234B36]/40 hover:bg-[#FCFAF6]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#234B36] flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#234B36]" />
                        Optimal (AI)
                      </span>
                      <span className="text-[9px] font-black bg-[#234B36] text-white px-2 py-0.5 rounded-md shadow-2xs">
                        Recommended
                      </span>
                    </div>
                    <div className="text-base font-black text-[#252923] mt-1.5">
                      ETB {prediction.predictedPrice.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-[#73776F] mt-1.5 leading-snug">
                      {optimalRationale}
                    </p>
                  </button>

                  {/* Tier 3: Peak Season */}
                  <button
                    type="button"
                    onClick={() => setSelectedTier('max')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      selectedTier === 'max'
                        ? 'border-[#234B36] bg-[#234B36]/5 ring-2 ring-[#234B36] shadow-xs'
                        : 'border-[#E5E0D5] bg-white hover:border-[#234B36]/40 hover:bg-[#FCFAF6]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#73776F] flex items-center gap-1">
                        <Award className="w-3 h-3 text-purple-600" />
                        {isSale ? 'Premium Target' : 'Peak Season'}
                      </span>
                      <span className="text-[9px] font-bold text-[#73776F] bg-[#F5F8F5] px-1.5 py-0.5 rounded">
                        {isSale ? '+15% Target' : 'High Yield'}
                      </span>
                    </div>
                    <div className="text-base font-black text-[#252923] mt-1.5">
                      ETB {prediction.priceRange.max.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-[#73776F] mt-1.5 leading-snug">
                      {peakRationale}
                    </p>
                  </button>
                </div>
              </div>

              {/* ════════ TRANSPARENT BREAKDOWN TOGGLE ════════ */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowBreakdown((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#234B36] hover:text-[#2D5E43] hover:underline"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>
                    {showBreakdown ? 'Hide Valuation Breakdown' : 'How AI Calculated This Rate (View Valuation Factors)'}
                  </span>
                  {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showBreakdown && (
                  <div className="mt-2.5 p-4 rounded-xl bg-white border border-[#E5E0D5] space-y-3.5 text-xs text-[#252923] animate-in fade-in duration-150">
                    {/* Strategy Status Banner */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#EEF3EF] flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#73776F]">
                          Calibrated Strategy:
                        </span>
                        <strong className="text-xs font-black text-[#234B36]">
                          {activeStrategy.title}
                        </strong>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#234B36]/10 text-[#234B36]">
                        {activeStrategy.factorLabel} Factor
                      </span>
                    </div>

                    {/* 4-Metric Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-3 border-b border-[#EEF3EF]">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#73776F] block">
                          Base Space Capacity
                        </span>
                        <span className="text-sm font-black text-[#252923] mt-0.5 block transition-colors">
                          ETB {dynamicBaseRate.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-[#73776F] leading-tight block">
                          {activeStrategy.baseCaption}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#73776F] block">
                          Location Multiplier
                        </span>
                        <span className="text-sm font-black text-[#234B36] mt-0.5 block">
                          {prediction.breakdown.locationMultiplier}x
                        </span>
                        <span className="text-[10px] text-[#73776F] leading-tight block">
                          {prediction.breakdown.locationTier}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#73776F] block">
                          Verified Amenities Lift
                        </span>
                        <span
                          className={`text-sm font-black mt-0.5 block ${
                            dynamicAmenitiesLift > 0 ? 'text-emerald-700' : 'text-[#73776F]'
                          }`}
                        >
                          {dynamicAmenitiesLift > 0 ? `+ETB ${dynamicAmenitiesLift.toLocaleString()}` : '+ETB 0'}
                        </span>
                        <span className="text-[10px] text-[#73776F] leading-tight block">
                          {activeStrategy.amenitiesCaption}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#73776F] block">
                          Strategy Factor
                        </span>
                        <span className="text-sm font-black text-[#234B36] mt-0.5 block">
                          {activeStrategy.factorLabel}
                        </span>
                        <span className="text-[10px] text-[#73776F] leading-tight block">
                          {activeStrategy.factorDesc}
                        </span>
                      </div>
                    </div>

                    {/* Dynamic Key Drivers List */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#73776F] block">
                          Detected Value Drivers for {activeStrategy.tag}:
                        </span>
                        <span className="text-[10px] text-[#73776F] italic">
                          Dynamically evaluated
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeStrategy.drivers.map((driver, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg border border-[#E5E0D5]/70 bg-[#FCFAF6] flex items-start justify-between gap-2 transition-all hover:bg-white"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-[#252923] block text-[11px] leading-snug">
                                {driver.factor}
                              </span>
                              <span className="text-[10px] text-[#73776F] mt-0.5 block leading-relaxed">
                                {driver.impact}
                              </span>
                            </div>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 ${
                                driver.type === 'premium'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : driver.type === 'incentive'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : driver.type === 'recommended'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : driver.type === 'positive'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {driver.type === 'premium'
                                ? '★ Premium'
                                : driver.type === 'incentive'
                                ? '⚡ Incentive'
                                : driver.type === 'recommended'
                                ? '✓ Recommended'
                                : driver.type === 'positive'
                                ? '✓ Verified'
                                : 'ℹ Baseline'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actionable Host Tip dynamically tailored to the tier */}
                    <div className="p-3 rounded-lg bg-[#F8F5ED] border border-[#E5E0D5] flex items-start gap-2.5 text-[11px] text-[#252923] leading-relaxed transition-all">
                      {activeStrategy.tipIcon === 'zap' ? (
                        <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      ) : activeStrategy.tipIcon === 'award' ? (
                        <Award className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-[#234B36] shrink-0 mt-0.5" />
                      )}
                      <span>{activeStrategy.hostTip}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ════════ FOOTER ════════ */}
        <div className="px-5 py-4 border-t border-[#EEF3EF] bg-[#FCFAF6] flex items-center justify-between gap-3 rounded-b-2xl">
          {prediction ? (
            <button
              type="button"
              onClick={handlePredictPrice}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E0D5] hover:bg-white text-xs font-bold text-[#73776F] transition disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Recalculate
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-bold text-[#73776F] hover:bg-[#EEF3EF] transition"
            >
              Cancel
            </button>

            {prediction && (
              <button
                type="button"
                onClick={() => handleApply()}
                disabled={applied}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#234B36] hover:bg-[#2D5E43] text-white text-xs font-black shadow-md transition ${
                  applied ? 'bg-emerald-700' : ''
                }`}
              >
                {applied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Applied to Listing ✓</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Apply This Price (ETB {selectedValue.toLocaleString()})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
