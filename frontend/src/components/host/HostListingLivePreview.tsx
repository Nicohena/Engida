'use client';

import React from 'react';
import Link from 'next/link';
import {
  MapPin,
  Sparkles,
  CheckCircle2,
  Circle,
  Eye,
  Camera,
  Save,
  Check,
  ShieldCheck,
} from 'lucide-react';
import type { ListingType, PropertyType } from '../../types/host';

interface HostListingLivePreviewProps {
  title: string;
  propertyType: PropertyType;
  listingType: ListingType;
  city: string;
  subCity?: string;
  neighborhood?: string;
  bedrooms: number | string;
  bathrooms: number | string;
  maxGuests: number | string;
  areaSqm?: number | string;
  pricePerNight?: number | string;
  salePrice?: number | string;
  coverImage?: string;
  images?: string[];
  amenityIds: string[];
  amenityCatalog: Array<{ id: string; name: string }>;
  isSubmitting?: boolean;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel?: string;
  submittingLabel?: string;
  cancelHref: string;
}

export default function HostListingLivePreview({
  title,
  propertyType,
  listingType,
  city,
  subCity,
  neighborhood,
  bedrooms,
  bathrooms,
  maxGuests,
  areaSqm,
  pricePerNight,
  salePrice,
  coverImage,
  images = [],
  amenityIds,
  amenityCatalog = [],
  isSubmitting = false,
  onSubmit,
  submitLabel = 'Save Draft',
  submittingLabel = 'Saving Draft…',
  cancelHref,
}: HostListingLivePreviewProps) {
  const isSale = listingType === 'SALE';
  const numBedrooms = Math.max(0, parseInt(String(bedrooms), 10) || 0);
  const numBathrooms = Math.max(0, parseInt(String(bathrooms), 10) || 0);
  const numGuests = Math.max(1, parseInt(String(maxGuests), 10) || 1);
  const numArea = parseFloat(String(areaSqm || 0)) || 0;

  const currentPriceNum = isSale
    ? parseFloat(String(salePrice || 0)) || 0
    : parseFloat(String(pricePerNight || 0)) || 0;

  const locationSummary =
    [neighborhood, subCity, city].filter(Boolean).join(', ') || 'Addis Ababa, Ethiopia';

  // Key selected amenities for badge display
  const selectedAmenities = amenityCatalog.filter((a) => amenityIds.includes(a.id));

  // Completion calculation
  const checks = [
    { label: 'Location & Type', done: Boolean(city && propertyType) },
    { label: 'Space & Capacity', done: numBedrooms > 0 && numGuests > 0 },
    { label: 'Amenities', done: amenityIds.length > 0 },
    { label: 'Photos', done: Boolean(coverImage || images.length > 0) },
    { label: 'Title & Description', done: Boolean(title.trim().length >= 5) },
    { label: 'Price Set', done: currentPriceNum > 0 },
  ];

  const completedCount = checks.filter((c) => c.done).length;
  const progressPercent = Math.round((completedCount / checks.length) * 100);

  return (
    <div className="space-y-5">
      {/* ── Guest View Preview Card ── */}
      <div className="bg-white border border-[#E5E0D5] rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-xs font-black uppercase tracking-wider text-[#252923] flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#234B36]" /> Live Guest Preview
            </h3>
          </div>
          <span className="text-[11px] font-bold text-[#73776F] bg-[#F8F5ED] border border-[#E5E0D5] px-2.5 py-0.5 rounded-full">
            Real-Time
          </span>
        </div>

        {/* Property Card Mock */}
        <div className="border border-[#E5E0D5] rounded-2xl overflow-hidden bg-white shadow-xs group">
          {/* Card Image */}
          <div className="relative aspect-[16/10] bg-[#EEF3EF] overflow-hidden">
            {coverImage ? (
              <img
                src={coverImage}
                alt={title || 'Property preview'}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#73776F] gap-2 p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/80 border border-[#E5E0D5] flex items-center justify-center text-[#234B36] shadow-xs">
                  <Camera className="w-6 h-6 opacity-60" />
                </div>
                <p className="text-xs font-bold text-[#252923]">No photo uploaded yet</p>
                <p className="text-[11px] text-[#73776F] max-w-[180px]">
                  Add your photos in Section 4 to showcase your listing.
                </p>
              </div>
            )}

            {/* Badges overlay */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
              <span className="bg-[#252923]/80 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs">
                {propertyType}
              </span>
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs ${
                  isSale ? 'bg-amber-600 text-white' : 'bg-[#234B36] text-white'
                }`}
              >
                {isSale ? 'For Sale' : 'For Rent'}
              </span>
            </div>

            {images.length > 0 && (
              <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                +{images.length} {images.length === 1 ? 'photo' : 'photos'}
              </div>
            )}
          </div>

          {/* Card Body */}
          <div className="p-4 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs text-[#73776F] font-semibold">
              <MapPin className="w-3.5 h-3.5 text-[#234B36] shrink-0" />
              <span className="truncate">{locationSummary}</span>
            </div>

            <h4 className="text-sm font-black text-[#252923] line-clamp-2 leading-snug">
              {title.trim() ? (
                title
              ) : (
                <span className="text-[#A0988A] italic font-medium">
                  Untitled Listing (craft with AI in Section 5)
                </span>
              )}
            </h4>

            {/* Specs row */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#73776F]">
              <span className="font-semibold text-[#252923]">{numBedrooms} Beds</span>
              <span>·</span>
              <span className="font-semibold text-[#252923]">{numBathrooms} Baths</span>
              <span>·</span>
              <span className="font-semibold text-[#252923]">Up to {numGuests} guests</span>
              {numArea > 0 && (
                <>
                  <span>·</span>
                  <span className="font-semibold text-[#252923]">{numArea} m²</span>
                </>
              )}
            </div>

            {/* Top Amenities Pills */}
            {selectedAmenities.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {selectedAmenities.slice(0, 3).map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#F8F5ED] text-[#234B36] border border-[#E5E0D5] px-2 py-0.5 rounded-md"
                  >
                    <Check className="w-2.5 h-2.5" /> {a.name}
                  </span>
                ))}
                {selectedAmenities.length > 3 && (
                  <span className="text-[10px] text-[#73776F] font-semibold self-center">
                    +{selectedAmenities.length - 3} more
                  </span>
                )}
              </div>
            )}

            {/* Price section */}
            <div className="pt-2 border-t border-[#EEF3EF] flex items-baseline justify-between">
              <div>
                {currentPriceNum > 0 ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-black text-[#234B36]">
                      ETB {currentPriceNum.toLocaleString()}
                    </span>
                    {!isSale && <span className="text-xs text-[#73776F] font-medium">/ night</span>}
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                    Price not set yet
                  </span>
                )}
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#234B36] uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-[#234B36]" /> Engida Guarantee
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Listing Health & Progress Meter ── */}
      <div className="bg-white border border-[#E5E0D5] rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#252923]">
              Listing Readiness
            </h4>
            <p className="text-[11px] text-[#73776F] mt-0.5">
              Complete all sections for maximum guest booking conversion.
            </p>
          </div>
          <span className="text-sm font-black text-[#234B36]">{progressPercent}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-[#EEF3EF] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#234B36] to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Checklist */}
        <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
          {checks.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-1.5 py-1 px-2 rounded-lg transition-colors ${
                item.done
                  ? 'text-[#234B36] font-bold bg-emerald-50/70 border border-emerald-100'
                  : 'text-[#73776F] font-medium bg-[#FCFAF6] border border-[#E5E0D5]/60'
              }`}
            >
              {item.done ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-[#A0988A] shrink-0" />
              )}
              <span className="text-[11px] truncate">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Primary Action Panel ── */}
      <div className="bg-gradient-to-br from-[#234B36] to-[#1E3F2E] rounded-3xl p-5 text-white shadow-md space-y-3">
        <div>
          <h4 className="text-sm font-black text-white">Ready to Save?</h4>
          <p className="text-xs text-white/70 mt-0.5">
            You can always return to edit your details or pricing at any time.
          </p>
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          <Link
            href={cancelHref}
            className="flex-1 py-2.5 text-center text-xs font-bold text-white/90 bg-white/10 hover:bg-white/20 rounded-xl transition border border-white/15"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="flex-[2] inline-flex items-center justify-center gap-2 bg-[#E6C687] hover:bg-[#F3D79E] active:bg-[#D5B576] text-[#252923] text-xs font-black py-2.5 px-4 rounded-xl shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-[#252923]/30 border-t-[#252923] rounded-full animate-spin" />
                {submittingLabel}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#252923]" />
                {submitLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
