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
} from 'lucide-react';

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

  // Calendar View State: Year and Month (0-indexed: 0 = January, 11 = December)
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth());

  // Date selection helper state
  const [selectionStep, setSelectionStep] = useState<'start' | 'end'>('start');

  const selectedListing = useMemo(
    () => listings.find((listing) => listing.id === listingId) ?? null,
    [listings, listingId],
  );

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
    if (!listingId) return;
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
      if (dateStr > form.startDate) {
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
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF3EF] text-[#234B36] border border-[#E5E0D5] text-xs font-black uppercase tracking-wider mb-2">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Interactive Availability Manager</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#252923] tracking-tight">
            Property Calendar & Blockouts
          </h1>
          <p className="text-xs sm:text-sm text-[#73776F] font-medium mt-1">
            Visually manage unavailable dates, view upcoming guest stays, and block maintenance windows.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setLoadingData(true);
            setReloadVersion((v) => v + 1);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E5E0D5] bg-white hover:bg-[#F8F5ED] text-xs font-bold text-[#252923] transition cursor-pointer self-start sm:self-auto shadow-2xs"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 text-xs sm:text-sm font-medium animate-in fade-in"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
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
      ) : listings.length === 0 ? (
        <div className="rounded-2xl border border-[#E5E0D5] bg-white p-10 text-center max-w-lg mx-auto shadow-sm">
          <Building2 className="w-12 h-12 text-[#73776F]/60 mx-auto mb-4" />
          <h2 className="text-lg font-black text-[#252923]">No Rental Listings Yet</h2>
          <p className="mt-2 text-xs sm:text-sm text-[#73776F] leading-relaxed">
            Calendar and availability management is available for rental properties. Create your first rental listing to unlock date blockouts.
          </p>
          <Link
            href="/host/listings/new"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#234B36] hover:bg-[#2D5E43] active:bg-[#1A3828] text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            Create a Rental Listing
          </Link>
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
                {listings.map((l) => (
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
            <div className="lg:col-span-8 rounded-2xl border border-[#E5E0D5] bg-white p-5 sm:p-7 shadow-xs space-y-6">
              {/* Calendar Month Navigation Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EEF3EF]">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-[#252923] tracking-tight">
                    {monthName}
                  </h2>
                  <button
                    type="button"
                    onClick={handleJumpToday}
                    className="ml-2 text-[11px] font-bold text-[#234B36] hover:text-[#2D5E43] bg-[#EEF3EF] hover:bg-[#234B36]/15 px-2.5 py-1 rounded-full transition cursor-pointer"
                  >
                    Today
                  </button>
                </div>

                {/* Prev / Next Month Controls */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    aria-label="Previous Month"
                    className="p-2 rounded-xl border border-[#E5E0D5] hover:border-[#234B36] hover:bg-[#F8F5ED] text-[#252923] transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    aria-label="Next Month"
                    className="p-2 rounded-xl border border-[#E5E0D5] hover:border-[#234B36] hover:bg-[#F8F5ED] text-[#252923] transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Color Legend Bar */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-bold text-[#73776F] bg-[#F8F5ED] p-3 rounded-xl border border-[#E5E0D5]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-white border border-[#E5E0D5] shadow-2xs" />
                  <span>Available for Guests</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-rose-100 border border-rose-300" />
                  <span className="text-rose-700">Blocked by Host</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-[#EEF3EF] border border-[#E5E0D5]" />
                  <span className="text-[#234B36]">Guest Reservation</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md ring-2 ring-[#234B36] bg-[#EEF3EF]" />
                  <span className="text-[#252923]">Selecting Range</span>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="space-y-2">
                {/* Weekday Names */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
                  {WEEKDAYS.map((wd) => (
                    <div
                      key={wd}
                      className="text-[11px] font-black uppercase tracking-wider text-[#73776F] py-1"
                    >
                      {wd}
                    </div>
                  ))}
                </div>

                {/* Day Cells */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {/* Empty Cells for preceding padding */}
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="min-h-[70px] sm:min-h-[85px] rounded-xl bg-[#F8F5ED]/40 border border-transparent"
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

                    return (
                      <button
                        key={dateIso}
                        type="button"
                        disabled={isPast}
                        onClick={() => handleDateClick(dateIso)}
                        className={`group relative min-h-[70px] sm:min-h-[85px] p-1.5 sm:p-2 rounded-xl text-left border transition-all flex flex-col justify-between ${
                          isPast
                            ? 'bg-[#F8F5ED]/60 border-[#EEF3EF] text-[#73776F]/40 cursor-not-allowed opacity-60'
                            : block
                            ? 'bg-rose-50/80 border-rose-200 text-rose-950 hover:bg-rose-100/80 cursor-pointer shadow-2xs'
                            : booking
                            ? 'bg-[#EEF3EF]/70 border-[#E5E0D5] text-[#252923] hover:bg-[#EEF3EF] cursor-pointer shadow-2xs'
                            : isInSelectedRange
                            ? 'bg-[#EEF3EF] border-[#234B36] text-[#252923] ring-2 ring-[#234B36]/30'
                            : isStartSelected
                            ? 'bg-[#234B36] border-[#234B36] text-white shadow-xs'
                            : 'bg-white border-[#E5E0D5] text-[#252923] hover:border-[#234B36] hover:shadow-xs cursor-pointer'
                        }`}
                      >
                        {/* Day Header (Number + Badges) */}
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={`text-xs font-black rounded-full w-5 h-5 flex items-center justify-center ${
                              isToday
                                ? 'bg-[#234B36] text-white'
                                : isStartSelected
                                ? 'bg-white text-[#234B36]'
                                : 'text-[#252923]'
                            }`}
                          >
                            {dayNum}
                          </span>

                          {/* Quick Micro Icons */}
                          {block && (
                            <Ban className="w-3 h-3 text-rose-500 shrink-0" />
                          )}
                          {booking && (
                            <Luggage className="w-3 h-3 text-[#234B36] shrink-0" />
                          )}
                        </div>

                        {/* Status Label on Cell */}
                        <div className="mt-1 w-full overflow-hidden">
                          {block ? (
                            <div className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded text-[10px] font-black truncate leading-tight">
                              Blocked
                            </div>
                          ) : booking ? (
                            <div className="bg-[#EEF3EF] text-[#234B36] px-1.5 py-0.5 rounded text-[10px] font-black truncate leading-tight border border-[#E5E0D5]">
                              {booking.guest?.name ? booking.guest.name.split(' ')[0] : 'Guest'}
                            </div>
                          ) : isStartSelected ? (
                            <div className="bg-white/20 text-white px-1 py-0.5 rounded text-[10px] font-bold text-center leading-none">
                              Start
                            </div>
                          ) : isEndSelected ? (
                            <div className="bg-[#234B36] text-white px-1 py-0.5 rounded text-[10px] font-bold text-center leading-none">
                              End
                            </div>
                          ) : !isPast ? (
                            <div className="text-[10px] font-medium text-[#73776F] opacity-0 group-hover:opacity-100 transition-opacity">
                              Open
                            </div>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Instructions banner */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#EEF3EF]/70 border border-[#E5E0D5] text-xs text-[#252923]">
                <Info className="w-4 h-4 text-[#234B36] shrink-0 mt-0.5" />
                <p>
                  <strong className="font-bold text-[#252923]">How to block dates:</strong> Click any open date to set your{' '}
                  <span className="font-extrabold underline text-[#234B36]">Start Date</span>, then click a later date to set your{' '}
                  <span className="font-extrabold underline text-[#234B36]">End Date</span>. Confirm with the block button in the side panel.
                </p>
              </div>
            </div>

            {/* Right 4 Cols: Quick Actions & Block List */}
            <div className="lg:col-span-4 space-y-6">
              {/* Form Card: Block Selected Range */}
              <form
                onSubmit={handleCreate}
                className="rounded-2xl border border-[#E5E0D5] bg-white p-5 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-[#252923] flex items-center gap-2">
                    <Ban className="w-4 h-4 text-rose-600" />
                    <span>Block Dates</span>
                  </h3>
                  {(form.startDate || form.endDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm(EMPTY_FORM);
                        setSelectionStep('start');
                      }}
                      className="text-[11px] font-bold text-[#73776F] hover:text-[#252923] cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Selected Range Display */}
                <div className="grid grid-cols-2 gap-2 bg-[#F8F5ED] p-2.5 rounded-xl border border-[#E5E0D5]">
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
                      className="w-full mt-1 bg-white border border-[#E5E0D5] rounded-lg px-2 py-1.5 text-xs font-bold text-[#252923] focus:outline-none focus:border-[#234B36]"
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
                      className="w-full mt-1 bg-white border border-[#E5E0D5] rounded-lg px-2 py-1.5 text-xs font-bold text-[#252923] focus:outline-none focus:border-[#234B36]"
                    />
                  </div>
                </div>

                {/* Quick Preset Reasons */}
                <div>
                  <label className="block text-xs font-bold text-[#252923] mb-1.5">
                    Reason for Blackout
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {PRESET_REASONS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({ ...prev, reason: preset }))
                        }
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition cursor-pointer ${
                          form.reason === preset
                            ? 'bg-[#234B36] text-white border-[#234B36]'
                            : 'bg-white border-[#E5E0D5] text-[#73776F] hover:bg-[#F8F5ED]'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    maxLength={255}
                    value={form.reason}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, reason: e.target.value }))
                    }
                    placeholder="Or type a custom reason..."
                    className="w-full rounded-xl border border-[#E5E0D5] px-3 py-2 text-xs text-[#252923] focus:border-[#234B36] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20"
                  />
                </div>

                {/* Submit Block Button */}
                <button
                  type="submit"
                  disabled={saving || !listingId || !form.startDate || !form.endDate}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white text-xs font-bold tracking-wide transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Block...</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-3.5 h-3.5" />
                      <span>Block Selected Dates</span>
                    </>
                  )}
                </button>
              </form>

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
