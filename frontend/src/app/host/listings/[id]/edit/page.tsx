'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '../../../../../lib/api';
import type {
  HostListingDetail,
  UpdateHostListingPayload,
  PropertyType,
} from '../../../../../types/host';
import AmenitySelector from '../../../../../components/host/AmenitySelector';
import GalleryManager from '../../../../../components/host/GalleryManager';
import HostRoomsManager from '../../../../../components/host/HostRoomsManager';
import AiPricingWidget from '../../../../../components/host/AiPricingWidget';
import AiListingCopilotModal, { type CopilotMode } from '../../../../../components/host/AiListingCopilotModal';
import HostListingLivePreview from '../../../../../components/host/HostListingLivePreview';
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
  RotateCcw,
  X,
  Lock,
  Sparkles,
  Info,
  Tag,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

function initFormFromListing(data: HostListingDetail): EditFormState {
  const activeReview = data.activeReview?.status === 'PENDING' ? data.activeReview : null;
  const proposed = activeReview?.proposedChanges || {};

  return {
    title: (proposed.title as string) ?? data.title ?? '',
    description: (proposed.description as string) ?? data.description ?? '',
    propertyType: (proposed.propertyType as PropertyType) ?? data.propertyType ?? 'APARTMENT',
    pricePerNight:
      proposed.pricePerNight !== undefined
        ? String(proposed.pricePerNight)
        : data.pricePerNight
        ? String(data.pricePerNight)
        : '',
    salePrice:
      proposed.salePrice !== undefined
        ? String(proposed.salePrice)
        : data.salePrice
        ? String(data.salePrice)
        : '',
    maxGuests:
      proposed.maxGuests !== undefined
        ? String(proposed.maxGuests)
        : data.maxGuests !== undefined
        ? String(data.maxGuests)
        : '2',
    bedrooms:
      proposed.bedrooms !== undefined
        ? String(proposed.bedrooms)
        : data.bedrooms !== undefined
        ? String(data.bedrooms)
        : '1',
    bathrooms:
      proposed.bathrooms !== undefined
        ? String(proposed.bathrooms)
        : data.bathrooms !== undefined
        ? String(data.bathrooms)
        : '1',
    areaSqm:
      proposed.areaSqm !== undefined
        ? String(proposed.areaSqm)
        : data.areaSqm !== undefined
        ? String(data.areaSqm)
        : '',
    parkingSpaces:
      proposed.parkingSpaces !== undefined
        ? String(proposed.parkingSpaces)
        : data.parkingSpaces !== undefined
        ? String(data.parkingSpaces)
        : '0',
    address: (proposed.address as string) ?? data.address ?? '',
    city: (proposed.city as string) ?? data.city ?? '',
    subCity: (proposed.subCity as string) ?? data.subCity ?? '',
    region: (proposed.region as string) ?? data.region ?? '',
    zone: (proposed.zone as string) ?? data.zone ?? '',
    woreda: (proposed.woreda as string) ?? data.woreda ?? '',
    neighborhood: (proposed.neighborhood as string) ?? data.neighborhood ?? '',
    country: (proposed.country as string) ?? data.country ?? 'Ethiopia',
    latitude:
      proposed.latitude !== undefined
        ? String(proposed.latitude)
        : data.latitude !== null && data.latitude !== undefined
        ? String(data.latitude)
        : '',
    longitude:
      proposed.longitude !== undefined
        ? String(proposed.longitude)
        : data.longitude !== null && data.longitude !== undefined
        ? String(data.longitude)
        : '',
    coverImage: (proposed.coverImage as string) ?? data.coverImage ?? '',
    images: Array.isArray(proposed.images)
      ? (proposed.images as string[])
      : Array.isArray(data.images)
      ? data.images
      : [],
    amenityIds: Array.isArray(proposed.amenityIds)
      ? (proposed.amenityIds as string[])
      : Array.isArray(data.amenities)
      ? data.amenities.map((a) => a.id)
      : [],
  };
}

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

