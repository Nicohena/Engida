'use client';

import React, { useState, useTransition } from 'react';
import { apiFetch } from '../../lib/api';
import type { GenerateListingContentResponse } from '../../types/host';
import {
  Sparkles,
  Check,
  RotateCcw,
  Languages,
  Zap,
  Copy,
  ChevronDown,
  ChevronUp,
  FileText,
  BadgeCheck,
} from 'lucide-react';

interface AiListingCopilotProps {
  propertyType: string;
  city: string;
  subCity?: string;
  neighborhood?: string;
  bedrooms: number | string;
  bathrooms: number | string;
  maxGuests: number | string;
  amenityIds: string[];
  currentTitle?: string;
  currentDescription?: string;
  onApplyTitle: (title: string) => void;
  onApplyDescription: (description: string) => void;
  onApplyBoth: (title: string, description: string) => void;
  className?: string;
}

type LanguageOption = 'en' | 'am';
type ToneOption = 'luxury' | 'warm' | 'business';

export default function AiListingCopilot({
  propertyType,
  city,
  subCity,
  neighborhood,
  bedrooms,
  bathrooms,
  maxGuests,
  amenityIds,
  currentTitle,
  currentDescription,
  onApplyTitle,
  onApplyDescription,
  onApplyBoth,
  className = '',
}: AiListingCopilotProps) {
  const [language, setLanguage] = useState<LanguageOption>('en');
  const [tone, setTone] = useState<ToneOption>('luxury');
  const [result, setResult] = useState<GenerateListingContentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [, startTransition] = useTransition();

  const handleGenerate = async (targetLang?: LanguageOption, targetTone?: ToneOption) => {
    const activeLang = targetLang || language;
    const activeTone = targetTone || tone;

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
        setIsExpanded(true);
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate listing content';
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
        : 'Applied AI Title & Structured Description to listing!'
    );
    setTimeout(() => setAppliedNotice(null), 4000);
  };

  const handleApplyTitleOnly = () => {
    if (!result) return;
    onApplyTitle(result.title);
    setAppliedNotice('Applied AI Title to listing!');
    setTimeout(() => setAppliedNotice(null), 3000);
  };

  const handleApplyDescriptionOnly = () => {
    if (!result) return;
    onApplyDescription(result.description);
    setAppliedNotice('Applied AI Description to listing!');
    setTimeout(() => setAppliedNotice(null), 3000);
  };

  return (
    <div
      className={`rounded-2xl border transition-all ${
        result
          ? 'bg-gradient-to-br from-white via-[#FCFAF6] to-[#F5F8F5] border-[#234B36]/30 shadow-md p-5 sm:p-6'
          : 'bg-[#FCFAF6] border-[#E5E0D5] p-4 sm:p-5'
      } ${className}`}
    >
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#234B36] to-[#2D5E43] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5 text-[#E6C687]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-[#252923]">
                AI Multilingual Listing Copilot
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#234B36]/10 text-[#234B36] border border-[#234B36]/20">
                <Languages className="w-3 h-3" /> English &amp; አማርኛ
              </span>
            </div>
            <p className="text-xs text-[#73776F] mt-0.5">
              Generate guest-optimized titles &amp; structured descriptions highlighting location, backup utilities, and comfort.
            </p>
          </div>
        </div>

        {/* Quick Language & Tone Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Language Toggle */}
          <div className="inline-flex rounded-xl border border-[#E5E0D5] bg-white p-1 shadow-xs">
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

          {/* Tone Selector */}
          <select
            value={tone}
            onChange={(e) => {
              const newTone = e.target.value as ToneOption;
              setTone(newTone);
              if (result) handleGenerate(language, newTone);
            }}
            className="px-3 py-1.5 rounded-xl border border-[#E5E0D5] bg-white text-xs font-bold text-[#252923] focus:outline-none focus:ring-1 focus:ring-[#234B36]"
          >
            <option value="luxury">💎 Executive &amp; Luxury</option>
            <option value="warm">🌿 Warm &amp; Authentic</option>
            <option value="business">💼 Modern Business</option>
          </select>

          {/* Generate Button */}
          <button
            type="button"
            onClick={() => handleGenerate()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#234B36] hover:bg-[#2D5E43] text-white text-xs font-black shadow-sm transition disabled:opacity-60 whitespace-nowrap cursor-pointer shrink-0"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Generating Copy…</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#E6C687]" />
                <span>{result ? 'Regenerate' : 'Generate Title & Description'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center justify-between gap-2">
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

      {/* ── Applied Success Notice ── */}
      {appliedNotice && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{appliedNotice}</span>
        </div>
      )}

      {/* ── Generated Result Drawer ── */}
      {result && !loading && (
        <div className="mt-5 space-y-4 pt-4 border-t border-[#E5E0D5]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-[#73776F] flex items-center gap-1.5">
              <BadgeCheck className="w-4 h-4 text-[#234B36]" />
              <span>AI Draft Preview ({language === 'am' ? 'አማርኛ' : 'English'} • {tone.toUpperCase()})</span>
            </span>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-bold text-[#73776F] hover:text-[#252923] flex items-center gap-1 transition"
            >
              <span>{isExpanded ? 'Hide Details' : 'Show Details'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Highlights Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {result.highlights.map((h, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white border border-[#E5E0D5] text-[#252923] shadow-2xs"
              >
                <Zap className="w-3 h-3 text-amber-600 shrink-0" />
                <span>{h}</span>
              </span>
            ))}
          </div>

          {isExpanded && (
            <div className="space-y-4">
              {/* Title Card */}
              <div className="p-4 rounded-xl bg-white border border-[#E5E0D5] space-y-2">
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

              {/* Description Card */}
              <div className="p-4 rounded-xl bg-white border border-[#E5E0D5] space-y-2">
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
                <div className="text-xs text-[#252923] whitespace-pre-line leading-relaxed max-h-60 overflow-y-auto pr-2 bg-[#FCFAF6] p-3 rounded-lg border border-[#E5E0D5]/60 font-sans">
                  {result.description}
                </div>
              </div>
            </div>
          )}

          {/* Primary Action Button */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleApplyBoth}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#234B36] hover:bg-[#2D5E43] active:bg-[#1A3828] text-white text-xs font-black shadow-sm transition"
            >
              <Check className="w-4 h-4 text-emerald-300" />
              <span>Apply Both Title &amp; Description</span>
            </button>

            <button
              type="button"
              onClick={() => handleGenerate()}
              title="Regenerate alternative draft"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5E0D5] hover:bg-[#F8F5ED] text-xs font-bold text-[#73776F] transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Regenerate Draft</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
