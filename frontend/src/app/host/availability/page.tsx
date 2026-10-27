'use client';

import React, { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { apiFetch } from '@/lib/api';
import type {
  HostListingRow,
  HostListingsResponse,
  HostReservationRow,
  HostReservationsResponse,
} from '@/types/host';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Ban,
  Luggage,
  Sparkles,
  Trash2,
  Building2,
  Info,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X,
  Compass,
  Calendar as CalendarIcon,
} from 'lucide-react';
import {
  gregorianToEthiopian,
  getEthiopianSpanForGregorianMonth,
  formatDualDate,
  ETHIOPIAN_WEEKDAYS,
  type EthiopianDate,
  type EthiopianHoliday,
} from '@/lib/ethiopianCalendar';

interface AvailabilityBlock {
  id: string;
  propertyId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  createdAt: string;
}

interface AvailabilityForm {
  startDate: string;
  endDate: string;
  reason: string;
}

const EMPTY_FORM: AvailabilityForm = { startDate: '', endDate: '', reason: '' };

const PRESET_REASONS = [
  'Routine Cleaning & Turnover',
  'Owner / Personal Stay',
  'Repairs & Renovation',
  'Seasonal Blackout',
  'Private Event',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DEMO_LISTINGS: HostListingRow[] = [
  {
    id: 'demo-penthouse-bole',
    title: 'Executive Luxury Penthouse overlooking Bole Medhanialem',
    description: 'Breathtaking 3-bedroom penthouse in Bole with generator, high-speed WiFi and panoramic city view.',
    propertyType: 'APARTMENT',
    listingType: 'RENTAL',
    status: 'PUBLISHED',
    pricePerNight: 6500,
    salePrice: null,
    address: 'Cameroon St, Bole Medhanialem',
    city: 'Addis Ababa',
    country: 'Ethiopia',
    region: 'Addis Ababa',
    zone: 'Bole Central',
    subCity: 'Bole',
    woreda: 'Woreda 03',
    neighborhood: 'Bole Medhanialem',
    coverImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isInstantBookable: true,
  } as unknown as HostListingRow,
  {
    id: 'demo-villa-lake-tana',
    title: 'Lake Tana Shoreline Retreat Villa with Sunset Terrace',
    description: 'Exclusive lakefront villa with private dock, organic garden, and traditional Ethiopian coffee pavilion.',
    propertyType: 'VILLA',
    listingType: 'RENTAL',
    status: 'PUBLISHED',
    pricePerNight: 4800,
    salePrice: null,
    address: 'Kebele 01, Lake Tana Shore',
    city: 'Bahir Dar',
    country: 'Ethiopia',
    region: 'Amhara',
    zone: 'South Gondar',
    subCity: 'Lake Tana Waterfront',
    woreda: 'Woreda 01',
    neighborhood: 'Shoreline',
    coverImage: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isInstantBookable: true,
  } as unknown as HostListingRow,
];

export default function HostAvailabilityPage() {
  const [listings, setListings] = useState<HostListingRow[]>([]);
  const [listingId, setListingId] = useState('');
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [reservations, setReservations] = useState<HostReservationRow[]>([]);
  const [form, setForm] = useState<AvailabilityForm>(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState<'blocks' | 'bookings'>('blocks');

  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Calendar View State: Year and Month (0-indexed: 0 = January, 11 = December)
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth());
  // Dual Ethiopian / Gregorian Calendar display mode (enabled by default)
  const [showEthiopianDates, setShowEthiopianDates] = useState(true);

  // Date selection helper state
  const [selectionStep, setSelectionStep] = useState<'start' | 'end'>('start');

  const isAuthError = useMemo(() => {
    if (!error) return false;
    const lower = error.toLowerCase();
    return (
      lower.includes('token') ||
      lower.includes('unauthorized') ||
      lower.includes('auth') ||
      lower.includes('expired') ||
      lower.includes('401')
    );
  }, [error]);

  const effectiveListings = useMemo(() => {
    return isDemoMode ? DEMO_LISTINGS : listings;
  }, [isDemoMode, listings]);

  const selectedListing = useMemo(
    () => effectiveListings.find((listing) => listing.id === listingId) ?? effectiveListings[0] ?? null,
    [effectiveListings, listingId],
  );

  const activateDemoMode = () => {
    setIsDemoMode(true);
    setError(null);
    setListingId(DEMO_LISTINGS[0].id);
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    // Provide realistic demo blocks & reservation to immediately showcase calendar color coding
    setBlocks([
      {
        id: 'demo-block-1',
        propertyId: DEMO_LISTINGS[0].id,
        startDate: `${y}-${m}-04`,
        endDate: `${y}-${m}-07`,
        reason: 'Owner / Personal Stay',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'demo-block-2',
        propertyId: DEMO_LISTINGS[0].id,
        startDate: `${y}-${m}-18`,
        endDate: `${y}-${m}-21`,
        reason: 'Repairs & Renovation',
        createdAt: new Date().toISOString(),
      },
    ]);
    setReservations([
      {
        id: 'demo-res-1',
        propertyId: DEMO_LISTINGS[0].id,
        propertyName: DEMO_LISTINGS[0].title,
        guestId: 'guest-dawit',
        guestName: 'Dawit Bekele',
        guestEmail: 'dawit.b@example.com',
        checkInDate: `${y}-${m}-10`,
        checkOutDate: `${y}-${m}-14`,
        totalPrice: 26000,
        status: 'CONFIRMED',
        createdAt: new Date().toISOString(),
      } as unknown as HostReservationRow,
    ]);
    setSuccess('🇪🇹 Ethiopian Calendar demo preview activated! You can test date clicks, Ge\'ez toggling, and holiday surges.');
  };

  // ─────────────────────────────────────────────────────────────
  // 1. Load Host's Rental Listings
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    const loadListings = async () => {
      setLoadingListings(true);
      setError(null);
      try {
        const firstPage = await apiFetch<HostListingsResponse>(
          '/host/listings?listingType=RENTAL&page=1&limit=100',
        );
        const allListings = [...firstPage.data];
        for (let page = 2; page <= firstPage.totalPages; page += 1) {
          const nextPage = await apiFetch<HostListingsResponse>(
            `/host/listings?listingType=RENTAL&page=${page}&limit=100`,
          );
          allListings.push(...nextPage.data);
        }
        if (active) {
          setListings(allListings);
          setListingId((current) => current || allListings[0]?.id || '');
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load rental listings.',
          );
        }
      } finally {
        if (active) setLoadingListings(false);
      }
    };

    void loadListings();
    return () => {
      active = false;
    };
  }, []);

  // ─────────────────────────────────────────────────────────────
  // 2. Load Availability Blocks and Reservations for Selected Property
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!listingId || isDemoMode) return;
    let active = true;

    const loadCalendarData = async () => {
      try {
        const [blockData, resData] = await Promise.all([
          apiFetch<AvailabilityBlock[]>(`/host/listings/${listingId}/availability`),
          apiFetch<HostReservationsResponse>(
            `/host/reservations?propertyId=${listingId}&limit=100`,
          ).catch(() => ({ data: [], total: 0, page: 1, limit: 100, totalPages: 1 })),
        ]);
        if (!active) return;
        setBlocks(blockData || []);
        setReservations(
          (resData?.data || []).filter(
            (r) => r.status === 'CONFIRMED' || r.status === 'PENDING',
          ),
        );
      } catch (loadError: unknown) {
        if (!active) return;
        setBlocks([]);
        setReservations([]);
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load calendar data.',
        );
      } finally {
        if (active) setLoadingData(false);
      }
    };

    queueMicrotask(() => {
      if (active) {
        setLoadingData(true);
        setError(null);
      }
    });

    void loadCalendarData();

    return () => {
      active = false;
    };
  }, [listingId, reloadVersion]);

  // ─────────────────────────────────────────────────────────────
  // 3. Calendar Math & Grid Calculations
  // ─────────────────────────────────────────────────────────────
  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate();
  }, [viewYear, viewMonth]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
  }, [viewYear, viewMonth]);

  const monthName = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [viewYear, viewMonth]);

  // Ethiopian month span computation (e.g., "ጥቅምት – ኅዳር 2019 ዓ.ም")
  const ethiopianSpan = useMemo(() => {
    return getEthiopianSpanForGregorianMonth(viewYear, viewMonth);
  }, [viewYear, viewMonth]);

  // Ethiopian cultural & national holidays falling within the active month
  const activeMonthHolidays = useMemo(() => {
    const holidays: {
      dateIso: string;
      dayNum: number;
      ethDate: EthiopianDate;
      holiday: EthiopianHoliday;
    }[] = [];

    for (let day = 1; day <= daysInMonth; day += 1) {
      const y = viewYear;
      const m = String(viewMonth + 1).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      const iso = `${y}-${m}-${d}`;
      const eth = gregorianToEthiopian(iso);
      if (eth.holiday) {
        holidays.push({
          dateIso: iso,
          dayNum: day,
          ethDate: eth,
          holiday: eth.holiday,
        });
      }
    }

    return holidays;
  }, [viewYear, viewMonth, daysInMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  // Convert day number to YYYY-MM-DD
  const formatIsoDate = (day: number) => {
    const y = viewYear;
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayIso = useMemo(() => {
    return today.toISOString().slice(0, 10);
  }, [today]);

  // Check if an ISO date string is blocked by host
  const getBlockForDate = (dateStr: string) => {
    return blocks.find(
      (b) => dateStr >= b.startDate && dateStr < b.endDate,
    );
  };

  // Check if an ISO date string is booked by guest
  const getBookingForDate = (dateStr: string) => {
    return reservations.find(
      (r) => dateStr >= r.checkInDate && dateStr < r.checkOutDate,
    );
  };

  // ─────────────────────────────────────────────────────────────
  // 4. Calendar Date Click Interaction
  // ─────────────────────────────────────────────────────────────
  const handleDateClick = (dateStr: string) => {
    // If date is in the past, ignore
    if (dateStr < todayIso) return;

    // Check if clicking an already blocked date -> give user prompt to unblock
    const existingBlock = getBlockForDate(dateStr);
    if (existingBlock) {
      setActiveTab('blocks');
      return;
    }

    // Interactive Range Selection
    if (selectionStep === 'start' || !form.startDate) {
      setForm({ startDate: dateStr, endDate: '', reason: form.reason });
      setSelectionStep('end');
    } else {
      // Step is 'end'
      if (dateStr === form.startDate) {
        // User clicked the same day: block this single night (check-in to next day)
        const nextD = new Date(dateStr);
        nextD.setDate(nextD.getDate() + 1);
        const nextIso = nextD.toISOString().slice(0, 10);
        setForm((prev) => ({ ...prev, endDate: nextIso }));
        setSelectionStep('start');
      } else if (dateStr > form.startDate) {
        setForm((prev) => ({ ...prev, endDate: dateStr }));
        setSelectionStep('start');
      } else {
        // User clicked an earlier date, make it the new start date
        setForm((prev) => ({ ...prev, startDate: dateStr, endDate: '' }));
        setSelectionStep('end');
      }
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 5. Submit Block Form
  // ─────────────────────────────────────────────────────────────
  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!listingId) return;

    if (!form.startDate || !form.endDate) {
      setError('Please select both a start date and an end date on the calendar.');
      return;
    }

    if (form.endDate <= form.startDate) {
      setError('The end date must be after the start date.');
      return;
    }

    if (isDemoMode) {
      const created: AvailabilityBlock = {
        id: `demo-block-${Date.now()}`,
        propertyId: listingId || DEMO_LISTINGS[0].id,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim() || 'Demo Maintenance / Blackout',
        createdAt: new Date().toISOString(),
      };
      setBlocks((current) =>
        [...current, created].sort((a, b) => a.startDate.localeCompare(b.startDate)),
      );
      setForm(EMPTY_FORM);
      setSelectionStep('start');
      setSuccess('The selected date range has been blocked in demo mode.');
      setSaving(false);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await apiFetch<AvailabilityBlock>(
        `/host/listings/${listingId}/availability`,
        {
          method: 'POST',
          body: JSON.stringify({
            startDate: form.startDate,
            endDate: form.endDate,
            reason: form.reason.trim() || undefined,
          }),
        },
      );
      setBlocks((current) =>
        [...current, created].sort((a, b) => a.startDate.localeCompare(b.startDate)),
      );
      setForm(EMPTY_FORM);
      setSelectionStep('start');
      setSuccess('The selected date range has been blocked successfully.');
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Unable to block these dates.',
      );
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 6. Remove Block
  // ─────────────────────────────────────────────────────────────
  const handleRemove = async (blockId: string) => {
    if (!listingId) return;

    if (isDemoMode) {
      setBlocks((current) => current.filter((block) => block.id !== blockId));
      setSuccess('Availability block removed (demo mode).');
      return;
    }

    setRemovingId(blockId);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/host/listings/${listingId}/availability/${blockId}`, {
        method: 'DELETE',
      });
      setBlocks((current) => current.filter((block) => block.id !== blockId));
      setSuccess('Availability block removed. The property is now open for bookings.');
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : 'Unable to remove this availability block.',
      );
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#252923] tracking-tight">
            Property Calendar & Availability
          </h1>
          <p className="text-xs sm:text-sm text-[#73776F] font-medium mt-1">
            Manage blocked maintenance dates, view guest bookings, and optimize for Ethiopian holiday surges.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setLoadingData(true);
            setReloadVersion((v) => v + 1);
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E5E0D5] bg-white hover:bg-[#F8F5ED] text-xs font-bold text-[#252923] transition cursor-pointer self-start sm:self-auto shadow-2xs"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 text-xs sm:text-sm font-medium animate-in fade-in"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isAuthError && (
              <Link
                href="/login?next=/host/availability"
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition"
              >
                Sign In Again
              </Link>
            )}
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 cursor-pointer p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Demo Active Banner */}
      {isDemoMode && (
        <div className="rounded-2xl border border-[#234B36]/20 bg-[#EEF3EF] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🇪🇹</span>
            <div>
              <p className="text-xs sm:text-sm font-black text-[#234B36]">
                Interactive Ethiopian Calendar Demo Mode Active
              </p>
              <p className="text-[11px] text-[#73776F]">
                Exploring dual Ge'ez dates, Amharic weekdays, peak holiday surges, and date range selections on mock property data.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/login?next=/host/availability"
              className="px-3.5 py-1.5 rounded-xl bg-[#234B36] hover:bg-[#2D5E43] text-white text-xs font-bold transition shadow-2xs"
            >
              Sign In to Sync Real Listings
            </Link>
            <button
              type="button"
              onClick={() => {
                setIsDemoMode(false);
                setReloadVersion((v) => v + 1);
              }}
              className="px-3 py-1.5 rounded-xl border border-[#E5E0D5] bg-white text-xs font-bold text-[#73776F] hover:text-[#252923] transition cursor-pointer"
            >
              Exit Demo
            </button>
          </div>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-center gap-3 p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs sm:text-sm font-medium animate-in fade-in"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="flex-1">{success}</span>
          <button
            onClick={() => setSuccess(null)}
            className="text-emerald-500 hover:text-emerald-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loadingListings ? (
        <div className="rounded-2xl border border-[#E5E0D5] bg-white p-12 text-center text-[#73776F] text-sm">
          <RotateCcw className="w-6 h-6 animate-spin mx-auto text-[#234B36] mb-3" />
          Loading your rental properties...
        </div>
      ) : isAuthError && effectiveListings.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-8 sm:p-10 text-center max-w-xl mx-auto shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-200 text-amber-800 mx-auto flex items-center justify-center shadow-xs">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#252923]">Session Expired or Login Required</h2>
            <p className="mt-2 text-xs sm:text-sm text-[#73776F] leading-relaxed max-w-md mx-auto">
              Your host session token has expired. Sign in again to load your published rental properties, or launch the interactive preview demo immediately.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <Link
              href="/login?next=/host/availability"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#234B36] hover:bg-[#2D5E43] active:bg-[#1A3828] text-white text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer"
            >
              <span>Sign In Again</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={activateDemoMode}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-[#E5E0D5] bg-white hover:bg-[#F8F5ED] text-[#252923] text-xs sm:text-sm font-bold transition shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>🇪🇹 Preview Interactive Calendar Demo</span>
            </button>
          </div>
        </div>
      ) : effectiveListings.length === 0 ? (
        <div className="rounded-2xl border border-[#E5E0D5] bg-white p-10 text-center max-w-lg mx-auto shadow-sm space-y-4">
          <Building2 className="w-12 h-12 text-[#73776F]/60 mx-auto" />
          <div>
            <h2 className="text-lg font-black text-[#252923]">No Rental Listings Yet</h2>
            <p className="mt-2 text-xs sm:text-sm text-[#73776F] leading-relaxed">
              Calendar and availability management is available for rental properties. Create your first rental listing to unlock date blockouts.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/host/listings/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#234B36] hover:bg-[#2D5E43] active:bg-[#1A3828] text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              Create a Rental Listing
            </Link>
            <button
              type="button"
              onClick={activateDemoMode}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5E0D5] bg-[#F8F5ED] hover:bg-white text-xs font-bold text-[#234B36] transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>🇪🇹 Preview Calendar Demo</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Selected Property Selector Banner */}
          <div className="rounded-2xl border border-[#E5E0D5] bg-white p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-[#F8F5ED] border border-[#E5E0D5] shrink-0">
                {selectedListing?.coverImage ? (
                  <Image
                    src={selectedListing.coverImage}
                    alt={selectedListing.title}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="56px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#73776F]">
                    <Building2 className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-[#EEF3EF] text-[#234B36] border border-[#E5E0D5] px-2 py-0.5 rounded-full">
                    Rental Property
                  </span>
                  <span className="text-[10px] font-bold text-[#73776F]">
                    ID: {selectedListing?.id.slice(0, 8)}...
                  </span>
                </div>
                <h2 className="text-base font-black text-[#252923] truncate mt-0.5">
                  {selectedListing?.title}
                </h2>
                <p className="text-xs text-[#73776F] font-medium">
                  {selectedListing?.city}
                  {selectedListing?.subCity ? `, ${selectedListing.subCity}` : ''} ·{' '}
                  <span className="font-bold text-[#252923]">
                    ETB {Number(selectedListing?.pricePerNight).toLocaleString()}
                  </span>{' '}
                  / night
                </p>
              </div>
            </div>

            {/* Property Dropdown Switcher */}
            <div className="flex items-center gap-2 shrink-0">
              <label htmlFor="listing-select" className="text-xs font-bold text-[#73776F] whitespace-nowrap">
                Switch Property:
              </label>
              <select
                id="listing-select"
                value={listingId}
                onChange={(e) => {
                  setError(null);
                  setSuccess(null);
                  setForm(EMPTY_FORM);
                  setListingId(e.target.value);
                }}
                className="rounded-xl border border-[#E5E0D5] bg-[#F8F5ED] px-3.5 py-2 text-xs font-bold text-[#252923] focus:border-[#234B36] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 cursor-pointer"
              >
                {effectiveListings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title} ({l.city})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Main Two-Column Layout: Visual Calendar (Left) & Quick Action Manager (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 8 Cols: Visual Month Calendar Grid */}
            <div className="lg:col-span-8 rounded-2xl border border-[#E5E0D5] bg-white p-5 sm:p-6 shadow-xs space-y-5">
              {/* Calendar Month Navigation Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EEF3EF]">
                <div>
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-[#252923] tracking-tight">
                      {monthName}
                    </h2>
                    {showEthiopianDates && (
                      <span className="text-xs font-bold text-[#234B36] bg-[#EEF3EF] px-2.5 py-0.5 rounded-full border border-[#E5E0D5]">
                        🇪🇹 {ethiopianSpan.amharic}
                      </span>
                    )}
                  </div>
                  {showEthiopianDates && (
                    <p className="text-[11px] text-[#73776F] font-semibold mt-0.5">
                      {ethiopianSpan.english}
                    </p>
                  )}
                </div>

                {/* Sleek Toolbar Controls */}
                <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
                  {/* Segmented Dual / Standard Switcher */}
                  <div className="inline-flex rounded-xl bg-[#F8F5ED] p-1 border border-[#E5E0D5]">
                    <button
                      type="button"
                      onClick={() => setShowEthiopianDates(true)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        showEthiopianDates
                          ? 'bg-white text-[#234B36] shadow-2xs'
                          : 'text-[#73776F] hover:text-[#252923]'
                      }`}
                    >
                      🇪🇹 Dual
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEthiopianDates(false)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        !showEthiopianDates
                          ? 'bg-white text-[#234B36] shadow-2xs'
                          : 'text-[#73776F] hover:text-[#252923]'
                      }`}
                    >
                      🌐 Standard
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleJumpToday}
                    className="px-3 py-1.5 rounded-xl border border-[#E5E0D5] bg-white hover:bg-[#F8F5ED] text-xs font-bold text-[#252923] transition cursor-pointer shadow-2xs"
                  >
                    Today
                  </button>

                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      aria-label="Previous Month"
                      className="p-1.5 rounded-xl border border-[#E5E0D5] hover:border-[#234B36] hover:bg-[#F8F5ED] text-[#252923] transition cursor-pointer shadow-2xs"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      aria-label="Next Month"
                      className="p-1.5 rounded-xl border border-[#E5E0D5] hover:border-[#234B36] hover:bg-[#F8F5ED] text-[#252923] transition cursor-pointer shadow-2xs"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="space-y-1.5">
                {/* Weekday Names with Ethiopian Days */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center pb-1">
                  {WEEKDAYS.map((wd, idx) => (
                    <div
                      key={wd}
                      className="py-1.5 flex flex-col items-center justify-center rounded-xl bg-[#F8F5ED]/70 border border-[#E5E0D5]/50"
                    >
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#252923]">
                        {wd}
                      </span>
                      {showEthiopianDates && (
                        <span className="text-[10px] font-bold text-[#9E472A] tracking-normal -mt-0.5">
                          {ETHIOPIAN_WEEKDAYS[idx]?.shortAmharic}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Day Cells */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {/* Empty Cells for preceding padding */}
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="min-h-[72px] sm:min-h-[88px] rounded-xl bg-[#F8F5ED]/30 border border-transparent"
                    />
                  ))}

                  {/* Month Days */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const dateIso = formatIsoDate(dayNum);
                    const isPast = dateIso < todayIso;
                    const isToday = dateIso === todayIso;

                    const block = getBlockForDate(dateIso);
                    const booking = getBookingForDate(dateIso);

                    // Check if part of in-progress selection
                    const isStartSelected = form.startDate === dateIso;
                    const isEndSelected = form.endDate === dateIso;
                    const isInSelectedRange =
                      form.startDate &&
                      form.endDate &&
                      dateIso >= form.startDate &&
                      dateIso <= form.endDate;

                    const ethDate = gregorianToEthiopian(dateIso);

                    return (
                      <button
                        key={dateIso}
                        type="button"
                        disabled={isPast}
                        onClick={() => handleDateClick(dateIso)}
                        className={`group relative min-h-[72px] sm:min-h-[88px] p-2 rounded-xl text-left border transition-all flex flex-col justify-between ${
                          isPast
                            ? 'bg-[#F8F5ED]/50 border-[#EEF3EF] text-[#73776F]/40 cursor-not-allowed opacity-50'
                            : block
                            ? 'bg-rose-50/90 border-rose-200 text-rose-950 hover:bg-rose-100 cursor-pointer shadow-2xs'
                            : booking
                            ? 'bg-[#EEF3EF]/90 border-[#C8DACF] text-[#252923] hover:bg-[#EEF3EF] cursor-pointer shadow-2xs'
                            : isInSelectedRange
                            ? 'bg-[#EEF3EF] border-[#234B36] text-[#252923] ring-2 ring-[#234B36]/30'
                            : isStartSelected
                            ? 'bg-[#234B36] border-[#234B36] text-white shadow-xs'
                            : 'bg-white border-[#E5E0D5] text-[#252923] hover:border-[#234B36] hover:shadow-xs cursor-pointer'
                        }`}
                      >
                        {/* Top Bar: Gregorian Day (left) + Holiday/Status micro-badge (right) */}
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={`text-sm font-black rounded-lg w-6 h-6 flex items-center justify-center shrink-0 ${
                              isToday
                                ? 'bg-[#234B36] text-white ring-2 ring-[#234B36]/30'
                                : isStartSelected
                                ? 'bg-white text-[#234B36] font-black'
                                : 'text-[#252923]'
                            }`}
                          >
                            {dayNum}
                          </span>

                          <div className="flex items-center gap-1 shrink-0">
                            {ethDate.holiday && (
                              <span
                                className="w-4 h-4 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black flex items-center justify-center shrink-0 shadow-2xs cursor-help border border-amber-300"
                                title={`🇪🇹 ${ethDate.holiday.nameAmharic} (${ethDate.holiday.nameEnglish}) · +${ethDate.holiday.recommendedPriceSurgePercent}% peak surge`}
                              >
                                ✨
                              </span>
                            )}
                            {block && <Ban className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                            {booking && <Luggage className="w-3.5 h-3.5 text-[#234B36] shrink-0" />}
                          </div>
                        </div>

                        {/* Middle status tag */}
                        <div className="my-auto w-full">
                          {block ? (
                            <div className="bg-rose-100/90 text-rose-800 border border-rose-200/80 px-1.5 py-0.5 rounded text-[10px] font-black truncate text-center">
                              Blocked
                            </div>
                          ) : booking ? (
                            <div className="bg-[#EEF3EF] text-[#234B36] border border-[#C8DACF] px-1.5 py-0.5 rounded text-[10px] font-bold truncate text-center">
                              {booking.guest?.name ? booking.guest.name.split(' ')[0] : 'Guest'}
                            </div>
                          ) : isStartSelected ? (
                            <div className="bg-white/20 text-white px-1.5 py-0.5 rounded text-[10px] font-black text-center">
                              Start
                            </div>
                          ) : isEndSelected ? (
                            <div className="bg-[#234B36] text-white px-1.5 py-0.5 rounded text-[10px] font-black text-center">
                              End
                            </div>
                          ) : null}
                        </div>

                        {/* Bottom Bar: Ethiopian Ge'ez Date Pill with Month Name (Bottom-Right corner) */}
                        {showEthiopianDates && (
                          <div className="flex items-center justify-end w-full mt-auto pt-0.5">
                            <span
                              className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md border tracking-tight transition-colors whitespace-nowrap truncate max-w-full ${
                                isStartSelected
                                  ? 'bg-white/20 text-white border-white/30'
                                  : ethDate.day === 1
                                  ? 'bg-[#B85C38] text-white border-[#B85C38] font-black shadow-2xs'
                                  : 'bg-[#FAF3F0] text-[#9E472A] border-[#F3DFD8]'
                              }`}
                              title={`${ethDate.formattedAmharic} (${ethDate.formattedEnglish})`}
                            >
                              {ethDate.monthNameAmharic} {ethDate.day}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Legend Bar (Below Grid) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#EEF3EF] text-xs text-[#73776F] font-semibold">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-white border border-[#E5E0D5]" />
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="text-rose-700 font-bold">Blocked by Host</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#234B36]" />
                    <span className="text-[#234B36] font-bold">Guest Stay</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-[9px] font-black flex items-center justify-center">✨</span>
                    <span className="text-amber-800 font-bold">Ethiopian Holiday Surge</span>
                  </div>
                </div>

                <div className="text-[11px] text-[#73776F] flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-[#234B36]" />
                  <span>Click start & end date on calendar to block</span>
                </div>
              </div>
            </div>

            {/* Right 4 Cols: Quick Actions & Block List */}
            <div className="lg:col-span-4 space-y-6">
              {/* Form Card: Block Selected Range */}
              <form
                onSubmit={handleCreate}
                className="rounded-2xl border border-[#E5E0D5] bg-white p-5 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#EEF3EF]">
                  <h3 className="text-sm font-black text-[#252923] flex items-center gap-2">
                    <Ban className="w-4 h-4 text-[#234B36]" />
                    <span>Block Dates</span>
                  </h3>
                  {(form.startDate || form.endDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm(EMPTY_FORM);
                        setSelectionStep('start');
                      }}
                      className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                {/* Selected Range Display with Dual Ethiopian / Gregorian Dates */}
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-[#73776F]">
                        Start Date
                      </label>
                      <input
                        type="date"
                        required
                        min={todayIso}
                        value={form.startDate}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, startDate: e.target.value }))
                        }
                        className="w-full mt-1 bg-[#F8F5ED] border border-[#E5E0D5] rounded-xl px-2.5 py-2 text-xs font-bold text-[#252923] focus:outline-none focus:border-[#234B36] focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-[#73776F]">
                        End Date
                      </label>
                      <input
                        type="date"
                        required
                        min={form.startDate || todayIso}
                        value={form.endDate}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, endDate: e.target.value }))
                        }
                        className="w-full mt-1 bg-[#F8F5ED] border border-[#E5E0D5] rounded-xl px-2.5 py-2 text-xs font-bold text-[#252923] focus:outline-none focus:border-[#234B36] focus:bg-white"
                      />
                    </div>
                  </div>

                  {form.startDate && (
                    <div className="bg-[#EEF3EF] p-3 rounded-xl border border-[#C8DACF] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#234B36]">
                          Selected Range
                        </span>
                        {form.startDate && form.endDate && form.endDate > form.startDate && (
                          <span className="text-[10px] font-bold text-[#234B36] bg-white px-2 py-0.5 rounded-full border border-[#C8DACF]">
                            {Math.round(
                              (new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) /
                                (1000 * 60 * 60 * 24),
                            )}{' '}
                            nights
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-black text-[#252923] leading-snug">
                        {formatDualDate(form.startDate)}
                        {form.endDate ? ` → ${formatDualDate(form.endDate)}` : ' (Pick end date)'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Reason Selector Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-[#252923] mb-1.5">
                    Reason for Blackout
                  </label>
                  <select
                    value={form.reason}
                    onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                    className="w-full rounded-xl border border-[#E5E0D5] bg-[#F8F5ED] px-3.5 py-2.5 text-xs font-bold text-[#252923] focus:border-[#234B36] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 cursor-pointer"
                  >
                    <option value="">Select a reason...</option>
                    {PRESET_REASONS.map((preset) => (
                      <option key={preset} value={preset}>
                        {preset}
                      </option>
                    ))}
                    <option value="Custom">Other (Custom reason)...</option>
                  </select>

                  {/* Optional Custom Reason Input */}
                  {(form.reason === 'Custom' || (!PRESET_REASONS.includes(form.reason) && form.reason)) && (
                    <input
                      type="text"
                      maxLength={255}
                      value={form.reason === 'Custom' ? '' : form.reason}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, reason: e.target.value }))
                      }
                      placeholder="Type custom blackout reason..."
                      className="w-full mt-2 rounded-xl border border-[#E5E0D5] bg-white px-3 py-2 text-xs text-[#252923] focus:border-[#234B36] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20"
                    />
                  )}
                </div>

                {/* Submit Block Button in Brand Signature Forest Green */}
                <button
                  type="submit"
                  disabled={saving || !listingId || !form.startDate || !form.endDate}
                  className="w-full py-3 rounded-xl bg-[#234B36] hover:bg-[#2D5E43] active:bg-[#1A3828] text-white text-xs font-black tracking-wide transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Blackout...</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-3.5 h-3.5" />
                      <span>Block Selected Dates</span>
                    </>
                  )}
                </button>
              </form>

              {/* Card: Ethiopian High-Demand & Tourism Holidays */}
              {activeMonthHolidays.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-2.5 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🇪🇹</span>
                    <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                      Ethiopian Peak Holidays ({activeMonthHolidays.length})
                    </h3>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                    High guest demand expected. Recommended for premium rates or early blackout:
                  </p>
                  <div className="space-y-2 pt-1">
                    {activeMonthHolidays.map(({ dateIso, ethDate, holiday }) => (
                      <div
                        key={holiday.id}
                        className="p-2.5 rounded-xl bg-white border border-amber-200/80 flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-black text-[#252923] truncate">
                            {holiday.nameAmharic}
                          </p>
                          <p className="text-[10px] text-[#73776F] font-bold truncate">
                            {ethDate.formattedAmharic} · {dateIso}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            +{holiday.recommendedPriceSurgePercent}% Surge
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const nextD = new Date(dateIso);
                              nextD.setDate(nextD.getDate() + 1);
                              const nextIso = nextD.toISOString().slice(0, 10);
                              setForm({
                                startDate: dateIso,
                                endDate: nextIso,
                                reason: `${holiday.nameAmharic} - High Season Reserve`,
                              });
                              setSelectionStep('start');
                            }}
                            className="block text-[10px] font-bold text-[#234B36] hover:underline mt-1 cursor-pointer"
                          >
                            Set Dates →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Drawer: Active Blocks vs Guest Reservations */}
              <div className="rounded-2xl border border-[#E5E0D5] bg-white overflow-hidden shadow-xs">
                {/* Tabs */}
                <div className="flex border-b border-[#EEF3EF] bg-[#F8F5ED]">
                  <button
                    type="button"
                    onClick={() => setActiveTab('blocks')}
                    className={`flex-1 py-3 text-xs font-black text-center border-b-2 transition cursor-pointer ${
                      activeTab === 'blocks'
                        ? 'border-[#234B36] text-[#234B36] bg-white'
                        : 'border-transparent text-[#73776F] hover:text-[#252923]'
                    }`}
                  >
                    Blocked Ranges ({blocks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('bookings')}
                    className={`flex-1 py-3 text-xs font-black text-center border-b-2 transition cursor-pointer ${
                      activeTab === 'bookings'
                        ? 'border-[#234B36] text-[#234B36] bg-white'
                        : 'border-transparent text-[#73776F] hover:text-[#252923]'
                    }`}
                  >
                    Guest Stays ({reservations.length})
                  </button>
                </div>

                {/* Tab Content */}
                <div className="p-4 max-h-[380px] overflow-y-auto space-y-3">
                  {activeTab === 'blocks' ? (
                    blocks.length === 0 ? (
                      <p className="text-xs text-[#73776F] text-center py-6">
                        No dates are currently blocked for this property.
                      </p>
                    ) : (
                      blocks.map((b) => (
                        <div
                          key={b.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-[#F8F5ED] border border-[#E5E0D5] gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-black text-[#252923] truncate">
                              {b.startDate} → {b.endDate}
                            </p>
                            <p className="text-[11px] text-[#73776F] truncate mt-0.5">
                              {b.reason || 'Manual Blackout'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemove(b.id)}
                            disabled={removingId === b.id}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition shrink-0 cursor-pointer"
                            title="Unblock these dates"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )
                  ) : reservations.length === 0 ? (
                    <p className="text-xs text-[#73776F] text-center py-6">
                      No active guest reservations on this property.
                    </p>
                  ) : (
                    reservations.map((r) => (
                      <div
                        key={r.id}
                        className="p-3 rounded-xl bg-[#EEF3EF]/50 border border-[#E5E0D5] space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-[#252923]">
                            {r.guest?.name || 'Guest'}
                          </p>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#EEF3EF] text-[#234B36] border border-[#E5E0D5]">
                            {r.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#73776F] font-medium">
                          {r.checkInDate} → {r.checkOutDate} · {r.guestCount} guests
                        </p>
                        <p className="text-[11px] font-black text-[#234B36]">
                          ETB {Number(r.totalPrice).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
