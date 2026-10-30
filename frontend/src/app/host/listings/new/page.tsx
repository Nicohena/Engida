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
  ArrowRight,
  Building2,
  Home,
  DoorClosed,
  Layers,
  MapPin,
  Image as ImageIcon,
  Save,
  AlertTriangle,
  CheckCircle2,
  Check,
  X,
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

// ─────────────────────────────────────────────────────────
// Wizard Steps Definition
// ─────────────────────────────────────────────────────────
interface StepDef {
  number: number;
  title: string;
  shortTitle: string;
  icon: typeof MapPin;
  description: string;
}

const WIZARD_STEPS: StepDef[] = [
  {
    number: 1,
    title: 'Property Identity & Location',
    shortTitle: 'Location',
    icon: MapPin,
    description: 'Define your property category and location on the Ethiopian map.',
  },
  {
    number: 2,
    title: 'Space & Capacity',
    shortTitle: 'Space',
    icon: Layers,
    description: 'Specify bedrooms, bathrooms, guest capacity, and usable square meters.',
  },
  {
    number: 3,
    title: 'Features & Infrastructure',
    shortTitle: 'Amenities',
    icon: ShieldCheck,
    description: 'Highlight backup generator, water reservoir, security, and amenities.',
  },
  {
    number: 4,
    title: 'Photos & Visuals',
    shortTitle: 'Photos',
    icon: ImageIcon,
    description: 'Upload high-resolution photography and establish a standout cover image.',
  },
  {
    number: 5,
    title: 'Title & Description',
    shortTitle: 'Title & Story',
    icon: Sparkles,
    description: 'Craft an engaging title and narrative, or auto-draft them with AI Copilot.',
  },
  {
    number: 6,
    title: 'Strategy & Market Pricing',
    shortTitle: 'Pricing',
    icon: Tag,
    description: 'Calibrate your price in ETB with AI benchmarks and strategy tiers.',
  },
  {
    number: 7,
    title: 'Policies & Review',
    shortTitle: 'Review',
    icon: BookOpen,
    description: 'Review house rules, cancellation terms, and publish your listing draft.',
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
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotMode, setCopilotMode] = useState<CopilotMode>('both');
  const [amenitiesCatalog, setAmenitiesCatalog] = useState<{ id: string; name: string }[]>([]);

  // Restore draft state from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('engida_host_listing_new_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setForm((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Sync draft state to sessionStorage
  useEffect(() => {
    if (isDirty) {
      try {
        sessionStorage.setItem('engida_host_listing_new_draft', JSON.stringify(form));
      } catch {
        // ignore
      }
    }
  }, [form, isDirty]);

  // Load amenities catalog
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

  const handleSaveDraftLocally = () => {
    try {
      sessionStorage.setItem('engida_host_listing_new_draft', JSON.stringify(form));
      setSaveToast('Progress saved locally. You can resume at any time.');
      setTimeout(() => setSaveToast(null), 3500);
    } catch {
      setSaveToast('Unable to access browser storage.');
      setTimeout(() => setSaveToast(null), 3500);
    }
  };

  // ─────────────────────────────────────────────────────────
  // Per-Step Validation
  // ─────────────────────────────────────────────────────────
  const validateStep = (stepNumber: number): boolean => {
    const newErrors: Record<string, string> = {};

    // Step 1: Location
    if (stepNumber === 1) {
      if (!form.address.trim()) {
        newErrors.address = 'Street address is required';
      }
      if (!form.city.trim()) {
        newErrors.city = 'City is required';
      }
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
    }

    // Step 2: Space & Capacity
    if (stepNumber === 2) {
      if (form.listingType === 'RENTAL' && form.maxGuests !== '') {
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
    }

    // Step 4: Photos
    if (stepNumber === 4) {
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
    }

    // Step 5: Title & Narrative
    if (stepNumber === 5) {
      if (!form.title.trim()) {
        newErrors.title = 'Title is required';
      } else if (form.title.trim().length > 255) {
        newErrors.title = 'Title must be 255 characters or fewer';
      }

      if (!form.description.trim()) {
        newErrors.description = 'Description is required';
      }
    }

    // Step 6: Pricing
    if (stepNumber === 6) {
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
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  // Full validation before submission
  const validateAllSteps = (): boolean => {
    let valid = true;
    for (let s = 1; s <= 7; s++) {
      if (!validateStep(s)) {
        valid = false;
        setCurrentStep(s);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      }
    }
    return valid;
  };

  const handleNextStep = (stepNumber?: number) => {
    const next = stepNumber ?? currentStep + 1;
    if (next > currentStep && !validateStep(currentStep)) {
      return;
    }
    setCompletedSteps((prev) => (prev.includes(currentStep) ? prev : [...prev, currentStep]));
    setCurrentStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStepClick = (stepNumber: number) => {
    if (stepNumber < currentStep || completedSteps.includes(stepNumber) || stepNumber === currentStep + 1) {
      if (stepNumber > currentStep && !validateStep(currentStep)) {
        return;
      }
      setCompletedSteps((prev) => (prev.includes(currentStep) ? prev : [...prev, currentStep]));
      setCurrentStep(stepNumber);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ─────────────────────────────────────────────────────────
  // Form Submission
  // ─────────────────────────────────────────────────────────
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setServerError(null);

    if (!validateAllSteps()) {
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

      const res = await apiFetch<{ id: string }>('/host/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      try {
        sessionStorage.removeItem('engida_host_listing_new_draft');
      } catch {
        // ignore
      }

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

  const progressPercent = Math.round(((currentStep - 1) / (WIZARD_STEPS.length - 1)) * 100);
  const currentStepDef = WIZARD_STEPS[currentStep - 1];
  const CurrentStepIcon = currentStepDef.icon;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* ── Top Header & Navigation ── */}
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
            Step-by-step listing creation wizard. Your preview updates in real-time on the right.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleSaveDraftLocally}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E0D5] bg-white hover:bg-[#EEF3EF] rounded-xl text-xs font-semibold text-[#252923] transition cursor-pointer shadow-xs"
            title="Save draft progress in browser"
          >
            <Save className="w-3.5 h-3.5 text-[#73776F]" />
            <span>Save Draft</span>
          </button>
        </div>
      </div>

      {/* Save Draft Toast Notice */}
      {saveToast && (
        <div className="p-3 bg-[#252923] text-[#F8F5ED] text-xs font-medium rounded-xl shadow-md transition flex items-center justify-between border border-[#E5E0D5]/40 animate-fade-in">
          <span>{saveToast}</span>
          <button
            type="button"
            onClick={() => setSaveToast(null)}
            className="ml-3 text-[#E5E0D5] hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

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

      {/* ── Sleek Persistent Multi-Step Progress Tracker ── */}
      <div className="bg-white/95 backdrop-blur-md border border-[#E5E0D5] rounded-2xl p-4 shadow-xs">
        {/* Mobile Step Counter & Progress Bar */}
        <div className="sm:hidden space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#252923]">
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#234B36] text-white flex items-center justify-center text-[10px] font-black">
                {currentStep}
              </span>
              <span className="text-[#234B36]">{currentStepDef.title}</span>
            </span>
            <span className="text-[#73776F] font-mono">{progressPercent}%</span>
          </div>
          <div className="w-full bg-[#EEF3EF] rounded-full h-2 overflow-hidden border border-[#E5E0D5]/50">
            <div
              className="bg-[#234B36] h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Desktop Stepper Bar */}
        <div className="hidden sm:block">
          <ol className="grid grid-cols-7 gap-2" role="list">
            {WIZARD_STEPS.map((step) => {
              const isCompleted = completedSteps.includes(step.number);
              const isCurrent = currentStep === step.number;
              const isClickable =
                isCompleted || step.number <= Math.max(...completedSteps, 1) + 1;
              const Icon = step.icon;

              return (
                <li key={step.number} className="relative flex flex-col items-center text-center">
                  <button
                    type="button"
                    disabled={!isClickable}
                    onClick={() => handleStepClick(step.number)}
                    className={`w-full flex flex-col items-center p-2 rounded-xl transition ${
                      isClickable
                        ? 'cursor-pointer hover:bg-[#F8F5ED]'
                        : 'cursor-default opacity-50'
                    }`}
                    aria-label={`Step ${step.number}: ${step.title}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition mb-1 ${
                        isCompleted
                          ? 'bg-[#234B36] text-white shadow-xs'
                          : isCurrent
                          ? 'bg-[#234B36] text-white ring-4 ring-[#234B36]/20 shadow-xs'
                          : 'bg-[#EEF3EF] text-[#73776F] border border-[#E5E0D5]'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <Icon className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-bold tracking-tight line-clamp-1 ${
                        isCurrent
                          ? 'text-[#234B36]'
                          : isCompleted
                          ? 'text-[#252923]'
                          : 'text-[#73776F]'
                      }`}
                    >
                      {step.shortTitle}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* ── Two-Column Responsive Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ═══════════════════════════════════════════════════
            LEFT COLUMN: Sleek Active Step Card (65%)
        ═══════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="bg-white border border-[#E5E0D5] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
            {/* Step Header */}
            <div className="flex items-center gap-3.5 pb-4 border-b border-[#EEF3EF]">
              <div className="w-10 h-10 rounded-xl bg-[#234B36]/10 text-[#234B36] flex items-center justify-center shrink-0">
                <CurrentStepIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#234B36]/10 text-[#234B36]">
                    Step {currentStep} of 7
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-[#252923] tracking-tight">
                    {currentStepDef.title}
                  </h2>
                </div>
                <p className="text-xs text-[#73776F] mt-0.5">
                  {currentStepDef.description}
                </p>
              </div>
            </div>

            {/* ──────────────────────────────────────────────────
                STEP 1: Property Identity & Location
            ────────────────────────────────────────────────── */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                {/* Listing Intent Toggle (Rental vs Sale) */}
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
                      Interactive Location Map <span className="text-xs text-[#73776F] font-normal">(Drag pin or search to auto-fill)</span>
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
              </div>
            )}

            {/* ──────────────────────────────────────────────────
                STEP 2: Space & Capacity
            ────────────────────────────────────────────────── */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fade-in">
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
                    {errors.bedrooms && (
                      <p className="text-xs text-red-600 font-semibold">{errors.bedrooms}</p>
                    )}
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
                    {errors.bathrooms && (
                      <p className="text-xs text-red-600 font-semibold">{errors.bathrooms}</p>
                    )}
                  </div>

                  {form.listingType === 'RENTAL' && (
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
                      {errors.maxGuests && (
                        <p className="text-xs text-red-600 font-semibold">{errors.maxGuests}</p>
                      )}
                    </div>
                  )}

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
                    {errors.areaSqm && (
                      <p className="text-xs text-red-600 font-semibold">{errors.areaSqm}</p>
                    )}
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
                    {errors.parkingSpaces && (
                      <p className="text-xs text-red-600 font-semibold">{errors.parkingSpaces}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ──────────────────────────────────────────────────
                STEP 3: Features & Amenities
            ────────────────────────────────────────────────── */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fade-in">
                <AmenitySelector
                  selectedIds={form.amenityIds}
                  onChange={(ids) => {
                    setIsDirty(true);
                    setForm((prev) => ({ ...prev, amenityIds: ids }));
                  }}
                />
              </div>
            )}

            {/* ──────────────────────────────────────────────────
                STEP 4: Photos & Visuals
            ────────────────────────────────────────────────── */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-fade-in">
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
              </div>
            )}

            {/* ──────────────────────────────────────────────────
                STEP 5: Title & Description
            ────────────────────────────────────────────────── */}
            {currentStep === 5 && (
              <div className="space-y-6 animate-fade-in">
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
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EEF3EF] hover:bg-[#E2ECE4] text-xs font-black text-[#234B36] border border-[#234B36]/20 shadow-2xs hover:shadow-xs transition cursor-pointer"
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
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EEF3EF] hover:bg-[#E2ECE4] text-xs font-black text-[#234B36] border border-[#234B36]/20 shadow-2xs hover:shadow-xs transition cursor-pointer"
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
              </div>
            )}

            {/* ──────────────────────────────────────────────────
                STEP 6: Pricing & Commercial Value
            ────────────────────────────────────────────────── */}
            {currentStep === 6 && (
              <div className="space-y-6 animate-fade-in">
                {form.listingType === 'RENTAL' ? (
                  <div className="space-y-2 max-w-2xl">
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
                  <div className="space-y-2 max-w-2xl">
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
              </div>
            )}

            {/* ──────────────────────────────────────────────────
                STEP 7: Policies & Review
            ────────────────────────────────────────────────── */}
            {currentStep === 7 && (
              <div className="space-y-6 animate-fade-in">
                {/* Policies & Guidelines */}
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

                {/* Pre-Publishing Summary Card */}
                <div className="p-5 rounded-2xl bg-[#F8F5ED]/70 border border-[#E5E0D5] space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#234B36]">
                    Listing Readiness Checklist
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[#73776F] block text-[11px]">Type &amp; Intent</span>
                      <span className="font-bold text-[#252923]">
                        {form.propertyType} • {form.listingType === 'SALE' ? 'Sale' : 'Rent'}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[#73776F] block text-[11px]">Location</span>
                      <span className="font-bold text-[#252923]">
                        {form.subCity ? `${form.subCity}, ` : ''}{form.city || 'Addis Ababa'}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[#73776F] block text-[11px]">Price</span>
                      <span className="font-bold text-[#234B36]">
                        {form.listingType === 'RENTAL'
                          ? form.pricePerNight ? `ETB ${Number(form.pricePerNight).toLocaleString()} / night` : 'Not set'
                          : form.salePrice ? `ETB ${Number(form.salePrice).toLocaleString()} total` : 'Not set'}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[#73776F] block text-[11px]">Layout</span>
                      <span className="font-bold text-[#252923]">
                        {form.bedrooms} Bed • {form.bathrooms} Bath {form.listingType === 'RENTAL' ? `• ${form.maxGuests} Guests` : ''}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[#73776F] block text-[11px]">Amenities</span>
                      <span className="font-bold text-[#252923]">
                        {form.amenityIds.length} verified item(s)
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[#73776F] block text-[11px]">Gallery</span>
                      <span className="font-bold text-[#252923]">
                        {form.coverImage ? 'Cover set' : 'No cover'} • {form.images.length} photos
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Sleek Step Navigation Footer ── */}
            <div className="pt-6 border-t border-[#EEF3EF] flex items-center justify-between gap-3">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handleBackStep}
                  className="px-4 py-2.5 rounded-xl border border-[#E5E0D5] bg-white hover:bg-[#F8F5ED] text-xs font-bold text-[#252923] transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                {currentStep < 7 ? (
                  <button
                    type="button"
                    onClick={() => handleNextStep()}
                    className="px-6 py-2.5 rounded-xl bg-[#234B36] hover:bg-[#2D5E43] active:bg-[#1A3828] text-white text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <span>Continue to {WIZARD_STEPS[currentStep]?.shortTitle || 'Next'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-[#234B36] hover:bg-[#2D5E43] active:bg-[#1A3828] text-white text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Saving Listing…</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Save &amp; Publish Draft</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
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