const SECTIONS_NAV = [
  { id: 'section-location', label: '1. Location' },
  { id: 'section-space', label: '2. Space' },
  { id: 'section-amenities', label: '3. Amenities' },
  { id: 'section-photos', label: '4. Photos' },
  { id: 'section-narrative', label: '5. Story & AI' },
  { id: 'section-pricing', label: '6. Pricing' },
  { id: 'section-policies', label: '7. Policies' },
];

interface EditFormState {
  title: string;
  description: string;
  propertyType: PropertyType;
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

export default function EditListingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const listingId = params.id;

  const [listing, setListing] = useState<HostListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [is404, setIs404] = useState(false);

  // Form State
  const [form, setForm] = useState<EditFormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotMode, setCopilotMode] = useState<CopilotMode>('both');
  const [amenitiesCatalog, setAmenitiesCatalog] = useState<{ id: string; name: string }[]>([]);

  const fetchListing = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      setIs404(false);

      const [listingData, amenitiesData] = await Promise.all([
        apiFetch<HostListingDetail>(`/host/listings/${listingId}`),
        apiFetch<{ id: string; name: string }[]>('/amenities').catch(() => []),
      ]);

      setListing(listingData);
      setForm(initFormFromListing(listingData));
      if (Array.isArray(amenitiesData)) {
        setAmenitiesCatalog(amenitiesData);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load listing.';
      if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
        setIs404(true);
      } else {
        setFetchError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

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
    setForm((prev) => (prev ? { ...prev, [name]: value } : prev));

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handlePropertyTypeChange = (type: PropertyType) => {
    setIsDirty(true);
    setForm((prev) => (prev ? { ...prev, propertyType: type } : prev));
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // ─────────────────────────────────────────────────────────
  // Validation
  // ─────────────────────────────────────────────────────────
  const validateForm = (): boolean => {
    if (!form || !listing) return false;
    const newErrors: Record<string, string> = {};

    if (!form.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (form.title.trim().length > 255) {
      newErrors.title = 'Title must be 255 characters or fewer';
    }

    if (!form.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (listing.listingType === 'RENTAL') {
      const p = Number(form.pricePerNight);
      if (!form.pricePerNight || isNaN(p) || p <= 0) {
        newErrors.pricePerNight = 'Price per night must be greater than 0 ETB';
      }
    } else if (listing.listingType === 'SALE') {
      const s = Number(form.salePrice);
      if (!form.salePrice || isNaN(s) || s <= 0) {
        newErrors.salePrice = 'Sale price must be greater than 0 ETB';
      }
    }

    if (form.maxGuests !== '') {
      const g = parseInt(form.maxGuests, 10);
      if (isNaN(g) || g < 1) newErrors.maxGuests = 'Max guests must be at least 1';
      else if (g > 50) newErrors.maxGuests = 'Max guests cannot exceed 50';
    }

    if (form.bedrooms !== '') {
      const b = parseInt(form.bedrooms, 10);
      if (isNaN(b) || b < 0) newErrors.bedrooms = 'Bedrooms cannot be negative';
      else if (b > 50) newErrors.bedrooms = 'Bedrooms cannot exceed 50';
    }

    if (form.bathrooms !== '') {
      const b = parseInt(form.bathrooms, 10);
      if (isNaN(b) || b < 0) newErrors.bathrooms = 'Bathrooms cannot be negative';
      else if (b > 50) newErrors.bathrooms = 'Bathrooms cannot exceed 50';
    }

    if (form.areaSqm !== '') {
      const a = parseFloat(form.areaSqm);
      if (isNaN(a) || a < 0) newErrors.areaSqm = 'Area cannot be negative';
    }

    if (form.parkingSpaces !== '') {
      const p = parseInt(form.parkingSpaces, 10);
      if (isNaN(p) || p < 0) newErrors.parkingSpaces = 'Parking spaces cannot be negative';
    }

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
  // Submission
  // ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !listing) return;

    setServerError(null);

    if (!validateForm()) {
      const firstError = Object.keys(errors)[0];
      const el = document.getElementById(firstError);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: UpdateHostListingPayload = {
        title: form.title.trim(),
        description: form.description.trim(),
        propertyType: form.propertyType,
        address: form.address.trim(),
        city: form.city.trim(),
        ...(form.country?.trim() ? { country: form.country.trim() } : {}),
        ...(form.region?.trim() ? { region: form.region.trim() } : {}),
        ...(form.zone?.trim() ? { zone: form.zone.trim() } : {}),
        ...(form.subCity?.trim() ? { subCity: form.subCity.trim() } : {}),
        ...(form.woreda?.trim() ? { woreda: form.woreda.trim() } : {}),
        ...(form.neighborhood?.trim() ? { neighborhood: form.neighborhood.trim() } : {}),
        coverImage: form.coverImage.trim() || undefined,
        images: form.images,
        amenityIds: form.amenityIds,
      };

      if (listing.listingType === 'RENTAL') {
        payload.pricePerNight = Number(form.pricePerNight);
      } else {
        payload.salePrice = Number(form.salePrice);
      }

      if (form.maxGuests !== '') payload.maxGuests = parseInt(form.maxGuests, 10);
      if (form.bedrooms !== '') payload.bedrooms = parseInt(form.bedrooms, 10);
      if (form.bathrooms !== '') payload.bathrooms = parseInt(form.bathrooms, 10);
      if (form.areaSqm !== '') payload.areaSqm = parseFloat(form.areaSqm);
      if (form.parkingSpaces !== '') payload.parkingSpaces = parseInt(form.parkingSpaces, 10);

      if (form.latitude.trim() !== '') payload.latitude = parseFloat(form.latitude);
      if (form.longitude.trim() !== '') payload.longitude = parseFloat(form.longitude);

      await apiFetch<HostListingDetail>(`/host/listings/${listing.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setIsSuccess(true);
      setIsDirty(false);
      router.push(`/host/listings/${listing.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update listing.';
      setServerError(msg);
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 w-36 bg-[#EEF3EF] rounded-lg" />
        <div className="h-10 w-1/2 bg-[#EEF3EF] rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 h-96 bg-[#EEF3EF] rounded-2xl" />
          <div className="lg:col-span-4 h-96 bg-[#EEF3EF] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (is404) {
    return (
      <div className="p-6 md:p-12 max-w-xl mx-auto text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-[#F8F5ED] border border-[#E5E0D5] flex items-center justify-center mx-auto text-[#73776F]">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-[#252923]">Listing Not Found</h1>
        <p className="text-sm text-[#73776F]">
          The listing with ID <code className="font-mono text-xs bg-[#EEF3EF] px-1.5 py-0.5 rounded text-[#252923]">{listingId}</code> does
          not exist or you do not have permission to edit it.
        </p>
        <Link
          href="/host/listings"
          className="inline-flex items-center gap-2 bg-[#234B36] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow transition"
        >
          <ArrowLeft className="w-4 h-4" /> Return to My Listings
        </Link>
      </div>
    );
  }

  if (fetchError || !form || !listing) {
    return (
      <div className="p-6 md:p-12 max-w-xl mx-auto text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-600">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-[#252923]">Error Loading Listing</h1>
        <p className="text-sm text-red-700">{fetchError || 'Unable to load listing details.'}</p>
        <button
          onClick={fetchListing}
          className="inline-flex items-center gap-2 bg-[#234B36] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow transition"
        >
          <RotateCcw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const isPendingReview = listing.activeReview?.status === 'PENDING';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ── Top Breadcrumbs & Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E0D5] pb-5">
        <div className="space-y-1">
          <Link
            href={`/host/listings/${listing.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#73776F] hover:text-[#234B36] transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Listing Overview
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-[#252923] tracking-tight">
              Edit Listing: {listing.title}
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#234B36]/10 text-[#234B36] border border-[#234B36]/20">
              {listing.status}
            </span>
          </div>
          <p className="text-xs text-[#73776F]">
            Sequential enterprise editor. Changes reflect in real-time on your live preview card.
          </p>
        </div>
      </div>

      {/* ── Pending Review Banner ── */}
      {isPendingReview && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-sm">
            <h4 className="font-bold text-amber-900">Review Pending</h4>
            <p className="text-xs text-amber-800 mt-0.5">
              You currently have proposed changes awaiting administrative review. Saving new changes here will update your draft submission.
            </p>
          </div>
        </div>
      )}

      {/* ── Server Error Banner ── */}
      {serverError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-800">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm font-medium">
            <p className="font-bold mb-0.5">Could not save changes</p>
            <p className="text-red-700">{serverError}</p>
          </div>
          <button onClick={() => setServerError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── OPTION B: Two-Column Responsive Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ═══════════════════════════════════════════════════
            LEFT COLUMN: Structured Sequential Form (65%)
        ═══════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Sticky Section Quick Jump Bar */}
          <div className="sticky top-2 z-10 bg-white/90 backdrop-blur-md border border-[#E5E0D5] rounded-2xl p-1.5 shadow-xs overflow-x-auto flex items-center gap-1">
            {SECTIONS_NAV.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => scrollToSection(sec.id)}
                className="px-3 py-1 rounded-xl text-xs font-bold text-[#73776F] hover:text-[#252923] hover:bg-[#F8F5ED] whitespace-nowrap transition"
              >
                {sec.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ═══════════════════════════════════════════════════
                SECTION 1: Property Identity & Location
            ═══════════════════════════════════════════════════ */}
            <section
              id="section-location"
              className="bg-white border border-[#E5E0D5] rounded-2xl p-6 md:p-8 space-y-6 scroll-mt-14"
            >
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#EEF3EF]">
                <MapPin className="w-5 h-5 text-[#234B36]" />
                <div>
                  <h2 className="text-lg font-black text-[#252923]">1. Property Identity &amp; Location</h2>
                  <p className="text-xs text-[#73776F] mt-0.5">
                    Property category and geographic coordinates for your listing.
                  </p>
                </div>
              </div>

              {/* Immutable Listing Type Note */}
              <div className="bg-[#F8F5ED] border border-[#E5E0D5] rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-[#73776F]" />
                  <div>
                    <span className="text-xs font-bold text-[#252923]">Listing Intent: </span>
                    <span className="text-xs font-black text-[#234B36] uppercase tracking-wide">
                      {listing.listingType === 'SALE' ? 'Property For Sale' : 'For Rent'}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-[#73776F] font-semibold bg-white px-2 py-0.5 rounded border border-[#E5E0D5]">
                  Immutable
                </span>
              </div>

              {/* Property Type Grid */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-[#252923]">
                  Property Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {PROPERTY_TYPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = form.propertyType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handlePropertyTypeChange(opt.value)}
                        className={`p-3 rounded-xl border text-left transition ${
                          isSelected
                            ? 'border-[#234B36] bg-[#234B36]/5 ring-2 ring-[#234B36]/20'
                            : 'border-[#E5E0D5] bg-white hover:bg-[#F8F5ED]'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 mb-1.5 ${
                            isSelected ? 'text-[#234B36]' : 'text-[#73776F]'
                          }`}
                        />
                        <div className="text-xs font-bold text-[#252923]">{opt.label}</div>
                        <div className="text-[10px] text-[#73776F] line-clamp-1 mt-0.5">
                          {opt.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Address inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="sm:col-span-2 space-y-1.5">
                  <label htmlFor="address" className="block text-sm font-bold text-[#252923]">
                    Street Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="address"
                    name="address"
                    type="text"
                    value={form.address}
                    onChange={handleChange}
                    maxLength={255}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium text-[#252923] focus:outline-none focus:ring-2 transition ${
                      errors.address
                        ? 'border-red-400 focus:ring-red-200'
                        : 'border-[#E5E0D5] focus:ring-[#234B36]/20 focus:border-[#234B36]'
                    }`}
                  />
                  {errors.address && (
                    <p className="text-xs text-red-600 font-semibold">{errors.address}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="city" className="block text-sm font-bold text-[#252923]">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    value={form.city}
                    onChange={handleChange}
                    maxLength={100}
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium text-[#252923] focus:outline-none focus:ring-2 transition ${
                      errors.city
                        ? 'border-red-400 focus:ring-red-200'
                        : 'border-[#E5E0D5] focus:ring-[#234B36]/20 focus:border-[#234B36]'
                    }`}
                  />
                  {errors.city && <p className="text-xs text-red-600 font-semibold">{errors.city}</p>}
                </div>
              </div>

              {/* Sub-city & Neighborhood */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="subCity" className="block text-xs font-bold text-[#252923]">
                    Sub-City (Kifle Ketema)
                  </label>
                  <input
                    id="subCity"
                    name="subCity"
                    type="text"
                    value={form.subCity}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E0D5] text-sm font-medium text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="neighborhood" className="block text-xs font-bold text-[#252923]">
                    Neighborhood / Area
                  </label>
                  <input
                    id="neighborhood"
                    name="neighborhood"
                    type="text"
                    value={form.neighborhood}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E0D5] text-sm font-medium text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="woreda" className="block text-xs font-bold text-[#252923]">
                    Woreda (Optional)
                  </label>
                  <input
                    id="woreda"
                    name="woreda"
                    type="text"
                    value={form.woreda}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E0D5] text-sm font-medium text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] transition"
                  />
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════
                SECTION 2: Space & Capacity
            ═══════════════════════════════════════════════════ */}
            <section
              id="section-space"
              className="bg-white border border-[#E5E0D5] rounded-2xl p-6 md:p-8 space-y-6 scroll-mt-14"
            >
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#EEF3EF]">
                <Layers className="w-5 h-5 text-[#234B36]" />
                <div>
                  <h2 className="text-lg font-black text-[#252923]">2. Space &amp; Capacity</h2>
                  <p className="text-xs text-[#73776F] mt-0.5">
                    Physical dimensions, guest capacity, and room layout.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="bedrooms" className="block text-xs font-bold text-[#252923]">
                    Bedrooms <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="bedrooms"
                    name="bedrooms"
                    type="number"
                    min="0"
                    max="50"
                    value={form.bedrooms}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E0D5] text-sm font-medium text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="bathrooms" className="block text-xs font-bold text-[#252923]">
                    Bathrooms <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="bathrooms"
                    name="bathrooms"
                    type="number"
                    min="0"
                    max="50"
                    value={form.bathrooms}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E0D5] text-sm font-medium text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="maxGuests" className="block text-xs font-bold text-[#252923]">
                    Max Guests <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="maxGuests"
                    name="maxGuests"
                    type="number"
                    min="1"
                    max="50"
                    value={form.maxGuests}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E0D5] text-sm font-medium text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="areaSqm" className="block text-xs font-bold text-[#252923]">
                    Area (m²)
                  </label>
                  <input
                    id="areaSqm"
                    name="areaSqm"
                    type="number"
                    min="0"
                    step="any"
                    value={form.areaSqm}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E0D5] text-sm font-medium text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="parkingSpaces" className="block text-xs font-bold text-[#252923]">
                    Parking
                  </label>
                  <input
                    id="parkingSpaces"
                    name="parkingSpaces"
                    type="number"
                    min="0"
                    value={form.parkingSpaces}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E0D5] text-sm font-medium text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] transition"
                  />
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════
                SECTION 3: Features & Amenities
            ═══════════════════════════════════════════════════ */}
            <section
              id="section-amenities"
              className="bg-white border border-[#E5E0D5] rounded-2xl p-6 md:p-8 space-y-6 scroll-mt-14"
            >
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#EEF3EF]">
                <Sparkles className="w-5 h-5 text-[#234B36]" />
                <div>
                  <h2 className="text-lg font-black text-[#252923]">3. Features &amp; Infrastructure</h2>
                  <p className="text-xs text-[#73776F] mt-0.5">
                    Verified infrastructure amenities (Generator, Water, WiFi).
                  </p>
                </div>
              </div>

              <AmenitySelector
                selectedIds={form.amenityIds}
                onChange={(ids) => {
                  setIsDirty(true);
                  setForm((prev) => (prev ? { ...prev, amenityIds: ids } : prev));
                }}
              />
            </section>

            {/* ═══════════════════════════════════════════════════
                SECTION 4: Photos & Gallery
            ═══════════════════════════════════════════════════ */}
            <section
              id="section-photos"
              className="bg-white border border-[#E5E0D5] rounded-2xl p-6 md:p-8 space-y-6 scroll-mt-14"
            >
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#EEF3EF]">
                <ImageIcon className="w-5 h-5 text-[#234B36]" />
                <div>
                  <h2 className="text-lg font-black text-[#252923]">4. Photos &amp; Gallery</h2>
                  <p className="text-xs text-[#73776F] mt-0.5">
                    Manage your cover image and uploaded photo gallery.
                  </p>
                </div>
              </div>

              <GalleryManager
                coverImage={form.coverImage}
                images={form.images}
                propertyId={listing.id}
                listingStatus={listing.status}
                isPendingReview={isPendingReview}
                onCoverImageChange={(url) => {
                  setIsDirty(true);
                  setForm((prev) => (prev ? { ...prev, coverImage: url } : prev));
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
                  setForm((prev) => (prev ? { ...prev, images: urls } : prev));
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
                SECTION 5: Title & Narrative (AI Copilot)
            ═══════════════════════════════════════════════════ */}
            <section
              id="section-narrative"
              className="bg-white border border-[#E5E0D5] rounded-2xl p-6 md:p-8 space-y-6 scroll-mt-14"
            >
              <div className="pb-3 border-b border-[#EEF3EF]">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-[#234B36]" />
                  <div>
                    <h2 className="text-lg font-black text-[#252923]">5. Title &amp; Narrative</h2>
                    <p className="text-xs text-[#73776F] mt-0.5">
                      Grounded in your property specs and uploaded photo gallery.
                    </p>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="title" className="block text-sm font-bold text-[#252923]">
                    Listing Title <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCopilotMode('title');
                      setIsCopilotOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EEF3EF] hover:bg-[#E2ECE4] text-xs font-black text-[#234B36] border border-[#234B36]/20 shadow-2xs hover:shadow-xs transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#234B36]" />
                    <span>Auto-draft Title</span>
                  </button>
                </div>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={form.title}
                  onChange={handleChange}
                  maxLength={255}
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium text-[#252923] focus:outline-none focus:ring-2 transition ${
                    errors.title
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-[#E5E0D5] focus:ring-[#234B36]/20 focus:border-[#234B36]'
                  }`}
                />
                {errors.title && <p className="text-xs text-red-600 font-semibold">{errors.title}</p>}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="description" className="block text-sm font-bold text-[#252923]">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setCopilotMode('description');
                      setIsCopilotOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EEF3EF] hover:bg-[#E2ECE4] text-xs font-black text-[#234B36] border border-[#234B36]/20 shadow-2xs hover:shadow-xs transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#234B36]" />
                    <span>Auto-draft Description</span>
                  </button>
                </div>
                <textarea
                  id="description"
                  name="description"
                  rows={6}
                  value={form.description}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-medium text-[#252923] focus:outline-none focus:ring-2 transition ${
                    errors.description
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-[#E5E0D5] focus:ring-[#234B36]/20 focus:border-[#234B36]'
                  }`}
                />
                {errors.description && (
                  <p className="text-xs text-red-600 font-semibold">{errors.description}</p>
                )}
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════
                SECTION 6: Pricing & Financials
            ═══════════════════════════════════════════════════ */}
            <section
              id="section-pricing"
              className="bg-white border border-[#E5E0D5] rounded-2xl p-6 md:p-8 space-y-6 scroll-mt-14"
            >
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#EEF3EF]">
                <Tag className="w-5 h-5 text-[#234B36]" />
                <div>
                  <h2 className="text-lg font-black text-[#252923]">6. Pricing &amp; Commercial Value</h2>
                  <p className="text-xs text-[#73776F] mt-0.5">
                    Calibrated market pricing in Ethiopian Birr (ETB).
                  </p>
                </div>
              </div>

              {listing.listingType === 'RENTAL' ? (
                <div className="space-y-2 max-w-3xl">
                  <label htmlFor="pricePerNight" className="block text-sm font-bold text-[#252923]">
                    Price per night (ETB) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="relative w-full sm:w-56 shrink-0">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-[#73776F]">
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
                        className={`w-full pl-14 pr-4 py-2.5 rounded-xl border text-sm font-medium text-[#252923] focus:outline-none focus:ring-2 transition ${
                          errors.pricePerNight
                            ? 'border-red-400 focus:ring-red-200'
                            : 'border-[#E5E0D5] focus:ring-[#234B36]/20 focus:border-[#234B36]'
                        }`}
                      />
                    </div>

                    <AiPricingWidget
                      city={form.city}
                      subCity={form.subCity}
                      neighborhood={form.neighborhood}
                      propertyType={form.propertyType}
                      listingType={listing.listingType}
                      bedrooms={form.bedrooms}
                      bathrooms={form.bathrooms}
                      maxGuests={form.maxGuests}
                      areaSqm={form.areaSqm}
                      amenityIds={form.amenityIds}
                      amenityCatalog={amenitiesCatalog}
                      currentPrice={form.pricePerNight}
                      coverImage={form.coverImage}
                      images={form.images}
                      onApplyPrice={(price) => {
                        setIsDirty(true);
                        setForm((prev) => (prev ? { ...prev, pricePerNight: String(price) } : prev));
                        if (errors.pricePerNight) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.pricePerNight;
                            return next;
                          });
                        }
                      }}
                    />
                  </div>
                  {errors.pricePerNight && (
                    <p className="text-xs text-red-600 font-semibold">{errors.pricePerNight}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2 max-w-3xl">
                  <label htmlFor="salePrice" className="block text-sm font-bold text-[#252923]">
                    Total Sale Price (ETB) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="relative w-full sm:w-56 shrink-0">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-[#73776F]">
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
                        className={`w-full pl-14 pr-4 py-2.5 rounded-xl border text-sm font-medium text-[#252923] focus:outline-none focus:ring-2 transition ${
                          errors.salePrice
                            ? 'border-red-400 focus:ring-red-200'
                            : 'border-[#E5E0D5] focus:ring-[#234B36]/20 focus:border-[#234B36]'
                        }`}
                      />
                    </div>

                    <AiPricingWidget
                      city={form.city}
                      subCity={form.subCity}
                      neighborhood={form.neighborhood}
                      propertyType={form.propertyType}
                      listingType="SALE"
                      bedrooms={form.bedrooms}
                      bathrooms={form.bathrooms}
                      maxGuests={form.maxGuests}
                      areaSqm={form.areaSqm}
                      amenityIds={form.amenityIds}
                      amenityCatalog={amenitiesCatalog}
                      currentPrice={form.salePrice}
                      coverImage={form.coverImage}
                      images={form.images}
                      onApplyPrice={(price) => {
                        setIsDirty(true);
                        setForm((prev) => (prev ? { ...prev, salePrice: String(price) } : prev));
                        if (errors.salePrice) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.salePrice;
                            return next;
                          });
                        }
                      }}
                    />
                  </div>
                  {errors.salePrice && (
                    <p className="text-xs text-red-600 font-semibold">{errors.salePrice}</p>
                  )}
                </div>
              )}
            </section>

            {/* ═══════════════════════════════════════════════════
                SECTION 7: Operational Policies & Rooms
            ═══════════════════════════════════════════════════ */}
            <section
              id="section-policies"
              className="bg-white border border-[#E5E0D5] rounded-2xl p-6 md:p-8 space-y-5 scroll-mt-14"
            >
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#EEF3EF]">
                <ShieldCheck className="w-5 h-5 text-[#234B36]" />
                <div>
                  <h2 className="text-lg font-black text-[#252923]">7. Policies &amp; Room Configuration</h2>
                  <p className="text-xs text-[#73776F] mt-0.5">
                    Standard guest rules and individual room allocations.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#F8F5ED] border border-[#E5E0D5] space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#252923]">
                    <Clock className="w-4 h-4 text-[#234B36]" /> Check-in &amp; Check-out
                  </div>
                  <p className="text-[11px] text-[#73776F]">
                    Standard Check-in: 2:00 PM | Check-out: 11:00 AM
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#F8F5ED] border border-[#E5E0D5] space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#252923]">
                    <ShieldCheck className="w-4 h-4 text-[#234B36]" /> Booking Terms
                  </div>
                  <p className="text-[11px] text-[#73776F]">
                    All changes are immediately reflected on live guest search results.
                  </p>
                </div>
              </div>

              {listing.listingType === 'RENTAL' && (
                <div className="pt-4 border-t border-[#EEF3EF]">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#73776F] mb-3">
                    Room-by-Room Management
                  </h3>
                  <HostRoomsManager listingId={listing.id} initialRooms={listing.rooms || []} />
                </div>
              )}
            </section>
          </form>
        </div>

        {/* ═══════════════════════════════════════════════════
            RIGHT COLUMN: Sticky Live Guest Preview Console (35%)
        ═══════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto no-scrollbar">
          <HostListingLivePreview
            title={form.title}
            propertyType={form.propertyType}
            listingType={listing.listingType}
            city={form.city}
            subCity={form.subCity}
            neighborhood={form.neighborhood}
            bedrooms={form.bedrooms}
            bathrooms={form.bathrooms}
            maxGuests={form.maxGuests}
            areaSqm={form.areaSqm}
            pricePerNight={form.pricePerNight}
            salePrice={form.salePrice}
            coverImage={form.coverImage}
            images={form.images}
            amenityIds={form.amenityIds}
            amenityCatalog={amenitiesCatalog}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            submitLabel="Save Changes"
            submittingLabel="Saving Changes…"
            cancelHref={`/host/listings/${listing.id}`}
          />
        </div>
      </div>

      {/* ✨ AI Listing Copilot Modal */}
      <AiListingCopilotModal
        isOpen={isCopilotOpen}
        mode={copilotMode}
        onClose={() => setIsCopilotOpen(false)}
        propertyType={form.propertyType}
        listingType={listing.listingType}
        city={form.city}
        subCity={form.subCity}
        neighborhood={form.neighborhood}
        bedrooms={form.bedrooms}
        bathrooms={form.bathrooms}
        maxGuests={form.maxGuests}
        areaSqm={form.areaSqm}
        amenityIds={form.amenityIds}
        amenityCatalog={amenitiesCatalog}
        currentTitle={form.title}
        currentDescription={form.description}
        coverImage={form.coverImage}
        images={form.images}
        onApplyTitle={(title) => {
          setIsDirty(true);
          setForm((prev) => (prev ? { ...prev, title } : prev));
          if (errors.title) {
            setErrors((prev) => {
              const next = { ...prev };
              delete next.title;
              return next;
            });
          }
        }}
        onApplyDescription={(description) => {
          setIsDirty(true);
          setForm((prev) => (prev ? { ...prev, description } : prev));
          if (errors.description) {
            setErrors((prev) => {
              const next = { ...prev };
              delete next.description;
              return next;
            });
          }
        }}
        onApplyBoth={(title, description) => {
          setIsDirty(true);
          setForm((prev) => (prev ? { ...prev, title, description } : prev));
          setErrors((prev) => {
            const next = { ...prev };
            delete next.title;
            delete next.description;
            return next;
          });
        }}
      />
    </div>
  );
}
