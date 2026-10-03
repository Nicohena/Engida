'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '../../../../lib/api';
import type {
  CreateHostListingPayload,
  ListingType,
  PropertyType,
} from '../../../../types/host';
import AmenitySelector from '../../../../components/host/AmenitySelector';
import GalleryManager from '../../../../components/host/GalleryManager';
import {
  ArrowLeft,
  Building2,
  Home,
  DoorClosed,
  Layers,
  MapPin,
  Image as ImageIcon,
  Save,
  AlertTriangle,
  CheckCircle2,
  X,
  Compass,
  Sparkles,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────
// Property type options with descriptions and icons
// ─────────────────────────────────────────────────────────
const PROPERTY_TYPE_OPTIONS: {
  value: PropertyType;
  label: string;
  description: string;
  icon: typeof Home;
}[] = [
  {
    value: 'APARTMENT',
    label: 'Apartment',
    description: 'Self-contained flat in a residential building',
    icon: Building2,
  },
  {
    value: 'HOUSE',
    label: 'House',
    description: 'Standalone residential home with private entrance',
    icon: Home,
  },
  {
    value: 'VILLA',
    label: 'Villa',
    description: 'Luxury detached residence with compound/garden',
    icon: Layers,
  },
  {
    value: 'STUDIO',
    label: 'Studio',
    description: 'Single open-plan living and bedroom space',
    icon: Layers,
  },
  {
    value: 'BEDROOM',
    label: 'Private Room',
    description: 'Individual private room within a shared property',
    icon: DoorClosed,
  },
];

interface FormState {
  title: string;
  description: string;
  propertyType: PropertyType;
  listingType: ListingType;
  pricePerNight: string;
  salePrice: string;
  maxGuests: string;
  bedrooms: string;
  bathrooms: string;
  areaSqm: string;
  parkingSpaces: string;
  address: string;
  city: string;
  subCity: string;
  region: string;
  zone: string;
  woreda: string;
  neighborhood: string;
  country: string;
  latitude: string;
  longitude: string;
  coverImage: string;
  images: string[];
  amenityIds: string[];
}

const INITIAL_FORM_STATE: FormState = {
  title: '',
  description: '',
  propertyType: 'APARTMENT',
  listingType: 'RENTAL',
  pricePerNight: '',
  salePrice: '',
  maxGuests: '2',
  bedrooms: '1',
  bathrooms: '1',
  areaSqm: '',
  parkingSpaces: '0',
  address: '',
  city: 'Addis Ababa',
  subCity: '',
  region: 'Addis Ababa',
  zone: '',
  woreda: '',
  neighborhood: '',
  country: 'Ethiopia',
  latitude: '',
  longitude: '',
  coverImage: '',
  images: [],
  amenityIds: [],
};

export default function CreateListingPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Unsaved changes warning
  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      if (isDirty && !isSubmitting && !isSuccess) {
        e.preventDefault();
        e.returnValue = '';
      }
    },
    [isDirty, isSubmitting, isSuccess],
  );

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [handleBeforeUnload]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setIsDirty(true);
    setForm((prev) => ({ ...prev, [name]: value }));

    // Clear error for field
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleListingTypeChange = (type: ListingType) => {
    setIsDirty(true);
    setForm((prev) => ({
      ...prev,
      listingType: type,
      // Clear opposing price field when switching
      ...(type === 'RENTAL' ? { salePrice: '' } : { pricePerNight: '' }),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.pricePerNight;
      delete next.salePrice;
      return next;
    });
  };

  const handlePropertyTypeChange = (type: PropertyType) => {
    setIsDirty(true);
    setForm((prev) => ({ ...prev, propertyType: type }));
  };

  // ─────────────────────────────────────────────────────────
  // Client-side Validation
  // ─────────────────────────────────────────────────────────
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic Information
    if (!form.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (form.title.trim().length > 255) {
      newErrors.title = 'Title must be 255 characters or fewer';
    }

    if (!form.description.trim()) {
      newErrors.description = 'Description is required';
    }

    // Listing Type & Pricing
    if (form.listingType === 'RENTAL') {
      const p = Number(form.pricePerNight);
      if (!form.pricePerNight || isNaN(p) || p <= 0) {
        newErrors.pricePerNight = 'Price per night must be greater than 0 ETB';
      }
    } else if (form.listingType === 'SALE') {
      const s = Number(form.salePrice);
      if (!form.salePrice || isNaN(s) || s <= 0) {
        newErrors.salePrice = 'Sale price must be greater than 0 ETB';
      }
    }

    // Property Details (numerics)
    if (form.maxGuests !== '') {
      const g = parseInt(form.maxGuests, 10);
      if (isNaN(g) || g < 1) {
        newErrors.maxGuests = 'Max guests must be at least 1';
      }
    }

    if (form.bedrooms !== '') {
      const b = parseInt(form.bedrooms, 10);
      if (isNaN(b) || b < 0) {
        newErrors.bedrooms = 'Bedrooms cannot be negative';
      }
    }

    if (form.bathrooms !== '') {
      const b = parseInt(form.bathrooms, 10);
      if (isNaN(b) || b < 0) {
        newErrors.bathrooms = 'Bathrooms cannot be negative';
      }
    }

    if (form.areaSqm !== '') {
      const a = parseInt(form.areaSqm, 10);
      if (isNaN(a) || a < 0) {
        newErrors.areaSqm = 'Area cannot be negative';
      }
    }

    if (form.parkingSpaces !== '') {
      const p = parseInt(form.parkingSpaces, 10);
      if (isNaN(p) || p < 0) {
        newErrors.parkingSpaces = 'Parking spaces cannot be negative';
      }
    }

    // Address & Location
    if (!form.address.trim()) {
      newErrors.address = 'Street address is required';
    } else if (form.address.trim().length > 255) {
      newErrors.address = 'Address must be 255 characters or fewer';
    }

    if (!form.city.trim()) {
      newErrors.city = 'City is required';
    } else if (form.city.trim().length > 100) {
      newErrors.city = 'City must be 100 characters or fewer';
    }

    // Coordinates (optional)
    if (form.latitude.trim() !== '') {
      const lat = parseFloat(form.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        newErrors.latitude = 'Latitude must be between -90 and 90';
      }
    }

    if (form.longitude.trim() !== '') {
      const lng = parseFloat(form.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        newErrors.longitude = 'Longitude must be between -180 and 180';
      }
    }

    // Cover Image URL (optional)
    if (form.coverImage.trim() !== '') {
      try {
        const url = new URL(form.coverImage.trim());
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          newErrors.coverImage = 'Cover image must start with http:// or https://';
        }
      } catch {
        newErrors.coverImage = 'Please enter a valid image URL';
      }
    }

    // Gallery Images validation (optional)
    if (form.images && form.images.length > 0) {
      for (const imgUrl of form.images) {
        try {
          const url = new URL(imgUrl.trim());
          if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            newErrors.gallery = 'All gallery images must start with http:// or https://';
            break;
          }
        } catch {
          newErrors.gallery = 'One or more gallery image URLs are invalid';
          break;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─────────────────────────────────────────────────────────
  // Form Submission
  // ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) {
      // Scroll to the first error
      const firstErrorKey = Object.keys(errors)[0];
      const el = document.getElementById(firstErrorKey);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
      return;
    }

    setIsSubmitting(true);

    try {
      // Build DTO strictly matching CreateHostListingDto.
      // Do NOT send userId, hostId, status, or verificationStatus.
      const payload: CreateHostListingPayload = {
        title: form.title.trim(),
        description: form.description.trim(),
        propertyType: form.propertyType,
        listingType: form.listingType,
        address: form.address.trim(),
        city: form.city.trim(),
        ...(form.country?.trim() ? { country: form.country.trim() } : {}),
        ...(form.region?.trim() ? { region: form.region.trim() } : {}),
        ...(form.zone?.trim() ? { zone: form.zone.trim() } : {}),
        ...(form.subCity?.trim() ? { subCity: form.subCity.trim() } : {}),
        ...(form.woreda?.trim() ? { woreda: form.woreda.trim() } : {}),
        ...(form.neighborhood?.trim() ? { neighborhood: form.neighborhood.trim() } : {}),
        ...(form.coverImage?.trim() ? { coverImage: form.coverImage.trim() } : {}),
        ...(form.images && form.images.length > 0 ? { images: form.images } : {}),
        ...(form.amenityIds && form.amenityIds.length > 0 ? { amenityIds: form.amenityIds } : {}),
      };

      // Pricing rules: RENTAL only gets pricePerNight, SALE only gets salePrice
      if (form.listingType === 'RENTAL') {
        payload.pricePerNight = Number(form.pricePerNight);
      } else {
        payload.salePrice = Number(form.salePrice);
      }

      // Numerics
      if (form.maxGuests !== '') {
        payload.maxGuests = parseInt(form.maxGuests, 10);
      }
      if (form.bedrooms !== '') {
        payload.bedrooms = parseInt(form.bedrooms, 10);
      }
      if (form.bathrooms !== '') {
        payload.bathrooms = parseInt(form.bathrooms, 10);
      }
      if (form.areaSqm !== '') {
        payload.areaSqm = parseInt(form.areaSqm, 10);
      }
      if (form.parkingSpaces !== '') {
        payload.parkingSpaces = parseInt(form.parkingSpaces, 10);
      }

      // Coordinates
      if (form.latitude.trim() !== '') {
        payload.latitude = parseFloat(form.latitude);
      }
      if (form.longitude.trim() !== '') {
        payload.longitude = parseFloat(form.longitude);
      }

      const response = await apiFetch<{ id: string }>('/host/listings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsSuccess(true);
      setIsDirty(false);

      // Redirect after success
      if (response && response.id) {
        router.push(`/host/listings/${response.id}`);
      } else {
        router.push('/host/listings');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create listing. Please try again.';
      setServerError(message);
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* ── Top Bar / Breadcrumb ── */}
      <div className="flex items-center justify-between">
        <Link
          href="/host/listings"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#64748B] hover:text-[#33599E] transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Listings
        </Link>
      </div>

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#F1F5F9]">
        <div>
          <h1 className="text-2xl font-black text-[#000000] tracking-tight">Create Listing</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Fill in the information below. New listings start as a{' '}
            <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-xs uppercase tracking-wide">
              Draft
            </span>{' '}
            and can be published once complete.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <Link
            href="/host/listings"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-[#64748B] hover:bg-[#F4F7FC] border border-[#CBD5E1] transition"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 bg-[#33599E] hover:bg-[#234079] text-white text-sm font-bold px-5 py-2 rounded-xl shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving Draft…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Draft
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Server Error Banner ── */}
      {serverError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-800">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm font-medium">
            <p className="font-bold mb-0.5">Could not save listing</p>
            <p className="text-red-700">{serverError}</p>
          </div>
          <button
            onClick={() => setServerError(null)}
            className="text-red-400 hover:text-red-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Success Banner (Transient before redirect) ── */}
      {isSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-800">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="text-sm font-semibold">
            Listing created successfully in Draft status! Redirecting…
          </div>
        </div>
      )}

      {/* ── Form Body ── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ═══════════════════════════════════════════════════
            SECTION 1: Basic Information
        ═══════════════════════════════════════════════════ */}
        <section className="bg-white border border-[#CBD5E1] rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#F1F5F9]">
            <Building2 className="w-5 h-5 text-[#33599E]" />
            <h2 className="text-lg font-black text-[#000000]">Basic Information</h2>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="title" className="block text-sm font-bold text-[#000000]">
              Listing Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              maxLength={255}
              placeholder="e.g. Modern 2-Bedroom Apartment in Bole with Balcony"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium text-[#000000] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 transition ${
                errors.title
                  ? 'border-red-400 focus:ring-red-200'
                  : 'border-[#CBD5E1] focus:ring-[#33599E]/20 focus:border-[#33599E]'
              }`}
            />
            <div className="flex justify-between items-center text-xs">
              {errors.title ? (
                <span className="text-red-600 font-semibold">{errors.title}</span>
              ) : (
                <span className="text-[#94A3B8]">
                  Catchy, descriptive title highlighting key property features.
                </span>
              )}
              <span className="text-[#94A3B8]">{form.title.length}/255</span>
            </div>
          </div>

          {/* Property Type */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-[#000000]">
              Property Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PROPERTY_TYPE_OPTIONS.map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = form.propertyType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handlePropertyTypeChange(opt.value)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition ${
                      isSelected
                        ? 'border-[#33599E] bg-[#E3EAF5]/40 ring-1 ring-[#33599E]'
                        : 'border-[#CBD5E1] hover:border-[#94A3B8] bg-white'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-[#33599E] text-white' : 'bg-[#F4F7FC] text-[#64748B]'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#000000]">{opt.label}</div>
                      <p className="text-xs text-[#64748B] leading-snug mt-0.5">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="description" className="block text-sm font-bold text-[#000000]">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={form.description}
              onChange={handleChange}
              placeholder="Describe your property in detail. Mention space, atmosphere, neighborhood conveniences, nearby landmarks, and amenities guests or buyers will enjoy."
              className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium text-[#000000] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 transition ${
                errors.description
                  ? 'border-red-400 focus:ring-red-200'
                  : 'border-[#CBD5E1] focus:ring-[#33599E]/20 focus:border-[#33599E]'
              }`}
            />
            {errors.description && (
              <p className="text-xs text-red-600 font-semibold">{errors.description}</p>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            SECTION 2: Listing Type & Pricing
        ═══════════════════════════════════════════════════ */}
        <section className="bg-white border border-[#CBD5E1] rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#F1F5F9]">
            <Compass className="w-5 h-5 text-[#33599E]" />
            <h2 className="text-lg font-black text-[#000000]">Listing Type & Pricing</h2>
          </div>

          {/* Listing Type Toggle */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-[#000000]">
              Are you offering this property for Rental or Sale? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleListingTypeChange('RENTAL')}
                className={`p-4 rounded-xl border text-left transition flex items-start gap-3.5 ${
                  form.listingType === 'RENTAL'
                    ? 'border-[#33599E] bg-[#E3EAF5]/40 ring-1 ring-[#33599E]'
                    : 'border-[#CBD5E1] hover:border-[#94A3B8] bg-white'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    form.listingType === 'RENTAL'
                      ? 'bg-[#33599E] text-white'
                      : 'bg-[#F4F7FC] text-[#64748B]'
                  }`}
                >
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-[#000000]">Rental Property</div>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    For short-term or nightly accommodations. Priced per night in ETB.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleListingTypeChange('SALE')}
                className={`p-4 rounded-xl border text-left transition flex items-start gap-3.5 ${
                  form.listingType === 'SALE'
                    ? 'border-[#33599E] bg-[#E3EAF5]/40 ring-1 ring-[#33599E]'
                    : 'border-[#CBD5E1] hover:border-[#94A3B8] bg-white'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    form.listingType === 'SALE'
                      ? 'bg-[#33599E] text-white'
                      : 'bg-[#F4F7FC] text-[#64748B]'
                  }`}
                >
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-[#000000]">Property For Sale</div>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    For real estate purchase. Set total sale valuation in ETB.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Pricing fields react to listingType */}
          {form.listingType === 'RENTAL' && (
            <div className="space-y-1.5 max-w-sm">
              <label htmlFor="pricePerNight" className="block text-sm font-bold text-[#000000]">
                Price Per Night (ETB) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-[#64748B]">
                  ETB
                </span>
                <input
                  id="pricePerNight"
                  name="pricePerNight"
                  type="number"
                  min="1"
                  step="any"
                  value={form.pricePerNight}
                  onChange={handleChange}
                  placeholder="e.g. 4500"
                  className={`w-full pl-14 pr-4 py-2.5 rounded-xl border text-sm font-medium text-[#000000] focus:outline-none focus:ring-2 transition ${
                    errors.pricePerNight
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-[#CBD5E1] focus:ring-[#33599E]/20 focus:border-[#33599E]'
                  }`}
                />
              </div>
              {errors.pricePerNight ? (
                <p className="text-xs text-red-600 font-semibold">{errors.pricePerNight}</p>
              ) : (
                <p className="text-xs text-[#94A3B8]">
                  Rate charged to guests per night in Ethiopian Birr.
                </p>
              )}
            </div>
          )}

          {form.listingType === 'SALE' && (
            <div className="space-y-1.5 max-w-sm">
              <label htmlFor="salePrice" className="block text-sm font-bold text-[#000000]">
                Total Sale Price (ETB) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-[#64748B]">
                  ETB
                </span>
                <input
                  id="salePrice"
                  name="salePrice"
                  type="number"
                  min="1"
                  step="any"
                  value={form.salePrice}
                  onChange={handleChange}
                  placeholder="e.g. 8500000"
                  className={`w-full pl-14 pr-4 py-2.5 rounded-xl border text-sm font-medium text-[#000000] focus:outline-none focus:ring-2 transition ${
                    errors.salePrice
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-[#CBD5E1] focus:ring-[#33599E]/20 focus:border-[#33599E]'
                  }`}
                />
              </div>
              {errors.salePrice ? (
                <p className="text-xs text-red-600 font-semibold">{errors.salePrice}</p>
              ) : (
                <p className="text-xs text-[#94A3B8]">
                  Total purchase asking price in Ethiopian Birr.
                </p>
              )}
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════
            SECTION 3: Property Details
        ═══════════════════════════════════════════════════ */}
        <section className="bg-white border border-[#CBD5E1] rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#F1F5F9]">
            <Layers className="w-5 h-5 text-[#33599E]" />
            <h2 className="text-lg font-black text-[#000000]">Property Details</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {/* Max Guests */}
            <div className="space-y-1.5">
              <label htmlFor="maxGuests" className="block text-xs font-bold text-[#000000]">
                Max Guests
              </label>
              <input
                id="maxGuests"
                name="maxGuests"
                type="number"
                min="1"
                value={form.maxGuests}
                onChange={handleChange}
                className={`w-full px-3 py-2 rounded-xl border text-sm font-semibold text-[#000000] focus:outline-none focus:ring-2 transition ${
                  errors.maxGuests
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-[#CBD5E1] focus:ring-[#33599E]/20 focus:border-[#33599E]'
                }`}
              />
              {errors.maxGuests && (
                <p className="text-xs text-red-600">{errors.maxGuests}</p>
              )}
            </div>

            {/* Bedrooms */}
            <div className="space-y-1.5">
              <label htmlFor="bedrooms" className="block text-xs font-bold text-[#000000]">
                Bedrooms
              </label>
              <input
                id="bedrooms"
                name="bedrooms"
                type="number"
                min="0"
                value={form.bedrooms}
                onChange={handleChange}
                className={`w-full px-3 py-2 rounded-xl border text-sm font-semibold text-[#000000] focus:outline-none focus:ring-2 transition ${
                  errors.bedrooms
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-[#CBD5E1] focus:ring-[#33599E]/20 focus:border-[#33599E]'
                }`}
              />
              {errors.bedrooms && (
                <p className="text-xs text-red-600">{errors.bedrooms}</p>
              )}
            </div>

            {/* Bathrooms */}
            <div className="space-y-1.5">
              <label htmlFor="bathrooms" className="block text-xs font-bold text-[#000000]">
                Bathrooms
              </label>
              <input
                id="bathrooms"
                name="bathrooms"
                type="number"
                min="0"
                value={form.bathrooms}
                onChange={handleChange}
                className={`w-full px-3 py-2 rounded-xl border text-sm font-semibold text-[#000000] focus:outline-none focus:ring-2 transition ${
                  errors.bathrooms
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-[#CBD5E1] focus:ring-[#33599E]/20 focus:border-[#33599E]'
                }`}
              />
              {errors.bathrooms && (
                <p className="text-xs text-red-600">{errors.bathrooms}</p>
              )}
            </div>

            {/* Area Sqm */}
            <div className="space-y-1.5">
              <label htmlFor="areaSqm" className="block text-xs font-bold text-[#000000]">
                Area (m²)
              </label>
              <input
                id="areaSqm"
                name="areaSqm"
                type="number"
                min="0"
                value={form.areaSqm}
                onChange={handleChange}
                placeholder="e.g. 120"
                className={`w-full px-3 py-2 rounded-xl border text-sm font-semibold text-[#000000] focus:outline-none focus:ring-2 transition ${
                  errors.areaSqm
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-[#CBD5E1] focus:ring-[#33599E]/20 focus:border-[#33599E]'
                }`}
              />
              {errors.areaSqm && <p className="text-xs text-red-600">{errors.areaSqm}</p>}
            </div>

            {/* Parking Spaces */}
            <div className="space-y-1.5">
              <label htmlFor="parkingSpaces" className="block text-xs font-bold text-[#000000]">
                Parking Spaces
              </label>
              <input
                id="parkingSpaces"
                name="parkingSpaces"
                type="number"
                min="0"
                value={form.parkingSpaces}
                onChange={handleChange}
                className={`w-full px-3 py-2 rounded-xl border text-sm font-semibold text-[#000000] focus:outline-none focus:ring-2 transition ${
                  errors.parkingSpaces
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-[#CBD5E1] focus:ring-[#33599E]/20 focus:border-[#33599E]'
                }`}
              />
              {errors.parkingSpaces && (
                <p className="text-xs text-red-600">{errors.parkingSpaces}</p>
              )}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            SECTION 4: Location & Address
        ═══════════════════════════════════════════════════ */}
        <section className="bg-white border border-[#CBD5E1] rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#F1F5F9]">
            <MapPin className="w-5 h-5 text-[#33599E]" />
            <h2 className="text-lg font-black text-[#000000]">Location & Address</h2>
          </div>

          {/* Primary address and city */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="address" className="block text-sm font-bold text-[#000000]">
                Street Address <span className="text-red-500">*</span>
              </label>
              <input
                id="address"
                name="address"
                type="text"
                value={form.address}
                onChange={handleChange}
                maxLength={255}
                placeholder="e.g. Cameroon St, near Edna Mall"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium text-[#000000] focus:outline-none focus:ring-2 transition ${
                  errors.address
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-[#CBD5E1] focus:ring-[#33599E]/20 focus:border-[#33599E]'
                }`}
              />
              {errors.address && (
                <p className="text-xs text-red-600 font-semibold">{errors.address}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="city" className="block text-sm font-bold text-[#000000]">
                City <span className="text-red-500">*</span>
              </label>
              <input
                id="city"
                name="city"
                type="text"
                value={form.city}
                onChange={handleChange}
                maxLength={100}
                placeholder="e.g. Addis Ababa"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium text-[#000000] focus:outline-none focus:ring-2 transition ${
                  errors.city
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-[#CBD5E1] focus:ring-[#33599E]/20 focus:border-[#33599E]'
                }`}
              />
              {errors.city && <p className="text-xs text-red-600 font-semibold">{errors.city}</p>}
            </div>
          </div>

          {/* Ethiopian Administrative Hierarchy */}
          <div className="pt-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#94A3B8] mb-3">
              Ethiopian Administrative Hierarchy (Optional)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="subCity" className="block text-xs font-bold text-[#000000]">
                  Sub-City (Kifle Ketema)
                </label>
                <input
                  id="subCity"
                  name="subCity"
                  type="text"
                  value={form.subCity}
                  onChange={handleChange}
                  maxLength={100}
                  placeholder="e.g. Bole"
                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-sm font-medium text-[#000000] focus:outline-none focus:ring-2 focus:ring-[#33599E]/20 focus:border-[#33599E] transition"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="woreda" className="block text-xs font-bold text-[#000000]">
                  Woreda
                </label>
                <input
                  id="woreda"
                  name="woreda"
                  type="text"
                  value={form.woreda}
                  onChange={handleChange}
                  maxLength={100}
                  placeholder="e.g. Woreda 03"
                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-sm font-medium text-[#000000] focus:outline-none focus:ring-2 focus:ring-[#33599E]/20 focus:border-[#33599E] transition"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="neighborhood" className="block text-xs font-bold text-[#000000]">
                  Neighborhood / Area
                </label>
                <input
                  id="neighborhood"
                  name="neighborhood"
                  type="text"
                  value={form.neighborhood}
                  onChange={handleChange}
                  maxLength={150}
                  placeholder="e.g. Atlas / Rwanda"
                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-sm font-medium text-[#000000] focus:outline-none focus:ring-2 focus:ring-[#33599E]/20 focus:border-[#33599E] transition"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="region" className="block text-xs font-bold text-[#000000]">
                  Region / Chartered City
                </label>
                <input
                  id="region"
                  name="region"
                  type="text"
                  value={form.region}
                  onChange={handleChange}
                  maxLength={100}
                  placeholder="e.g. Addis Ababa"
                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-sm font-medium text-[#000000] focus:outline-none focus:ring-2 focus:ring-[#33599E]/20 focus:border-[#33599E] transition"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="zone" className="block text-xs font-bold text-[#000000]">
                  Zone
                </label>
                <input
                  id="zone"
                  name="zone"
                  type="text"
                  value={form.zone}
                  onChange={handleChange}
                  maxLength={100}
                  placeholder="e.g. Central Zone"
                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-sm font-medium text-[#000000] focus:outline-none focus:ring-2 focus:ring-[#33599E]/20 focus:border-[#33599E] transition"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="country" className="block text-xs font-bold text-[#000000]">
                  Country
                </label>
                <input
                  id="country"
                  name="country"
                  type="text"
                  value={form.country}
                  onChange={handleChange}
                  maxLength={100}
                  className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] text-sm font-medium text-[#000000] bg-[#F8FAFD] focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Optional Coordinates */}
          <div className="pt-2 border-t border-[#F1F5F9]">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#94A3B8] mb-3">
              Geographic Coordinates (Optional)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
              <div className="space-y-1.5">
                <label htmlFor="latitude" className="block text-xs font-bold text-[#000000]">
                  Latitude (-90 to 90)
                </label>
                <input
                  id="latitude"
                  name="latitude"
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={handleChange}
                  placeholder="e.g. 9.012345"
                  className={`w-full px-3 py-2 rounded-xl border text-sm font-medium text-[#000000] focus:outline-none focus:ring-2 transition ${
                    errors.latitude
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-[#CBD5E1] focus:ring-[#33599E]/20 focus:border-[#33599E]'
                  }`}
                />
                {errors.latitude && (
                  <p className="text-xs text-red-600 font-semibold">{errors.latitude}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="longitude" className="block text-xs font-bold text-[#000000]">
                  Longitude (-180 to 180)
                </label>
                <input
                  id="longitude"
                  name="longitude"
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={handleChange}
                  placeholder="e.g. 38.765432"
                  className={`w-full px-3 py-2 rounded-xl border text-sm font-medium text-[#000000] focus:outline-none focus:ring-2 transition ${
                    errors.longitude
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-[#CBD5E1] focus:ring-[#33599E]/20 focus:border-[#33599E]'
                  }`}
                />
                {errors.longitude && (
                  <p className="text-xs text-red-600 font-semibold">{errors.longitude}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════
            SECTION 5: Photos & Gallery Management
        ═══════════════════════════════════════════════════ */}
        <section className="bg-white border border-[#CBD5E1] rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#F1F5F9]">
            <ImageIcon className="w-5 h-5 text-[#33599E]" />
            <h2 className="text-lg font-black text-[#000000]">Photos &amp; Gallery</h2>
          </div>

          <GalleryManager
            coverImage={form.coverImage}
            images={form.images}
            onCoverImageChange={(url) => {
              setIsDirty(true);
              setForm((prev) => ({ ...prev, coverImage: url }));
              if (errors.coverImage) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.coverImage;
                  return next;
                });
              }
            }}
            onImagesChange={(urls) => {
              setIsDirty(true);
              setForm((prev) => ({ ...prev, images: urls }));
              if (errors.gallery) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.gallery;
                  return next;
                });
              }
            }}
            coverError={errors.coverImage}
          />
          {errors.gallery && (
            <p className="text-xs text-red-600 font-semibold">{errors.gallery}</p>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════
            SECTION 6: Features & Amenities
        ═══════════════════════════════════════════════════ */}
        <section className="bg-white border border-[#CBD5E1] rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#F1F5F9]">
            <Sparkles className="w-5 h-5 text-[#33599E]" />
            <h2 className="text-lg font-black text-[#000000]">Features &amp; Amenities</h2>
          </div>

          <AmenitySelector
            selectedIds={form.amenityIds}
            onChange={(ids) => {
              setIsDirty(true);
              setForm((prev) => ({ ...prev, amenityIds: ids }));
            }}
          />
        </section>

        {/* ═══════════════════════════════════════════════════
            Bottom Action Bar
        ═══════════════════════════════════════════════════ */}
        <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md border border-[#CBD5E1] rounded-2xl p-4 shadow-lg flex items-center justify-between gap-4">
          <div className="text-xs text-[#64748B]">
            New listings are created as <strong className="text-[#000000]">Draft</strong>. You can
            review and publish later.
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/host/listings"
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#64748B] hover:bg-[#F4F7FC] border border-[#CBD5E1] transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 bg-[#33599E] hover:bg-[#234079] text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving Draft…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Draft
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
