'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { apiFetch } from '../../lib/api';
import type { GenerateListingContentResponse } from '../../types/host';
import {
  Sparkles,
  Check,
  RotateCcw,
  X,
  BadgeCheck,
  MapPin,
  Home,
  Info,
  ArrowRight,
  FileText,
  Heading1,
  AlignLeft,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
export type CopilotMode = 'title' | 'description' | 'both';

interface AiListingCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: CopilotMode;
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
  coverImage?: string;
  images?: string[];
  onApplyTitle: (title: string) => void;
  onApplyDescription: (description: string) => void;
  onApplyBoth: (title: string, description: string) => void;
}

type LanguageOption = 'en' | 'am';
type ToneOption = 'luxury' | 'warm' | 'business';
type DescriptionLengthOption = 'short' | 'medium' | 'long';
type TitleLengthOption = 'concise' | 'standard' | 'extended';

const DESC_LENGTH_OPTIONS: { value: DescriptionLengthOption; label: string; desc: string; detail: string }[] = [
  { value: 'short', label: 'Short', desc: 'Punchy & mobile-friendly', detail: '~50-80 words' },
  { value: 'medium', label: 'Medium', desc: 'Balanced standard', detail: '~150 words' },
  { value: 'long', label: 'Detailed', desc: 'Comprehensive room-by-room', detail: '~300 words' },
];

const TITLE_LENGTH_OPTIONS: { value: TitleLengthOption; label: string; desc: string; detail: string }[] = [
  { value: 'concise', label: 'Concise', desc: 'Short & punchy', detail: '~40 chars' },
  { value: 'standard', label: 'Standard', desc: 'Balanced & clear', detail: '~75 chars' },
  { value: 'extended', label: 'Extended', desc: 'Descriptive & feature-rich', detail: '~110 chars' },
];

