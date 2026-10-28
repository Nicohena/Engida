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
  X,
  ExternalLink,
  Calendar,
  Users,
  Share2,
  Sparkles,
  Clock,
  Award,
  Info,
} from 'lucide-react';
import type { ListingType, PropertyType } from '../../types/host';
import PropertyPublicMap from '../maps/PropertyPublicMap';

interface HostListingLivePreviewProps {
  title: string;
  propertyType: PropertyType;
  listingType: ListingType;
  address?: string;
  city: string;
  subCity?: string;
  neighborhood?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
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
  description?: string;
  propertyId?: string;
  hostName?: string;
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
  address,
  city,
  subCity,
  neighborhood,
  latitude,
  longitude,
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
  description,
  propertyId,
  hostName,
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

  // Detail Modal & Guest Simulation states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [modalActivePhotoIdx, setModalActivePhotoIdx] = useState(0);
  const [simulatedNights, setSimulatedNights] = useState(5);
  const [simulatedGuests, setSimulatedGuests] = useState(Math.min(2, numGuests));
  const [bookingSimulated, setBookingSimulated] = useState(false);

  // Nightly pricing calculations for simulated guest reservation
  const cleaningFee = Math.round(currentPriceNum * 0.12) || 450;
  const serviceFee = Math.round(currentPriceNum * simulatedNights * 0.1) || 350;
  const nightlySubtotal = currentPriceNum * simulatedNights;
  const bookingTotal = nightlySubtotal + cleaningFee + serviceFee;

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
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(true)}
                className="text-left line-clamp-1 font-bold text-[#252923] hover:text-[#234B36] transition-colors text-base flex-1 cursor-pointer"
              >
                {title.trim() ? title : <span className="text-[#A0988A] italic font-normal">Untitled Property Listing</span>}
              </button>
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

            <button
              type="button"
              onClick={() => setIsDetailModalOpen(true)}
              className="text-xs font-bold text-[#234B36] hover:text-[#2D5E43] group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 cursor-pointer"
            >
              View details &rarr;
            </button>
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

      {/* ══════════════════════════════════════════════════════════
          LIVE GUEST VIEW SIMULATOR MODAL (End-to-End Public View)
      ══════════════════════════════════════════════════════════ */}
      {isDetailModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setIsDetailModalOpen(false)}
        >
          <div
            className="w-full max-w-5xl max-h-[92vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#E5E0D5]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Bar */}
            <div className="px-6 py-4 border-b border-[#EEF3EF] bg-[#FCFAF6] flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                  Live Guest View Simulator
                </span>
                <span className="text-xs text-[#73776F] hidden sm:inline">
                  Interactive preview of how prospective guests see and book your listing
                </span>
              </div>

              <div className="flex items-center gap-2">
                {propertyId && (
                  <Link
                    href={`/properties/${propertyId}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#234B36]/30 text-xs font-bold text-[#234B36] hover:bg-[#234B36]/10 transition"
                  >
                    <span>Open Public URL</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-2 rounded-xl text-[#73776F] hover:text-[#252923] hover:bg-[#EEF3EF] transition cursor-pointer"
                  title="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Modal Content */}
            <div className="overflow-y-auto p-6 sm:p-8 space-y-8 flex-1">
              {/* Title, Rating & Action Row */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-2xl sm:text-3xl font-black text-[#252923] tracking-tight leading-tight">
                    {title.trim() ? title : 'Untitled Luxury Property Listing'}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#73776F] pt-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1 font-bold text-[#252923]">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                      5.0 <span className="font-normal text-[#73776F]">(New on Engida)</span>
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1 font-medium text-[#252923]">
                      <MapPin className="w-3.5 h-3.5 text-[#234B36]" />
                      {locationSummary}
                    </span>
                    <span>·</span>
                    <span className="px-2 py-0.5 rounded-md bg-[#234B36]/10 text-[#234B36] font-bold">
                      {propertyType}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsFavorited(!isFavorited)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#252923] hover:text-[#234B36] transition cursor-pointer"
                    >
                      <Heart className={`w-4 h-4 ${isFavorited ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{isFavorited ? 'Saved' : 'Save'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Photo Showcase Gallery */}
              <div className="rounded-2xl overflow-hidden border border-[#E5E0D5] bg-[#FCFAF6]">
                {allPhotos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-2">
                    {/* Main Hero Photo */}
                    <div className="md:col-span-2 md:row-span-2 relative h-72 md:h-96 rounded-xl overflow-hidden group">
                      <img
                        src={allPhotos[modalActivePhotoIdx % allPhotos.length]}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-lg">
                        Featured Photo
                      </span>
                    </div>

                    {/* Additional Photo Thumbnails */}
                    {allPhotos.slice(0, 4).map((photo, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => setModalActivePhotoIdx(pIdx)}
                        className={`relative h-34 md:h-[188px] rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                          modalActivePhotoIdx === pIdx ? 'border-[#234B36] ring-2 ring-[#234B36]/30' : 'border-transparent opacity-85 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={photo}
                          alt={`Preview ${pIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center gap-3 text-center p-6 text-[#73776F]">
                    <div className="w-14 h-14 rounded-2xl bg-[#E5E0D5]/50 flex items-center justify-center">
                      <Camera className="w-7 h-7 text-[#73776F]" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-[#252923]">No listing photos uploaded yet</p>
                      <p className="text-xs text-[#73776F] mt-0.5">Upload photos in the Gallery section to display your property mosaic</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Two Column Layout: Details vs Reservation Simulator */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column (7 cols): Specs, Host, Description, Amenities */}
                <div className="lg:col-span-7 space-y-8">
                  {/* Host Row */}
                  <div className="flex items-center justify-between pb-6 border-b border-[#EEF3EF]">
                    <div>
                      <h2 className="text-lg font-black text-[#252923]">
                        Entire {propertyType} hosted by {hostName || 'You'}
                      </h2>
                      <p className="text-xs text-[#73776F] mt-1">
                        {numGuests} guests · {numBedrooms} bedrooms · {numBathrooms} baths {numArea > 0 ? `· ${numArea} m²` : ''}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-[#234B36] text-[#E6C687] font-black text-base flex items-center justify-center shadow-md">
                      {(hostName || 'You').slice(0, 2).toUpperCase()}
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="space-y-4 pb-6 border-b border-[#EEF3EF]">
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-[#234B36] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-[#252923]">Curated Engida Experience</p>
                        <p className="text-xs text-[#73776F]">Authentic Ethiopian hospitality with verified space verification.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-[#252923]">Host Protection Included</p>
                        <p className="text-xs text-[#73776F]">Full host damage protection and 24/7 guest support.</p>
                      </div>
                    </div>
                  </div>

                  {/* Description Section */}
                  <div className="space-y-3 pb-6 border-b border-[#EEF3EF]">
                    <h3 className="text-sm font-black uppercase tracking-wider text-[#73776F]">
                      About this space
                    </h3>
                    <div className="text-xs text-[#252923] whitespace-pre-line leading-relaxed">
                      {description?.trim() ? (
                        description
                      ) : (
                        <p className="italic text-[#73776F]">
                          No description has been written yet. Return to the editor to add your property story or use the AI Listing Copilot to draft an engaging description.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Amenities Showcase */}
                  <div className="space-y-3 pb-6 border-b border-[#EEF3EF]">
                    <h3 className="text-sm font-black uppercase tracking-wider text-[#73776F]">
                      What this place offers ({selectedAmenities.length})
                    </h3>
                    {selectedAmenities.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2.5 pt-1">
                        {selectedAmenities.map((amenity) => (
                          <div
                            key={amenity.id}
                            className="flex items-center gap-2 p-2.5 rounded-xl border border-[#E5E0D5] bg-[#FCFAF6] text-xs font-semibold text-[#252923]"
                          >
                            <Check className="w-3.5 h-3.5 text-[#234B36] shrink-0" />
                            <span className="truncate">{amenity.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs italic text-[#73776F]">No amenities selected yet.</p>
                    )}
                  </div>

                  {/* Where you'll be (Interactive Public Map) */}
                  <div className="space-y-3 pb-6 border-b border-[#EEF3EF]">
                    <h3 className="text-sm font-black uppercase tracking-wider text-[#73776F]">
                      Where you&apos;ll be
                    </h3>
                    <PropertyPublicMap
                      latitude={latitude ? Number(latitude) : null}
                      longitude={longitude ? Number(longitude) : null}
                      title={title || 'Your Property'}
                      address={address}
                      city={city}
                      subCity={subCity}
                      neighborhood={neighborhood}
                      showExactPin={true}
                    />
                  </div>

                  {/* House Rules */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-[#73776F]">
                      Things to know
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#73776F]">
                      <div className="p-3 rounded-xl border border-[#E5E0D5] bg-white space-y-1">
                        <p className="font-bold text-[#252923]">House rules</p>
                        <p>Check-in: After 3:00 PM</p>
                        <p>Checkout: 11:00 AM</p>
                        <p>No smoking or unapproved events</p>
                      </div>
                      <div className="p-3 rounded-xl border border-[#E5E0D5] bg-white space-y-1">
                        <p className="font-bold text-[#252923]">Safety & Property</p>
                        <p>Smoke detector installed</p>
                        <p>Local Ethiopian security & support</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column (5 cols): Interactive Booking / Reservation Console */}
                <div className="lg:col-span-5">
                  <div className="sticky top-6 rounded-2xl border-2 border-[#234B36]/30 p-6 bg-[#FCFAF6] shadow-xl space-y-5">
                    {/* Price Header */}
                    <div className="flex items-baseline justify-between">
                      <div>
                        {currentPriceNum > 0 ? (
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-[#234B36]">
                              ETB {currentPriceNum.toLocaleString()}
                            </span>
                            {!isSale && <span className="text-xs text-[#73776F] font-bold">/ night</span>}
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                            Set price in listing editor
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-[#252923]">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span>5.0</span>
                        <span className="text-[10px] text-[#73776F] font-normal">(New)</span>
                      </div>
                    </div>

                    {/* Booking Form Widget Simulation */}
                    <div className="rounded-xl border border-[#E5E0D5] bg-white overflow-hidden text-xs">
                      {/* Dates simulation */}
                      <div className="grid grid-cols-2 border-b border-[#E5E0D5]">
                        <div className="p-3 border-r border-[#E5E0D5]">
                          <span className="block text-[9px] font-black uppercase tracking-wider text-[#73776F]">
                            CHECK-IN
                          </span>
                          <span className="font-bold text-[#252923]">Nov 1, 2026</span>
                        </div>
                        <div className="p-3">
                          <span className="block text-[9px] font-black uppercase tracking-wider text-[#73776F]">
                            CHECKOUT
                          </span>
                          <span className="font-bold text-[#252923]">Nov 6, 2026</span>
                        </div>
                      </div>

                      {/* Guests Simulation Dropdown */}
                      <div className="p-3 flex items-center justify-between">
                        <div>
                          <span className="block text-[9px] font-black uppercase tracking-wider text-[#73776F]">
                            GUESTS
                          </span>
                          <span className="font-bold text-[#252923]">
                            {simulatedGuests} {simulatedGuests === 1 ? 'guest' : 'guests'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSimulatedGuests(Math.max(1, simulatedGuests - 1))}
                            className="w-6 h-6 rounded-md border border-[#E5E0D5] flex items-center justify-center font-bold hover:bg-[#EEF3EF] cursor-pointer"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold w-4 text-center">{simulatedGuests}</span>
                          <button
                            type="button"
                            onClick={() => setSimulatedGuests(Math.min(numGuests, simulatedGuests + 1))}
                            className="w-6 h-6 rounded-md border border-[#E5E0D5] flex items-center justify-center font-bold hover:bg-[#EEF3EF] cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Simulation Reserve Button */}
                    <button
                      type="button"
                      onClick={() => setBookingSimulated(true)}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-[#234B36] to-[#2D5E43] hover:from-[#2D5E43] hover:to-[#234B36] text-white font-black text-xs shadow-md transition-all active:scale-[0.99] cursor-pointer"
                    >
                      {isSale ? 'Simulate Purchase Inquiry' : 'Simulate Guest Reservation'}
                    </button>

                    {/* Success simulation feedback */}
                    {bookingSimulated && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1 animate-fadeIn">
                        <p className="font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          Reservation simulation successful!
                        </p>
                        <p className="text-[11px] text-emerald-700">
                          In production, public guests will securely complete checkout via Telebirr or CBE Bank.
                        </p>
                      </div>
                    )}

                    <p className="text-center text-[10px] text-[#73776F]">
                      You won't be charged — this simulates guest interaction.
                    </p>

                    {/* Price Calculation breakdown */}
                    {!isSale && currentPriceNum > 0 && (
                      <div className="pt-4 border-t border-[#E5E0D5] space-y-2 text-xs">
                        <div className="flex justify-between text-[#73776F]">
                          <span>ETB {currentPriceNum.toLocaleString()} x {simulatedNights} nights</span>
                          <span className="font-semibold text-[#252923]">ETB {nightlySubtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-[#73776F]">
                          <span>Cleaning fee</span>
                          <span className="font-semibold text-[#252923]">ETB {cleaningFee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-[#73776F]">
                          <span>Engida service fee</span>
                          <span className="font-semibold text-[#252923]">ETB {serviceFee.toLocaleString()}</span>
                        </div>
                        <div className="pt-2 border-t border-[#E5E0D5] flex justify-between font-black text-[#252923] text-sm">
                          <span>Total before taxes</span>
                          <span className="text-[#234B36]">ETB {bookingTotal.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Action Bar */}
            <div className="px-6 py-3.5 border-t border-[#EEF3EF] bg-[#FCFAF6] flex items-center justify-between shrink-0">
              <span className="text-xs text-[#73776F] font-medium flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#234B36]" /> Form edits update this preview in real time
              </span>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#234B36] text-white hover:bg-[#2D5E43] transition cursor-pointer"
              >
                Close & Return to Editor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
