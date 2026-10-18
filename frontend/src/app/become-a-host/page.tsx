'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import type { HostProfile } from '@/types/host';
import {
  Building2,
  Sparkles,
  ShieldCheck,
  CalendarDays,
  Coins,
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  User,
  Phone,
  FileText,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  Info,
  Compass,
} from 'lucide-react';

type TabMode = 'register' | 'login';

interface CityOption {
  name: string;
  basePrice: number;
  popularType: string;
}

const ETHIOPIAN_CITIES: CityOption[] = [
  { name: 'Addis Ababa (Bole)', basePrice: 3500, popularType: 'Modern Apartment' },
  { name: 'Addis Ababa (Kazanchis)', basePrice: 3200, popularType: 'City Center Condo' },
  { name: 'Bishoftu (Lakeside)', basePrice: 4200, popularType: 'Lakeview Villa' },
  { name: 'Hawassa (Waterfront)', basePrice: 3800, popularType: 'Resort Stay' },
  { name: 'Bahir Dar (Lake Tana)', basePrice: 3000, popularType: 'Guesthouse' },
  { name: 'Arba Minch', basePrice: 2800, popularType: 'Eco Lodge' },
];

export default function BecomeAHostGatewayPage() {
  const { user, login, register, refreshUser, setHostProfile } = useAuth();
  const router = useRouter();

  // Tab mode for unauthenticated users
  const [tab, setTab] = useState<TabMode>('register');

  // Interactive Earnings Estimator State
  const [selectedCityIndex, setSelectedCityIndex] = useState(0);
  const [bookedNights, setBookedNights] = useState(15);
  const [customPricePerNight, setCustomPricePerNight] = useState(ETHIOPIAN_CITIES[0].basePrice);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('+251 91 123 4567');
  const [bio, setBio] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Form States
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submittingStep, setSubmittingStep] = useState<string | null>(null);

  // When city changes, update suggested base price
  const handleCityChange = (idx: number) => {
    setSelectedCityIndex(idx);
    setCustomPricePerNight(ETHIOPIAN_CITIES[idx].basePrice);
  };

  // Calculated estimated monthly & annual earnings
  const monthlyEarnings = useMemo(() => {
    return bookedNights * customPricePerNight;
  }, [bookedNights, customPricePerNight]);

  const annualEarnings = useMemo(() => {
    return monthlyEarnings * 12;
  }, [monthlyEarnings]);

  // If user is already logged in as a host, redirect or provide quick link
  useEffect(() => {
    if (user?.hostProfile) {
      router.replace('/host/dashboard');
    }
  }, [user, router]);

  // Prefill display name from full name or user name
  useEffect(() => {
    if (user && !displayName) {
      setDisplayName(user.name);
    }
  }, [user, displayName]);

  // Handler for already-logged-in user becoming a host
  const handleActivateHostOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nameToUse = (displayName || user?.name || '').trim();
    if (!nameToUse || nameToUse.length < 2) {
      setError('Please provide a host display name with at least 2 characters.');
      return;
    }

    if (!agreed) {
      setError('Please agree to the Host Community Guidelines to continue.');
      return;
    }

    setLoading(true);
    setSubmittingStep('Creating your host profile…');

    try {
      const payload: { displayName: string; phone?: string; bio?: string } = {
        displayName: nameToUse,
      };
      if (phone.trim()) payload.phone = phone.trim();
      if (bio.trim()) payload.bio = bio.trim();

      const newProfile = await apiFetch<HostProfile>('/host/profile', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setHostProfile(newProfile);
      void refreshUser();
      router.replace('/host/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create host profile.');
      setLoading(false);
      setSubmittingStep(null);
    }
  };

  // Handler for unauthenticated user: Register -> Login -> Create HostProfile in one shot
  const handleRegisterAndBecomeHost = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Please enter your full legal name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!agreed) {
      setError('Please agree to Engida\'s Host Community Guidelines and Terms of Service.');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Register User
      setSubmittingStep('Creating your account…');
      await register(fullName.trim(), email.trim(), password);

      // Step 2: Create Host Profile
      setSubmittingStep('Setting up your host profile…');
      const hostPayload: { displayName: string; phone?: string; bio?: string } = {
        displayName: displayName.trim() || fullName.trim(),
      };
      if (phone.trim()) hostPayload.phone = phone.trim();
      if (bio.trim()) hostPayload.bio = bio.trim();

      const newProfile = await apiFetch<HostProfile>('/host/profile', {
        method: 'POST',
        body: JSON.stringify(hostPayload),
      });

      // Step 3: Update AuthContext and navigate
      setHostProfile(newProfile);
      void refreshUser();

      setSubmittingStep('Ready! Entering Host Portal…');
      router.replace('/host/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please check your info.');
      setLoading(false);
      setSubmittingStep(null);
    }
  };

  // Handler for existing user logging in through the gateway
  const handleLoginThroughGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setSubmittingStep('Signing in to your account…');

    try {
      const loggedUser = await login(email.trim(), password);

      if (loggedUser.hostProfile) {
        setSubmittingStep('Welcome back! Loading dashboard…');
        router.replace('/host/dashboard');
      } else {
        // Logged in user doesn't have a host profile yet
        setSubmittingStep(null);
        setLoading(false);
        setDisplayName(loggedUser.name);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please verify your email and password.');
      setLoading(false);
      setSubmittingStep(null);
    }
  };

  // Range slider track percentage for dynamic filled bar
  const sliderPercentage = ((bookedNights - 5) / (30 - 5)) * 100;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-between">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 py-3 px-6 lg:px-12 transition">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e40af] to-[#1e3a8a] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-black text-xl tracking-tight text-slate-900 leading-none block">
                Engida
              </span>
              <span className="text-[10px] font-extrabold text-[#1e40af] uppercase tracking-widest leading-none">
                HOST GATEWAY
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-[#1e40af] transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Explore</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Split-Screen Gateway Container ── */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* ═══════════════════════════════════════════════════════════ */}
          {/* LEFT COLUMN: Hero, Value Proposition, Earnings Simulator */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Header Badge & Title */}
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-[#1e40af] text-xs font-black tracking-wide mb-3">
                <Sparkles className="w-3.5 h-3.5 text-[#1e40af]" />
                <span>START HOSTING ON ENGIDA</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 tracking-tight leading-[1.15]">
                Turn your space into reliable monthly income.
              </h1>
              <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                List entire homes, guest rooms, or vacation retreats across Ethiopia. Set your own prices, choose your availability, and welcome verified guests on your terms.
              </p>
            </div>

            {/* Interactive Earnings Simulator Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100/80 text-amber-800 flex items-center justify-center font-bold">
                    <Coins className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">Earnings Calculator</h2>
                    <p className="text-xs text-slate-500">Estimate your potential hosting revenue in Ethiopia</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold bg-blue-50 text-[#1e40af] border border-blue-100/80 px-3 py-1 rounded-full">
                  Live ETB Estimates
                </span>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                {/* City Selection */}
                <div>
                  <label htmlFor="calculator-location" className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Location
                  </label>
                  <div className="relative">
                    <select
                      id="calculator-location"
                      value={selectedCityIndex}
                      onChange={(e) => handleCityChange(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] focus:outline-none transition appearance-none cursor-pointer pr-9"
                    >
                      {ETHIOPIAN_CITIES.map((c, i) => (
                        <option key={c.name} value={i}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Nightly Rate Input */}
                <div>
                  <label htmlFor="calculator-price" className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Price per Night (ETB)
                  </label>
                  <div className="relative">
                    <input
                      id="calculator-price"
                      type="number"
                      min={500}
                      max={50000}
                      step={100}
                      value={customPricePerNight}
                      onChange={(e) => setCustomPricePerNight(Math.max(500, Number(e.target.value)))}
                      className="w-full pl-3.5 pr-12 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] focus:outline-none transition"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-500 pointer-events-none">
                      ETB
                    </span>
                  </div>
                </div>
              </div>

              {/* Occupancy Slider */}
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                  <span>Estimated Booked Nights per Month</span>
                  <span className="text-sm font-black text-[#1e40af]">{bookedNights} Nights</span>
                </div>
                <input
                  id="calculator-nights-slider"
                  aria-label="Estimated Booked Nights per Month"
                  type="range"
                  min={5}
                  max={30}
                  step={1}
                  value={bookedNights}
                  onChange={(e) => setBookedNights(Number(e.target.value))}
                  style={{
                    background: `linear-gradient(to right, #1e40af 0%, #1e40af ${sliderPercentage}%, #E2E8F0 ${sliderPercentage}%, #E2E8F0 100%)`,
                  }}
                  className="w-full h-2.5 rounded-lg appearance-none cursor-pointer accent-[#1e40af] transition-all"
                />
                <div className="flex justify-between text-[11px] text-slate-500 mt-2 font-medium select-none">
                  <span>Part-time (5 nights)</span>
                  <span>Average (15 nights)</span>
                  <span>Full-time (30 nights)</span>
                </div>
              </div>

              {/* Dynamic Summary Box */}
              <div className="mt-5 p-5 rounded-xl bg-gradient-to-r from-[#1e3a8a] via-[#1e40af] to-[#2563eb] text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm relative overflow-hidden">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-blue-200 block mb-0.5">
                    ESTIMATED MONTHLY INCOME
                  </span>
                  <div className="text-3xl sm:text-4xl font-black tracking-tight tabular-nums">
                    ETB {monthlyEarnings.toLocaleString()}
                  </div>
                  <span className="text-xs text-blue-200 font-medium block mt-1">
                    Approx. ETB {annualEarnings.toLocaleString()} per year
                  </span>
                </div>
                <div className="sm:text-right flex flex-col sm:items-end justify-between">
                  <p className="text-xs text-blue-100 max-w-[220px] leading-relaxed">
                    Based on {bookedNights} nights in {ETHIOPIAN_CITIES[selectedCityIndex].name} with zero listing fees.
                  </p>
                  <div className="mt-2 text-blue-200 flex items-center gap-1 text-[11px] font-semibold cursor-help" title="Listing on Engda is completely free. We charge zero upfront fees.">
                    <Info className="w-3.5 h-3.5" />
                    <span>0% host listing fee</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3 Pillars of Host Confidence (Bottom Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow flex flex-col gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1e40af] flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h2 className="text-sm font-extrabold text-slate-900">Verified Guests</h2>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Every guest account is phone and ID authenticated for maximum peace of mind.
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow flex flex-col gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1e40af] flex items-center justify-center font-bold">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <h2 className="text-sm font-extrabold text-slate-900">Full Flexibility</h2>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Block private dates, define house rules, and set seasonal pricing anytime.
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow flex flex-col gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1e40af] flex items-center justify-center font-bold">
                  <Compass className="w-5 h-5" />
                </div>
                <h2 className="text-sm font-extrabold text-slate-900">Dual Privilege</h2>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  Stay as a guest anytime using the exact same account when you travel.
                </p>
              </div>
            </div>

          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* RIGHT COLUMN: Elevated Host Registration / Sign-In Form Card */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xl shadow-slate-200/50">
              
              {/* Error Alert */}
              {error && (
                <div role="alert" className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm font-semibold flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-snug">{error}</div>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────── */}
              {/* CASE 1: User is already logged in, needs to complete Host profile */}
              {/* ────────────────────────────────────────────────────────── */}
              {user && !user.hostProfile ? (
                <div>
                  <div className="border-b border-slate-100 pb-3 mb-4">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#1e40af]">
                      Step 2 of 2
                    </span>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                      Activate Your Host Profile
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                      Logged in as <strong className="text-slate-900">{user.name}</strong> ({user.email}). Complete your public host details to start publishing properties.
                    </p>
                  </div>

                  <form onSubmit={handleActivateHostOnly} className="space-y-3.5">
                    <div>
                      <label htmlFor="host-display-name-act" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500" /> Host Display Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="host-display-name-act"
                        type="text"
                        required
                        minLength={2}
                        maxLength={100}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g., Aster Aweke or Addis Stays"
                        className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] focus:outline-none transition"
                      />
                    </div>

                    <div>
                      <label htmlFor="host-contact-phone-act" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" /> Contact Phone
                      </label>
                      <div className="relative">
                        <input
                          id="host-contact-phone-act"
                          type="tel"
                          maxLength={30}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+251 91 123 4567"
                          className="w-full pl-3.5 pr-14 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] focus:outline-none transition"
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 pointer-events-none select-none">
                          <span className="text-sm">🇪🇹</span>
                          <ChevronDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="host-bio-act" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-500" /> Short Bio & Style
                      </label>
                      <textarea
                        id="host-bio-act"
                        rows={2}
                        maxLength={500}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell future guests about yourself or your hospitality style."
                        className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] focus:outline-none transition resize-none"
                      />
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                      <input
                        id="host-agree"
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="w-4 h-4 mt-0.5 text-[#1e40af] rounded border-slate-300 focus:ring-[#1e40af]"
                      />
                      <label htmlFor="host-agree" className="text-xs text-slate-600 leading-relaxed cursor-pointer select-none">
                        I agree to provide accurate property information and follow Engida&apos;s Host Community Guidelines.
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !agreed}
                      className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] hover:from-[#1d4ed8] hover:to-[#1e40af] shadow-md shadow-blue-900/15 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{submittingStep || 'Activating Host Profile…'}</span>
                        </>
                      ) : (
                        <>
                          <span>Activate Host Status & Open Portal</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                /* ────────────────────────────────────────────────────────── */
                /* CASE 2: Unauthenticated User — Seamless Tabbed Auth/Onboard */
                /* ────────────────────────────────────────────────────────── */
                <div>
                  {/* Tab Selector */}
                  <div className="flex bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 mb-5">
                    <button
                      type="button"
                      onClick={() => {
                        setTab('register');
                        setError(null);
                      }}
                      className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                        tab === 'register'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      New Host Sign Up
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTab('login');
                        setError(null);
                      }}
                      className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                        tab === 'login'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Sign In to Host
                    </button>
                  </div>

                  {/* TAB 1: NEW HOST REGISTRATION */}
                  {tab === 'register' ? (
                    <form onSubmit={handleRegisterAndBecomeHost} className="space-y-3.5">
                      <div>
                        <label htmlFor="reg-fullname" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-500" /> Full Legal Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="reg-fullname"
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g., Aster Aweke"
                          className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] focus:outline-none transition"
                        />
                      </div>

                      <div>
                        <label htmlFor="reg-displayname" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" /> Host Display Name <span className="text-slate-400 font-normal normal-case text-[11px]">(public)</span>
                        </label>
                        <input
                          id="reg-displayname"
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder={fullName ? `e.g., ${fullName}` : 'Defaults to your full name'}
                          className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] focus:outline-none transition"
                        />
                      </div>

                      <div>
                        <label htmlFor="reg-email" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-500" /> Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="reg-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="habtamushewamene905@gmail.com"
                          className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] focus:outline-none transition"
                        />
                      </div>

                      <div>
                        <label htmlFor="reg-password" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-slate-500" /> Password <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="reg-password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="At least 8 chars"
                            className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] focus:outline-none transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="reg-phone" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-500" /> Contact Phone
                        </label>
                        <div className="relative">
                          <input
                            id="reg-phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+251 91 123 4567"
                            className="w-full pl-3.5 pr-14 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] focus:outline-none transition"
                          />
                          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 pointer-events-none select-none">
                            <span className="text-sm">🇪🇹</span>
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                        <input
                          id="agree-reg"
                          type="checkbox"
                          checked={agreed}
                          onChange={(e) => setAgreed(e.target.checked)}
                          className="w-4 h-4 mt-0.5 text-[#1e40af] rounded border-slate-300 focus:ring-[#1e40af]"
                        />
                        <label htmlFor="agree-reg" className="text-xs text-slate-600 leading-relaxed cursor-pointer select-none">
                          I agree to Engida&apos;s Host Community Guidelines and Terms of Service.
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || !agreed}
                        className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] hover:from-[#1d4ed8] hover:to-[#1e40af] shadow-md shadow-blue-900/15 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-1"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>{submittingStep || 'Setting up your Host Portal…'}</span>
                          </>
                        ) : (
                          <>
                            <span>Create Account & Start Hosting</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  ) : (
                    /* TAB 2: SIGN IN TO EXISTING ACCOUNT */
                    <form onSubmit={handleLoginThroughGateway} className="space-y-4">
                      <div>
                        <label htmlFor="login-email" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-500" /> Email Address
                        </label>
                        <input
                          id="login-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="habtamushewamene905@gmail.com"
                          className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] focus:outline-none transition"
                        />
                      </div>

                      <div>
                        <label htmlFor="login-password" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-slate-500" /> Password
                        </label>
                        <div className="relative">
                          <input
                            id="login-password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] focus:outline-none transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] hover:from-[#1d4ed8] hover:to-[#1e40af] shadow-md shadow-blue-900/15 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>{submittingStep || 'Signing In…'}</span>
                          </>
                        ) : (
                          <>
                            <span>Sign In to Host Portal</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => setTab('register')}
                          className="text-xs font-bold text-[#1e40af] hover:underline cursor-pointer"
                        >
                          New to hosting? Create your host account
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>
      </main>

      {/* ── Subtle Page Footer ── */}
      <footer className="w-full py-4 px-6 lg:px-12 border-t border-slate-200/80 bg-white/60 text-slate-500 text-xs font-medium">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>© Engida • Host Gateway</div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-slate-800 transition">Host Community Guidelines</Link>
            <span>•</span>
            <Link href="/" className="hover:text-slate-800 transition">Host Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