// ─────────────────────────────────────────────────────────
// Tone options config
// ─────────────────────────────────────────────────────────
const TONE_OPTIONS: { value: ToneOption; label: string; emoji: string; desc: string }[] = [
  { value: 'luxury',   label: 'Executive & Luxury',  emoji: '💎', desc: 'Premium, prestige phrasing for discerning guests' },
  { value: 'warm',     label: 'Warm & Authentic',    emoji: '🌿', desc: 'Friendly, inviting Ethiopian hospitality tone' },
  { value: 'business', label: 'Modern Business',     emoji: '💼', desc: 'Professional, concise — ideal for corporate clients' },
];

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────
export default function AiListingCopilotModal({
  isOpen,
  onClose,
  mode = 'both',
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
  currentTitle,
  currentDescription,
  coverImage,
  images = [],
  onApplyTitle,
  onApplyDescription,
  onApplyBoth,
}: AiListingCopilotModalProps) {
  const [language, setLanguage] = useState<LanguageOption>('en');
  const [tone, setTone] = useState<ToneOption>('luxury');
  const [descriptionLength, setDescriptionLength] = useState<DescriptionLengthOption>('medium');
  const [titleLength, setTitleLength] = useState<TitleLengthOption>('standard');
  const [result, setResult] = useState<GenerateListingContentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedField, setAppliedField] = useState<'title' | 'description' | 'both' | null>(null);
  const [, startTransition] = useTransition();

  // Reset state when modal opens/mode changes
  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setError(null);
      setAppliedField(null);
      setLoading(false);
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  // ── Derived values ──────────────────────────────────────
  const selectedAmenityNames: string[] = amenityIds
    .map((id) => amenityCatalog.find((item) => item.id === id)?.name || id)
    .filter(Boolean);

  const numBedrooms  = Math.max(0, parseInt(String(bedrooms), 10) || 0);
  const numBathrooms = Math.max(0, parseInt(String(bathrooms), 10) || 0);
  const numAreaSqm   = parseFloat(String(areaSqm || 0)) || 0;
  const locationLabel = [neighborhood, subCity, city].filter(Boolean).join(', ') || 'Ethiopia';

  // ── Modal heading based on mode ─────────────────────────
  const modalMeta = {
    title: {
      icon: <Heading1 className="w-5 h-5 text-[#E6C687]" />,
      heading: 'AI Title Generator',
      sub: 'Generate a single enterprise-grade listing title grounded in your property specs.',
      btnLabel: 'Generate Title',
      applyLabel: 'Apply This Title',
    },
    description: {
      icon: <AlignLeft className="w-5 h-5 text-[#E6C687]" />,
      heading: 'AI Description Drafter',
      sub: 'Draft a structured, enterprise-grade property description grounded in your specs.',
      btnLabel: 'Draft Description',
      applyLabel: 'Apply This Description',
    },
    both: {
      icon: <Sparkles className="w-5 h-5 text-[#E6C687]" />,
      heading: 'AI Listing Copilot',
      sub: 'Generate both title & structured description — strictly grounded in your listing\'s real specifications.',
      btnLabel: 'Generate Title & Description',
      applyLabel: 'Apply Both',
    },
  }[mode];

  // ── API call ────────────────────────────────────────────
  const handleGenerate = async (
    targetLang?: LanguageOption,
    targetTone?: ToneOption,
    targetDescLen?: DescriptionLengthOption,
    targetTitleLen?: TitleLengthOption,
  ) => {
    const activeLang      = targetLang      ?? language;
    const activeTone      = targetTone      ?? tone;
    const activeDescLen   = targetDescLen   ?? descriptionLength;
    const activeTitleLen  = targetTitleLen  ?? titleLength;

    setLoading(true);
    setError(null);
    setAppliedField(null);

    try {
      const payload = {
        propertyType:       propertyType || 'APARTMENT',
        listingType:        listingType  || 'RENTAL',
        city:               city || 'Addis Ababa',
        subCity:            subCity       || undefined,
        neighborhood:       neighborhood  || undefined,
        bedrooms:           numBedrooms,
        bathrooms:          numBathrooms,
        maxGuests:          Math.max(1, parseInt(String(maxGuests), 10) || 1),
        areaSqm:            numAreaSqm > 0 ? numAreaSqm : undefined,
        amenities:          selectedAmenityNames.length > 0 ? selectedAmenityNames : amenityIds,
        language:           activeLang,
        tone:               activeTone,
        descriptionLength:  activeDescLen,
        titleLength:        activeTitleLen,
        coverImage:         coverImage?.trim() || undefined,
        images:             images && images.length > 0 ? images : undefined,
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
      setError(err instanceof Error ? err.message : 'Failed to generate content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Apply handlers ─────────────────────────────────────
  const applyTitle = () => {
    if (!result) return;
    onApplyTitle(result.title);
    setAppliedField('title');
    if (mode === 'title') {
      setTimeout(onClose, 1000);
    }
  };

  const applyDescription = () => {
    if (!result) return;
    onApplyDescription(result.description);
    setAppliedField('description');
    if (mode === 'description') {
      setTimeout(onClose, 1000);
    }
  };

  const applyBoth = () => {
    if (!result) return;
    onApplyBoth(result.title, result.description);
    setAppliedField('both');
    setTimeout(onClose, 1000);
  };

  // ── Backdrop click to close ────────────────────────────
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // ── Mode accent colour ─────────────────────────────────
  const accentCls = 'bg-[#234B36]';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/55 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden"
        style={{ maxHeight: 'min(92vh, 720px)' }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* ════════ HEADER ════════ */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[#EEF3EF] bg-gradient-to-br from-[#234B36] to-[#2D5E43] rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              {modalMeta.icon}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-white leading-tight">{modalMeta.heading}</h3>
              <p className="text-[11px] text-white/70 mt-0.5 leading-snug line-clamp-2">{modalMeta.sub}</p>
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
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-4">

          {/* ── Property Specs Card ── */}
          <div className="rounded-xl bg-[#F8F5ED] border border-[#E5E0D5] p-4 space-y-3">
            <div className="flex items-center gap-1.5">
              <BadgeCheck className="w-3.5 h-3.5 text-[#234B36]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#73776F]">Detected Property Specs</span>
            </div>

            {/* Visual Photos Context */}
            {coverImage ? (
              <div className="flex items-center gap-3 p-2.5 bg-white border border-[#E5E0D5] rounded-xl">
                <img
                  src={coverImage}
                  alt="Listing cover"
                  className="w-12 h-12 object-cover rounded-lg border border-[#EEF3EF] shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#252923] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span>Visual Context Linked</span>
                  </div>
                  <div className="text-[11px] text-[#73776F] truncate">
                    {images && images.length > 0
                      ? `${images.length} gallery photo${images.length > 1 ? 's' : ''} + Cover photo ready`
                      : 'Cover photo ready for AI grounding'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[11px] text-[#73776F] bg-white/70 border border-[#E5E0D5] rounded-lg px-2.5 py-1.5">
                <Info className="w-3.5 h-3.5 text-[#A0988A] shrink-0" />
                <span>No photos uploaded yet. Uploading in Section 1 provides AI with visual context.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#252923]">
                <MapPin className="w-3.5 h-3.5 text-[#234B36] shrink-0" />
                <span className="truncate">{locationLabel}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#252923]">
                <Home className="w-3.5 h-3.5 text-[#234B36] shrink-0" />
                <span className="truncate">
                  {listingType === 'SALE' ? 'For Sale' : 'For Rent'} · {propertyType}
                </span>
              </div>
            </div>

            {/* Rooms & area row */}
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="px-2 py-0.5 bg-white border border-[#E5E0D5] rounded-md font-semibold text-[#252923]">
                🛏 {numBedrooms} Beds
              </span>
              <span className="px-2 py-0.5 bg-white border border-[#E5E0D5] rounded-md font-semibold text-[#252923]">
                🚿 {numBathrooms} Baths
              </span>
              {numAreaSqm > 0 && (
                <span className="px-2 py-0.5 bg-white border border-[#E5E0D5] rounded-md font-semibold text-[#252923]">
                  📐 {numAreaSqm} m²
                </span>
              )}
            </div>

            {/* Amenities */}
            {selectedAmenityNames.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedAmenityNames.slice(0, 8).map((name, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#234B36]/10 text-[#234B36] border border-[#234B36]/20 px-2 py-0.5 rounded-md"
                  >
                    <Check className="w-2.5 h-2.5" />
                    {name}
                  </span>
                ))}
                {selectedAmenityNames.length > 8 && (
                  <span className="text-[11px] text-[#73776F] font-medium px-1 self-center">
                    +{selectedAmenityNames.length - 8} more
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-start gap-1.5 text-[11px] text-amber-700">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>No amenities selected yet — AI will not mention amenities until you select them in Section 6.</span>
              </div>
            )}
          </div>

          {/* ── Language & Tone Controls ── */}
          <div className="rounded-xl border border-[#E5E0D5] bg-white p-4 space-y-3">
            {/* Language toggle */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#73776F] w-20 shrink-0">Language:</span>
              <div className="inline-flex rounded-lg border border-[#E5E0D5] bg-[#F8F5ED] p-0.5 gap-0.5">
                {(['en', 'am'] as LanguageOption[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => {
                      setLanguage(lang);
                      if (result) handleGenerate(lang, tone);
                    }}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-black transition ${
                      language === lang
                        ? `${accentCls} text-white shadow-sm`
                        : 'text-[#73776F] hover:text-[#252923]'
                    }`}
                  >
                    {lang === 'en' ? '🇬🇧 English' : '🇪🇹 አማርኛ'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tone selector — fixed 3-col grid, no wrapping */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-[#73776F]">Tone:</span>
              <div className="grid grid-cols-3 gap-2">
                {TONE_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      setTone(t.value);
                      if (result) handleGenerate(language, t.value, descriptionLength, titleLength);
                    }}
                    title={t.desc}
                    className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-bold border transition ${
                      tone === t.value
                        ? `${accentCls} text-white border-transparent shadow-sm`
                        : 'border-[#E5E0D5] text-[#73776F] hover:border-[#234B36]/50 hover:text-[#252923] bg-white'
                    }`}
                  >
                    <span>{t.emoji}</span>
                    <span className="truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title Length selector — fixed 3-col grid, no wrapping */}
            {(mode === 'title' || mode === 'both') && (
              <div className="space-y-1.5 pt-2 border-t border-[#EEF3EF]">
                <span className="text-xs font-bold text-[#73776F]">Title Size:</span>
                <div className="grid grid-cols-3 gap-2">
                  {TITLE_LENGTH_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setTitleLength(opt.value);
                        if (result) handleGenerate(language, tone, descriptionLength, opt.value);
                      }}
                      title={`${opt.desc} (${opt.detail})`}
                      className={`flex flex-col items-center justify-center px-2 py-2 rounded-lg text-xs font-bold border transition ${
                        titleLength === opt.value
                          ? `${accentCls} text-white border-transparent shadow-sm`
                          : 'border-[#E5E0D5] text-[#73776F] hover:border-[#234B36]/50 hover:text-[#252923] bg-white'
                      }`}
                    >
                      <span>{opt.label}</span>
                      <span className={`text-[10px] mt-0.5 ${titleLength === opt.value ? 'text-white/70' : 'text-[#A0988A]'}`}>
                        {opt.detail}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Description Length selector — fixed 3-col grid, no wrapping */}
            {(mode === 'description' || mode === 'both') && (
              <div className="space-y-1.5 pt-2 border-t border-[#EEF3EF]">
                <span className="text-xs font-bold text-[#73776F]">Length:</span>
                <div className="grid grid-cols-3 gap-2">
                  {DESC_LENGTH_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setDescriptionLength(opt.value);
                        if (result) handleGenerate(language, tone, opt.value, titleLength);
                      }}
                      title={`${opt.desc} (${opt.detail})`}
                      className={`flex flex-col items-center justify-center px-2 py-2 rounded-lg text-xs font-bold border transition ${
                        descriptionLength === opt.value
                          ? `${accentCls} text-white border-transparent shadow-sm`
                          : 'border-[#E5E0D5] text-[#73776F] hover:border-[#234B36]/50 hover:text-[#252923] bg-white'
                      }`}
                    >
                      <span>{opt.label}</span>
                      <span className={`text-[10px] mt-0.5 ${descriptionLength === opt.value ? 'text-white/70' : 'text-[#A0988A]'}`}>
                        {opt.detail}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Error notice ── */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-red-700">{error}</p>
              <button
                type="button"
                onClick={() => handleGenerate()}
                className="text-xs font-black text-red-700 underline hover:no-underline shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* ── Applied success banner ── */}
          {appliedField && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-xs font-bold text-emerald-800">
                {appliedField === 'title' && 'Title applied to your listing ✓'}
                {appliedField === 'description' && 'Description applied to your listing ✓'}
                {appliedField === 'both' && 'Title & Description applied to your listing ✓'}
              </p>
            </div>
          )}

          {/* Generate button moved to footer — empty placeholder here */}

          {/* ── Loading skeleton ── */}
          {loading && (
            <div className="space-y-3 animate-pulse">
              {(mode === 'title' || mode === 'both') && (
                <div className="rounded-xl border border-[#E5E0D5] p-4 space-y-2">
                  <div className="h-3 w-24 bg-[#E5E0D5] rounded" />
                  <div className="h-5 w-3/4 bg-[#E5E0D5] rounded" />
                </div>
              )}
              {(mode === 'description' || mode === 'both') && (
                <div className="rounded-xl border border-[#E5E0D5] p-4 space-y-2">
                  <div className="h-3 w-28 bg-[#E5E0D5] rounded" />
                  <div className="h-4 w-full bg-[#E5E0D5] rounded" />
                  <div className="h-4 w-5/6 bg-[#E5E0D5] rounded" />
                  <div className="h-4 w-4/5 bg-[#E5E0D5] rounded" />
                  <div className="h-4 w-3/4 bg-[#E5E0D5] rounded" />
                </div>
              )}
              <p className="text-xs text-center text-[#73776F] font-medium">
                Analyzing your property specs and drafting copy…
              </p>
            </div>
          )}

          {/* ── Result cards ── */}
          {result && !loading && (
            <div className="space-y-3">
              {/* Title card — show for 'title' or 'both' mode */}
              {(mode === 'title' || mode === 'both') && (
                <div className={`rounded-xl border p-4 space-y-2.5 transition ${
                  appliedField === 'title' || appliedField === 'both'
                    ? 'border-emerald-300 bg-emerald-50/60'
                    : 'border-[#E5E0D5] bg-white'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Heading1 className="w-3.5 h-3.5 text-[#234B36]" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#73776F]">
                        {mode === 'title' ? 'Generated Title' : 'Proposed Title'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={applyTitle}
                      disabled={appliedField === 'title' || appliedField === 'both'}
                      className={`inline-flex items-center gap-1 text-[11px] font-black transition rounded-lg px-2.5 py-1 ${
                        appliedField === 'title' || appliedField === 'both'
                          ? 'text-emerald-700 bg-emerald-100 cursor-default'
                          : 'text-[#234B36] bg-[#234B36]/10 hover:bg-[#234B36]/15'
                      }`}
                    >
                      {appliedField === 'title' || appliedField === 'both' ? (
                        <><Check className="w-3 h-3" /> Applied</>
                      ) : (
                        <><ArrowRight className="w-3 h-3" /> {mode === 'title' ? 'Apply Title' : 'Apply Title Only'}</>
                      )}
                    </button>
                  </div>
                  <p className="text-sm font-black text-[#252923] leading-snug">{result.title}</p>
                </div>
              )}

              {/* Description card — show for 'description' or 'both' mode */}
              {(mode === 'description' || mode === 'both') && (
                <div className={`rounded-xl border p-4 space-y-2.5 transition ${
                  appliedField === 'description' || appliedField === 'both'
                    ? 'border-emerald-300 bg-emerald-50/60'
                    : 'border-[#E5E0D5] bg-white'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <AlignLeft className="w-3.5 h-3.5 text-[#234B36]" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#73776F]">
                        {mode === 'description' ? 'Generated Description' : 'Proposed Description'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={applyDescription}
                      disabled={appliedField === 'description' || appliedField === 'both'}
                      className={`inline-flex items-center gap-1 text-[11px] font-black transition rounded-lg px-2.5 py-1 ${
                        appliedField === 'description' || appliedField === 'both'
                          ? 'text-emerald-700 bg-emerald-100 cursor-default'
                          : 'text-[#234B36] bg-[#234B36]/10 hover:bg-[#234B36]/15'
                      }`}
                    >
                      {appliedField === 'description' || appliedField === 'both' ? (
                        <><Check className="w-3 h-3" /> Applied</>
                      ) : (
                        <><ArrowRight className="w-3 h-3" /> {mode === 'description' ? 'Apply Description' : 'Apply Description Only'}</>
                      )}
                    </button>
                  </div>
                  <div className="text-xs text-[#252923] whitespace-pre-line leading-relaxed bg-[#FCFAF6] border border-[#E5E0D5]/70 rounded-lg p-3 max-h-52 overflow-y-auto">
                    {result.description}
                  </div>
                </div>
              )}

              {/* Highlights (both mode only) */}
              {mode === 'both' && result.highlights && result.highlights.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black text-[#73776F] uppercase tracking-wider">Key Highlights:</span>
                  {result.highlights.map((h, i) => (
                    <span
                      key={i}
                      className="text-[11px] font-semibold bg-[#234B36]/10 text-[#234B36] border border-[#234B36]/20 px-2 py-0.5 rounded-md"
                    >
                      ✓ {h}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ════════ STICKY FOOTER — always visible, paired action buttons ════════ */}
        <div className="px-5 py-3.5 border-t border-[#EEF3EF] bg-[#FCFAF6] flex items-center justify-between gap-3 rounded-b-2xl shrink-0">
          {/* Left: Regenerate (only after first result) */}
          <div>
            {result && (
              <button
                type="button"
                onClick={() => handleGenerate()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E0D5] hover:bg-white text-xs font-bold text-[#73776F] transition disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Regenerate
              </button>
            )}
          </div>

          {/* Right: Cancel + Primary CTA */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-bold text-[#73776F] hover:bg-[#EEF3EF] transition"
            >
              {appliedField ? 'Done' : 'Cancel'}
            </button>

            {/* Pre-result: Generate CTA */}
            {!result && !loading && (
              <button
                type="button"
                onClick={() => handleGenerate()}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl ${accentCls} hover:bg-[#2D5E43] text-white text-xs font-black shadow-md hover:shadow-lg transition`}
              >
                <Sparkles className="w-4 h-4 text-[#E6C687]" />
                {modalMeta.btnLabel}
              </button>
            )}

            {/* Post-result Apply CTAs */}
            {mode === 'both' && result && !appliedField && (
              <button
                type="button"
                onClick={applyBoth}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl ${accentCls} hover:bg-[#2D5E43] text-white text-xs font-black shadow-md transition`}
              >
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                Apply Both
              </button>
            )}

            {mode === 'title' && result && !appliedField && (
              <button
                type="button"
                onClick={applyTitle}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl ${accentCls} hover:bg-[#2D5E43] text-white text-xs font-black shadow-md transition`}
              >
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                Apply Title
              </button>
            )}

            {mode === 'description' && result && !appliedField && (
              <button
                type="button"
                onClick={applyDescription}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl ${accentCls} hover:bg-[#2D5E43] text-white text-xs font-black shadow-md transition`}
              >
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                Apply Description
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
