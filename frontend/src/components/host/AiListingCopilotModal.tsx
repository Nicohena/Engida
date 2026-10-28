'use client';

import React, { useState, useTransition } from 'react';
import { apiFetch } from '../../lib/api';
import type { GenerateListingContentResponse } from '../../types/host';
import {
  Sparkles,
  Check,
  RotateCcw,
  Languages,
  X,
  FileText,
  BadgeCheck,
  MapPin,
  Home,
  Zap,
  Info,
} from 'lucide-react';

interface AiListingCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyType: string;
  listingType?: string;
  city: string;
  subCity?: string;
  neighborhood?: string;
  bedrooms: number | string;
  bathrooms: number | string;
  maxGuests: number | string;
  areaSqm?: number | string;
  amenityIds: string[];
  amenityCatalog?: Array<{ id: string; name: string }>;
  currentTitle?: string;
  currentDescription?: string;
  onApplyTitle: (title: string) => void;
  onApplyDescription: (description: string) => void;
  onApplyBoth: (title: string, description: string) => void;
}

type LanguageOption = 'en' | 'am';
type ToneOption = 'luxury' | 'warm' | 'business';

export default function AiListingCopilotModal({
  isOpen,
  onClose,
  propertyType,
  listingType = 'RENTAL',
  city,
  subCity,
  neighborhood,
  bedrooms,
  bathrooms,
  maxGuests,
  areaSqm,
  amenityIds,
  amenityCatalog = [],
  onApplyTitle,
  onApplyDescription,
  onApplyBoth,
}: AiListingCopilotModalProps) {
  const [language, setLanguage] = useState<LanguageOption>('en');
  const [tone, setTone] = useState<ToneOption>('luxury');
  const [result, setResult] = useState<GenerateListingContentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (!isOpen) return null;

  // Resolve human-readable amenity names
  const selectedAmenityNames: string[] = amenityIds
    .map((id) => amenityCatalog.find((item) => item.id === id)?.name || id)
    .filter(Boolean);

  const numBedrooms = Math.max(0, parseInt(String(bedrooms), 10) || 0);
  const numBathrooms = Math.max(0, parseInt(String(bathrooms), 10) || 0);
  const numAreaSqm = parseFloat(String(areaSqm || 0)) || 0;
  const locationLabel = [neighborhood, subCity, city].filter(Boolean).join(', ') || 'Ethiopia';

  const handleGenerate = async (targetLang?: LanguageOption, targetTone?: ToneOption) => {
    const activeLang = targetLang || language;
    const activeTone = targetTone || tone;

    setLoading(true);
    setError(null);
    setAppliedNotice(null);

    try {
      const payload = {
        propertyType: propertyType || 'APARTMENT',
        listingType: listingType || 'RENTAL',
        city: city || 'Addis Ababa',
        subCity: subCity || undefined,
        neighborhood: neighborhood || undefined,
        bedrooms: numBedrooms,
        bathrooms: numBathrooms,
        maxGuests: Math.max(1, parseInt(String(maxGuests), 10) || 1),
        areaSqm: numAreaSqm > 0 ? numAreaSqm : undefined,
        amenities: selectedAmenityNames.length > 0 ? selectedAmenityNames : amenityIds,
        language: activeLang,
        tone: activeTone,
      };

      const response = await apiFetch<GenerateListingContentResponse>('/ai/generate-listing-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      startTransition(() => {
        setResult(response);
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate tailored listing content';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyBoth = () => {
    if (!result) return;
    onApplyBoth(result.title, result.description);
    setAppliedNotice(
      language === 'am'
        ? 'የአማርኛ ርዕስ እና ዝርዝር ማብራሪያ ተተግብሯል!'
        : 'Applied Title & Structured Description to listing!'
    );
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleApplyTitleOnly = () => {
    if (!result) return;
    onApplyTitle(result.title);
    setAppliedNotice('Applied Title to listing!');
    setTimeout(() => setAppliedNotice(null), 2500);
  };

  const handleApplyDescriptionOnly = () => {
    if (!result) return;
    onApplyDescription(result.description);
    setAppliedNotice('Applied Description to listing!');
    setTimeout(() => setAppliedNotice(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-[#E5E0D5] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* ── Modal Header ── */}
        <div className="p-5 sm:p-6 border-b border-[#EEF3EF] flex items-center justify-between gap-4 bg-[#FCFAF6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#234B36] to-[#2D5E43] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-[#E6C687]" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#252923]">
                AI Listing Copilot
              </h3>
              <p className="text-xs text-[#73776F]">
                Tailored enterprise title &amp; description strictly grounded in your listing's real specifications.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#73776F] hover:bg-[#EEF3EF] hover:text-[#252923] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Modal Scrollable Body ── */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Detected Listing Specifications Card */}
          <div className="p-4 rounded-2xl bg-[#F8F5ED] border border-[#E5E0D5] space-y-2.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#73776F] flex items-center gap-1.5">
              <BadgeCheck className="w-4 h-4 text-[#234B36]" />
              <span>Detected Property Specifications</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 text-[#252923] font-bold">
                <MapPin className="w-3.5 h-3.5 text-[#234B36] shrink-0" />
                <span className="truncate">{locationLabel}</span>
              </div>
              <div className="flex items-center gap-2 text-[#252923] font-bold">
                <Home className="w-3.5 h-3.5 text-[#234B36] shrink-0" />
                <span className="truncate">
                  {listingType === 'SALE' ? 'Property For Sale' : 'Nightly Rental'} • {propertyType} (
                  {numBedrooms} Bed, {numBathrooms} Bath)
                </span>
              </div>
            </div>

            {/* Selected Amenities Chips */}
            <div className="pt-1 flex items-center gap-1.5 flex-wrap">
              {selectedAmenityNames.length > 0 ? (
                selectedAmenityNames.slice(0, 6).map((name, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-semibold bg-white border border-[#E5E0D5] px-2 py-0.5 rounded-md text-[#252923]"
                  >
                    ✓ {name}
                  </span>
                ))
              ) : (
                <div className="text-[11px] text-amber-700 font-medium flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    No amenities selected in Section 6 yet. (AI will only feature amenities you select).
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Controls: Language & Tone */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-[#E5E0D5] bg-white">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#73776F]">Language:</span>
              <div className="inline-flex rounded-xl border border-[#E5E0D5] bg-[#FCFAF6] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setLanguage('en');
                    if (result) handleGenerate('en', tone);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    language === 'en'
                      ? 'bg-[#234B36] text-white shadow-xs'
                      : 'text-[#73776F] hover:text-[#252923]'
                  }`}
                >
                  🇬🇧 English
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLanguage('am');
                    if (result) handleGenerate('am', tone);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    language === 'am'
                      ? 'bg-[#234B36] text-white shadow-xs'
                      : 'text-[#73776F] hover:text-[#252923]'
                  }`}
                >
                  🇪🇹 አማርኛ
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#73776F]">Tone:</span>
              <select
                value={tone}
                onChange={(e) => {
                  const newTone = e.target.value as ToneOption;
                  setTone(newTone);
                  if (result) handleGenerate(language, newTone);
                }}
                className="px-3 py-1.5 rounded-xl border border-[#E5E0D5] bg-[#FCFAF6] text-xs font-bold text-[#252923] focus:outline-none focus:ring-1 focus:ring-[#234B36]"
              >
                <option value="luxury">💎 Executive &amp; Luxury</option>
                <option value="warm">🌿 Warm &amp; Authentic</option>
                <option value="business">💼 Modern Business</option>
              </select>
            </div>
          </div>

          {/* Generate Action Button */}
          {!result && (
            <div className="text-center py-4">
              <button
                type="button"
                onClick={() => handleGenerate()}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#234B36] hover:bg-[#2D5E43] text-white text-sm font-black shadow-md hover:shadow-lg transition disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Analyzing Specifications &amp; Drafting Copy…</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#E6C687]" />
                    <span>Generate Tailored Title &amp; Description</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Error Notice */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center justify-between gap-2">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => handleGenerate()}
                className="text-xs font-bold underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Success Banner */}
          {appliedNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{appliedNotice}</span>
            </div>
          )}

          {/* Generated Result Preview */}
          {result && (
            <div className="space-y-4">
              {/* Proposed Title */}
              <div className="p-4 rounded-2xl bg-white border border-[#E5E0D5] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#73776F]">
                    Proposed Title
                  </span>
                  <button
                    type="button"
                    onClick={handleApplyTitleOnly}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#234B36] hover:underline"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply Title Only</span>
                  </button>
                </div>
                <p className="text-sm font-black text-[#252923] leading-snug">
                  {result.title}
                </p>
              </div>

              {/* Proposed Description */}
              <div className="p-4 rounded-2xl bg-white border border-[#E5E0D5] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#73776F]">
                    Proposed Description
                  </span>
                  <button
                    type="button"
                    onClick={handleApplyDescriptionOnly}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#234B36] hover:underline"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply Description Only</span>
                  </button>
                </div>
                <div className="text-xs text-[#252923] whitespace-pre-line leading-relaxed max-h-56 overflow-y-auto pr-2 bg-[#FCFAF6] p-3 rounded-xl border border-[#E5E0D5]/60 font-sans">
                  {result.description}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div className="p-4 sm:p-5 border-t border-[#EEF3EF] bg-[#FCFAF6] flex items-center justify-between gap-3">
          {result ? (
            <>
              <button
                type="button"
                onClick={() => handleGenerate()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5E0D5] hover:bg-white text-xs font-bold text-[#73776F] transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Regenerate</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#73776F] hover:bg-[#EEF3EF] transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyBoth}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#234B36] hover:bg-[#2D5E43] text-white text-xs font-black shadow-md transition"
                >
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Apply Both Title &amp; Description</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex justify-end w-full">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#73776F] hover:bg-[#EEF3EF] transition"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
