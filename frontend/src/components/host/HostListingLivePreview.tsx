'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Eye,
  Camera,
  Save,
  Check,
  ShieldCheck,
  Heart,
  Star,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
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

  // Interactive Carousel & Favorite states
  const allPhotos = [coverImage, ...images]
    .filter((img): img is string => typeof img === 'string' && img.trim().length > 0);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);

  const safeIdx = allPhotos.length > 0 ? activePhotoIdx % allPhotos.length : 0;
  const currentPhoto = allPhotos[safeIdx] || '';

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActivePhotoIdx((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActivePhotoIdx((prev) => (prev + 1) % allPhotos.length);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorited((prev) => !prev);
  };

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
    <div className="space-y-4">
      {/* ── Guest View Preview Card Header ── */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-xs font-black uppercase tracking-wider text-[#252923] flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-[#234B36]" /> Live Guest Preview
          </h3>
        </div>
        <span className="text-[10px] font-bold text-[#73776F] bg-white border border-[#E5E0D5] px-2.5 py-0.5 rounded-full shadow-2xs">
          Interactive Mock
        </span>
      </div>

      {/* ── Real Interactive User-Side Property Card ── */}
      <div className="group overflow-hidden transition-all duration-300 hover:shadow-xl border border-[#E5E0D5] bg-white rounded-2xl flex flex-col shadow-sm">
        {/* Generous Media Container (User-Side Height: 240px / h-60) */}
        <div className="relative h-60 w-full overflow-hidden bg-[#EEF3EF] select-none">
          {currentPhoto ? (
            <>
              <img
                src={currentPhoto}
                alt={title || 'Property photo preview'}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

              {/* Carousel Arrows on Hover */}
              {allPhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevPhoto}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#252923] shadow-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 z-20 cursor-pointer"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextPhoto}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#252923] shadow-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 z-20 cursor-pointer"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Dot Pagination */}
                  <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center gap-1.5 z-20">
                    {allPhotos.slice(0, 7).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActivePhotoIdx(i);
                        }}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          i === safeIdx
                            ? 'w-5 bg-white shadow-sm'
                            : 'w-1.5 bg-white/60 hover:bg-white'
                        }`}
                        aria-label={`Go to photo ${i + 1}`}
                      />
                    ))}
                    {allPhotos.length > 7 && (
                      <span className="text-[9px] font-bold text-white drop-shadow">
                        +{allPhotos.length - 7}
                      </span>
                    )}
                  </div>

                  {/* Photo Counter Pill */}
                  <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md z-20">
                    {safeIdx + 1} / {allPhotos.length}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-[#73776F] gap-2 p-6 text-center bg-gradient-to-b from-[#FDFCF7] to-[#EEF3EF]">
              <div className="w-12 h-12 rounded-2xl bg-white/90 border border-[#E5E0D5] flex items-center justify-center text-[#234B36] shadow-2xs">
                <Camera className="w-6 h-6 opacity-70" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#252923]">No photo uploaded yet</p>
                <p className="text-[11px] text-[#73776F] max-w-[210px] mt-0.5 leading-relaxed">
                  Add photos in Section 4 to preview interactive carousel slider.
                </p>
              </div>
            </div>
          )}

          {/* Top Left Badges */}
          <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5 z-20">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-white/95 text-[#234B36] backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-[#234B36]" /> GUZO Verified
            </span>
            <span
              className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm ${
                isSale ? 'bg-amber-600 text-white' : 'bg-[#234B36] text-white'
              }`}
            >
              {isSale ? 'For Sale' : 'For Rent'}
            </span>
          </div>

          {/* Top Right: Interactive Favorite Wishlist Button */}
          <button
            type="button"
            onClick={handleToggleFavorite}
            aria-label="Add to wishlist"
            className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-md transition-all hover:scale-110 hover:bg-white active:scale-95 cursor-pointer"
            title={isFavorited ? 'Saved to wishlist (interactive guest preview)' : 'Save to wishlist (interactive guest preview)'}
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isFavorited ? 'fill-red-500 text-red-500' : 'text-[#252923] hover:text-red-500'
              }`}
            />
          </button>

          {/* Property Type Badge Overlay */}
          <span className="absolute bottom-3 left-3 z-20 rounded-lg bg-black/60 backdrop-blur-xs px-2.5 py-0.5 text-[11px] font-bold text-white uppercase tracking-wider">
            {propertyType}
          </span>
        </div>

        {/* Card Body Details */}
        <div className="p-4 flex flex-col flex-1 justify-between space-y-3">
          <div>
            {/* Title & Rating */}
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-1 font-bold text-[#252923] group-hover:text-[#234B36] transition-colors text-base flex-1">
                {title.trim() ? title : <span className="text-[#A0988A] italic font-normal">Untitled Property Listing</span>}
              </h3>
              <div className="flex shrink-0 items-center gap-1 text-xs font-bold text-[#252923] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                <span>5.0</span>
                <span className="text-[10px] text-[#73776F] font-normal">(New)</span>
              </div>
            </div>

            {/* Location */}
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-[#73776F]">
              <MapPin className="w-3.5 h-3.5 text-[#234B36] shrink-0" />
              <span className="truncate">{locationSummary}</span>
            </p>
          </div>

          {/* Specs Row */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#73776F]">
            <span className="font-semibold text-[#252923]">{numBedrooms} {numBedrooms === 1 ? 'bed' : 'beds'}</span>
            <span>·</span>
            <span className="font-semibold text-[#252923]">{numBathrooms} {numBathrooms === 1 ? 'bath' : 'baths'}</span>
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
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {selectedAmenities.slice(0, 3).map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#F8F5ED] text-[#234B36] border border-[#E5E0D5] px-2.5 py-0.5 rounded-full"
                >
                  <Check className="w-2.5 h-2.5" /> {a.name}
                </span>
              ))}
              {selectedAmenities.length > 3 && (
                <span className="text-[11px] text-[#73776F] font-semibold self-center">
                  +{selectedAmenities.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Price & Guarantee Footer */}
          <div className="pt-3 border-t border-[#EEF3EF] flex items-end justify-between">
            <div>
              {currentPriceNum > 0 ? (
                <div>
                  <span className="text-lg font-black text-[#234B36]">
                    ETB {currentPriceNum.toLocaleString()}
                  </span>
                  {!isSale && <span className="text-xs text-[#73776F] font-medium"> /night</span>}
                </div>
              ) : (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Price not set yet
                </span>
              )}
            </div>

            <span className="text-xs font-bold text-[#234B36] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              View details &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* ── Integrated Listing Readiness Meter ── */}
      <div className="bg-white border border-[#E5E0D5] rounded-2xl p-3.5 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#252923]">
            Listing Readiness
          </span>
          <span className="text-xs font-black text-[#234B36]">
            {progressPercent}% <span className="text-[10px] text-[#73776F] font-normal">({completedCount} of {checks.length})</span>
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-[#EEF3EF] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#234B36] to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Checklist Micro-Grid */}
        <div className="grid grid-cols-3 gap-1 pt-1 text-[10px]">
          {checks.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-1 py-1 px-1.5 rounded-md transition-colors ${
                item.done
                  ? 'text-[#234B36] font-bold bg-emerald-50 border border-emerald-100'
                  : 'text-[#73776F] font-medium bg-[#FCFAF6] border border-[#E5E0D5]/60'
              }`}
            >
              {item.done ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
              ) : (
                <Circle className="w-3 h-3 text-[#A0988A] shrink-0" />
              )}
              <span className="truncate">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Dedicated Save Action Panel ── */}
      <div className="bg-gradient-to-br from-[#234B36] to-[#1E3F2E] rounded-2xl p-4 text-white shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-black text-white">Save Your Listing</h4>
            <p className="text-[11px] text-white/70 mt-0.5">
              Draft saves progress so you can return anytime.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-0.5">
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
            className="flex-[2] inline-flex items-center justify-center gap-1.5 bg-[#E6C687] hover:bg-[#F3D79E] active:bg-[#D5B576] text-[#252923] text-xs font-black py-2.5 px-4 rounded-xl shadow transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
