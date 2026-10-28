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
import AiPricingWidget from '../../../../components/host/AiPricingWidget';
import AiListingCopilotModal, { type CopilotMode } from '../../../../components/host/AiListingCopilotModal';
import HostListingLivePreview from '../../../../components/host/HostListingLivePreview';
import HostLocationPickerMap from '../../../../components/maps/HostLocationPickerMap';
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
  ShieldCheck,
  Tag,
  Clock,
  BookOpen,
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

const SECTIONS_NAV = [
  { id: 'section-location', label: '1. Location' },
  { id: 'section-space', label: '2. Space' },
  { id: 'section-amenities', label: '3. Amenities' },
  { id: 'section-photos', label: '4. Photos' },
  { id: 'section-narrative', label: '5. Story & AI' },
  { id: 'section-pricing', label: '6. Pricing' },
  { id: 'section-policies', label: '7. Policies' },
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
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotMode, setCopilotMode] = useState<CopilotMode>('both');
  const [amenitiesCatalog, setAmenitiesCatalog] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    let ignore = false;
    apiFetch<{ id: string; name: string }[]>('/amenities')
      .then((data) => {
        if (!ignore && Array.isArray(data)) {
          setAmenitiesCatalog(data);
        }
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

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

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
      } else if (g > 50) {
        newErrors.maxGuests = 'Max guests cannot exceed 50';
      }
    }

    if (form.bedrooms !== '') {
      const b = parseInt(form.bedrooms, 10);
      if (isNaN(b) || b < 0) {
        newErrors.bedrooms = 'Bedrooms cannot be negative';
      } else if (b > 50) {
        newErrors.bedrooms = 'Bedrooms cannot exceed 50';
      }
    }

    if (form.bathrooms !== '') {
      const ba = parseInt(form.bathrooms, 10);
      if (isNaN(ba) || ba < 0) {
        newErrors.bathrooms = 'Bathrooms cannot be negative';
      } else if (ba > 50) {
        newErrors.bathrooms = 'Bathrooms cannot exceed 50';
      }
    }

    if (form.areaSqm !== '') {
      const a = parseFloat(form.areaSqm);
      if (isNaN(a) || a < 0) {
        newErrors.areaSqm = 'Area cannot be negative';
      }
    }

    if (form.parkingSpaces !== '') {
      const pk = parseInt(form.parkingSpaces, 10);
      if (isNaN(pk) || pk < 0) {
        newErrors.parkingSpaces = 'Parking spaces cannot be negative';
      }
    }

    // Location
    if (!form.address.trim()) {
      newErrors.address = 'Street address is required';
    }
    if (!form.city.trim()) {
      newErrors.city = 'City is required';
    }

    // Optional Coordinates validation
    if (form.latitude !== '') {
      const lat = parseFloat(form.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        newErrors.latitude = 'Latitude must be between -90 and 90';
      }
    }

    if (form.longitude !== '') {
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

      if (form.listingType === 'RENTAL') {
        payload.pricePerNight = Number(form.pricePerNight);
      } else {
        payload.salePrice = Number(form.salePrice);
      }

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
        payload.areaSqm = parseFloat(form.areaSqm);
      }
      if (form.parkingSpaces !== '') {
        payload.parkingSpaces = parseInt(form.parkingSpaces, 10);
      }
      if (form.latitude !== '') {
        payload.latitude = parseFloat(form.latitude);
      }
      if (form.longitude !== '') {
        payload.longitude = parseFloat(form.longitude);
      }

      const res = await apiFetch<{ id: string }>('/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setIsSuccess(true);
      setIsDirty(false);

      setTimeout(() => {
        if (res && res.id) {
          router.push(`/host/listings/${res.id}`);
        } else {
          router.push('/host/listings');
        }
      }, 1200);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An error occurred while creating the listing';
      setServerError(message);
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ── Top Breadcrumbs & Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E0D5] pb-5">
        <div className="space-y-1">
          <Link
            href="/host/listings"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#73776F] hover:text-[#234B36] transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Listings
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-[#252923] tracking-tight">
              Create New Listing
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#234B36]/10 text-[#234B36] border border-[#234B36]/20">
              Draft Mode
            </span>
          </div>
          <p className="text-xs text-[#73776F]">
            Follow the sequential sections below. Your listing preview updates live on the right.
          </p>
        </div>
      </div>

      {/* ── Banners ── */}
      {serverError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-800">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm font-medium">
            <p className="font-bold mb-0.5">Could not save listing</p>
            <p className="text-red-700">{serverError}</p>
          </div>
          <button onClick={() => setServerError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-800">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="text-sm font-semibold">
            Listing created successfully in Draft status! Redirecting…
          </div>
        </div>
      )}

      {/* ── OPTION B: Two-Column Responsive Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ═══════════════════════════════════════════════════
            LEFT COLUMN: Structured Sequential Form (65%)
        ═══════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* Section Quick Jump Bar (Static Header Navigation) */}
          <div className="bg-white border border-[#E5E0D5] rounded-2xl p-1.5 shadow-2xs overflow-x-auto no-scrollbar flex items-center gap-1">
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
                    Define the core category of your property and where guests or buyers will find it.
                  </p>
                </div>
              </div>

              {/* Listing Type Toggle (Rental vs Sale) */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-[#252923]">Listing Intent</label>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  <button
                    type="button"
                    onClick={() => handleListingTypeChange('RENTAL')}
                    className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3 ${
                      form.listingType === 'RENTAL'
                        ? 'border-[#234B36] bg-[#234B36]/5 ring-2 ring-[#234B36]/20'
                        : 'border-[#E5E0D5] bg-white hover:bg-[#F8F5ED]'
                    }`}
                  >
                    <Building2
                      className={`w-5 h-5 ${
                        form.listingType === 'RENTAL' ? 'text-[#234B36]' : 'text-[#73776F]'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-black text-[#252923]">For Rent</div>
                      <div className="text-[11px] text-[#73776F]">Short-term & flexible guest stays</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleListingTypeChange('SALE')}
                    className={`p-3.5 rounded-xl border text-left transition flex items-center gap-3 ${
                      form.listingType === 'SALE'
                        ? 'border-amber-600 bg-amber-50 ring-2 ring-amber-500/20'
                        : 'border-[#E5E0D5] bg-white hover:bg-[#F8F5ED]'
                    }`}
                  >
                    <Tag
                      className={`w-5 h-5 ${
                        form.listingType === 'SALE' ? 'text-amber-600' : 'text-[#73776F]'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-black text-[#252923]">For Sale</div>
                      <div className="text-[11px] text-[#73776F]">Real estate transaction</div>
                    </div>
                  </button>
                </div>
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

              {/* Interactive Real Map Location Picker */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-[#252923]">
                    Interactive Property Location Map <span className="text-xs text-[#73776F] font-normal">(Drag pin or search to auto-fill address)</span>
                  </label>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Live Auto-Fill Active
                  </span>
                </div>
                <HostLocationPickerMap
                  initialLat={form.latitude ? parseFloat(form.latitude) : null}
                  initialLng={form.longitude ? parseFloat(form.longitude) : null}
                  initialAddress={form.address}
                  initialCity={form.city}
                  initialSubCity={form.subCity}
                  initialNeighborhood={form.neighborhood}
                  onLocationChange={(loc) => {
                    setForm((prev) => ({
                      ...prev,
                      address: loc.address || prev.address,
                      city: loc.city || prev.city,
                      subCity: loc.subCity || prev.subCity,
                      neighborhood: loc.neighborhood || prev.neighborhood,
                      latitude: loc.latitude.toString(),
                      longitude: loc.longitude.toString(),
                    }));
                    setErrors((prev) => {
                      const next = { ...prev };
                      if (loc.address) delete next.address;
                      if (loc.city) delete next.city;
                      return next;
                    });
                  }}
                />
              </div>

              {/* Location Address */}
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
                    placeholder="e.g. Cameroon St, near Edna Mall"
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
                    placeholder="e.g. Addis Ababa"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium text-[#252923] focus:outline-none focus:ring-2 transition ${
                      errors.city
                        ? 'border-red-400 focus:ring-red-200'
                        : 'border-[#E5E0D5] focus:ring-[#234B36]/20 focus:border-[#234B36]'
                    }`}
                  />
                  {errors.city && <p className="text-xs text-red-600 font-semibold">{errors.city}</p>}
                </div>
              </div>

              {/* Ethiopian Administrative Subdivisions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
                    maxLength={100}
                    placeholder="e.g. Bole"
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
                    maxLength={150}
                    placeholder="e.g. Atlas / Rwanda / Sarbet"
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
                    maxLength={100}
                    placeholder="e.g. Woreda 03"
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
                    Physical specs and room numbers. These feed directly into our AI pricing and description models.
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
                    placeholder="e.g. 120"
                    value={form.areaSqm}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E0D5] text-sm font-medium text-[#252923] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="parkingSpaces" className="block text-xs font-bold text-[#252923]">
                    Parking Spaces
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
                    Highlight essential infrastructure (Generator, WiFi, Water) to maximize booking conversion.
                  </p>
                </div>
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
                    High-quality images unlock higher search rankings and provide visual context for AI.
                  </p>
                </div>
              </div>

              <GalleryManager
                coverImage={form.coverImage}
                images={form.images}
                listingStatus="DRAFT"
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
                SECTION 5: Title & Description (AI Copilot)
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
                      Grounded in your location, room specs, amenities, and uploaded photos.
                    </p>
                  </div>
                </div>
              </div>

              {/* Title Input */}
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
                  placeholder="e.g. Modern 2-Bedroom Apartment in Bole with Balcony"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium text-[#252923] placeholder:text-[#73776F] focus:outline-none focus:ring-2 transition ${
                    errors.title
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-[#E5E0D5] focus:ring-[#234B36]/20 focus:border-[#234B36]'
                  }`}
                />
                {errors.title && <p className="text-xs text-red-600 font-semibold">{errors.title}</p>}
              </div>

              {/* Description Input */}
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
                  placeholder="Describe what makes this property special, verified amenities, proximity to transit, and neighborhood highlights…"
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-medium text-[#252923] placeholder:text-[#73776F] focus:outline-none focus:ring-2 transition ${
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
                    Set your commercial rates in Ethiopian Birr (ETB) with AI market recommendations.
                  </p>
                </div>
              </div>

              {form.listingType === 'RENTAL' ? (
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
                        placeholder="e.g. 4500"
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
                      listingType={form.listingType}
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
                        setForm((prev) => ({ ...prev, pricePerNight: String(price) }));
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
                        placeholder="e.g. 8500000"
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
                        setForm((prev) => ({ ...prev, salePrice: String(price) }));
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
                SECTION 7: House Rules & Operational Policies
            ═══════════════════════════════════════════════════ */}
            <section
              id="section-policies"
              className="bg-white border border-[#E5E0D5] rounded-2xl p-6 md:p-8 space-y-5 scroll-mt-14"
            >
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#EEF3EF]">
                <ShieldCheck className="w-5 h-5 text-[#234B36]" />
                <div>
                  <h2 className="text-lg font-black text-[#252923]">7. Policies &amp; House Rules</h2>
                  <p className="text-xs text-[#73776F] mt-0.5">
                    Standard guest policies and cancellation guidelines.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#F8F5ED] border border-[#E5E0D5] space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#252923]">
                    <Clock className="w-4 h-4 text-[#234B36]" /> Check-in &amp; Check-out
                  </div>
                  <p className="text-[11px] text-[#73776F]">
                    Standard Check-in: 2:00 PM | Check-out: 11:00 AM (Customizable after creation).
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#F8F5ED] border border-[#E5E0D5] space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#252923]">
                    <BookOpen className="w-4 h-4 text-[#234B36]" /> Cancellation Policy
                  </div>
                  <p className="text-[11px] text-[#73776F]">
                    Moderate: Full refund up to 5 days before check-in.
                  </p>
                </div>
              </div>
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
            listingType={form.listingType}
            address={form.address}
            city={form.city}
            subCity={form.subCity}
            neighborhood={form.neighborhood}
            latitude={form.latitude}
            longitude={form.longitude}
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
            description={form.description}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            submitLabel="Save Draft Listing"
            submittingLabel="Saving Listing…"
            cancelHref="/host/listings"
          />
        </div>
      </div>

      {/* ✨ AI Listing Copilot Modal */}
      <AiListingCopilotModal
        isOpen={isCopilotOpen}
        mode={copilotMode}
        onClose={() => setIsCopilotOpen(false)}
        propertyType={form.propertyType}
        listingType={form.listingType}
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
          setForm((prev) => ({ ...prev, title }));
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
          setForm((prev) => ({ ...prev, description }));
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
          setForm((prev) => ({ ...prev, title, description }));
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
