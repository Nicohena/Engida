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
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  User,
  Phone,
  FileText,
  AlertCircle,
  HelpCircle,
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
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [agreed, setAgreed] = useState(true);

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
      setError('Please agree to the Host Community Standards to continue.');
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
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long with uppercase, lowercase, and a number or symbol.');
      return;
    }
    if (!agreed) {
      setError('Please agree to the Host Community Standards.');
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

  return (
    <div className="min-h-screen bg-[#F4F7FC] text-[#000000]">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#CBD5E1] py-3.5 px-6 lg:px-12 transition">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#33599E] to-[#234079] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-black text-xl tracking-tight text-[#000000] leading-none block">
                Engida
              </span>
              <span className="text-[10px] font-bold text-[#33599E] uppercase tracking-widest leading-none">
                Host Gateway
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#64748B] hover:text-[#33599E] transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Explore</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Split-Screen Gateway Container ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* ═══════════════════════════════════════════════════════════ */}
          {/* LEFT COLUMN: Hero, Value Proposition, Earnings Simulator */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Header Badge & Title */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E3EAF5] text-[#33599E] text-xs font-black tracking-wide mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>START HOSTING ON ENGIDA</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-[#000000] tracking-tight leading-[1.18]">
                Turn your space into reliable monthly income.
              </h1>
              <p className="mt-2.5 text-sm sm:text-base text-[#475569] leading-relaxed">
                List entire homes, guest rooms, or vacation retreats across Ethiopia. Set your own prices, choose your availability, and welcome verified guests on your terms.
              </p>
            </div>

            {/* Interactive Earnings Simulator Card */}
            <div className="bg-white border-2 border-[#CBD5E1] rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#000000]">Earnings Calculator</h3>
                    <p className="text-xs text-[#64748B]">Estimate your potential hosting revenue in Ethiopia</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold bg-[#E3EAF5] text-[#33599E] px-2.5 py-1 rounded-full">
                  Live ETB Estimates
                </span>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                {/* City Selection */}
                <div>
                  <label className="block text-xs font-black text-[#334155] uppercase tracking-wider mb-1.5">
                    Select Location
                  </label>
                  <select
                    value={selectedCityIndex}
                    onChange={(e) => handleCityChange(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-[#F4F7FC] border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#000000] focus:ring-2 focus:ring-[#33599E] focus:outline-none"
                  >
                    {ETHIOPIAN_CITIES.map((c, i) => (
                      <option key={c.name} value={i}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nightly Rate Input */}
                <div>
                  <label className="block text-xs font-black text-[#334155] uppercase tracking-wider mb-1.5">
                    Price per Night (ETB)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={500}
                      max={50000}
                      step={100}
                      value={customPricePerNight}
                      onChange={(e) => setCustomPricePerNight(Math.max(500, Number(e.target.value)))}
                      className="w-full px-3.5 py-2.5 bg-[#F4F7FC] border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#000000] focus:ring-2 focus:ring-[#33599E] focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-[#64748B]">ETB</span>
                  </div>
                </div>
              </div>

              {/* Occupancy Slider */}
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs font-bold text-[#334155] mb-2">
                  <span>Estimated Booked Nights per Month</span>
                  <span className="text-sm font-black text-[#33599E]">{bookedNights} Nights</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={30}
                  step={1}
                  value={bookedNights}
                  onChange={(e) => setBookedNights(Number(e.target.value))}
                  className="w-full h-2 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#33599E]"
                />
                <div className="flex justify-between text-[10px] text-[#94A3B8] mt-1 font-semibold">
                  <span>Part-time (5 nights)</span>
                  <span>Average (15 nights)</span>
                  <span>Full-time (30 nights)</span>
                </div>
              </div>

              {/* Earnings Result Banner */}
              <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-[#33599E] to-[#1E3A70] text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold text-blue-200 uppercase tracking-widest block">
                    Estimated Monthly Income
                  </span>
                  <span className="text-3xl sm:text-4xl font-black tracking-tight tabular-nums">
                    ETB {monthlyEarnings.toLocaleString()}
                  </span>
                  <span className="text-xs text-blue-200 block mt-0.5">
                    Approx. ETB {annualEarnings.toLocaleString()} per year
                  </span>
                </div>
                <div className="sm:text-right text-xs text-blue-100 max-w-xs leading-snug">
                  Based on {bookedNights} nights in {ETHIOPIAN_CITIES[selectedCityIndex].name} with zero listing fees.
                </div>
              </div>
            </div>

            {/* 3 Pillars of Host Confidence */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-2xl border border-[#CBD5E1] flex flex-col gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#E3EAF5] text-[#33599E] flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-[#000000]">Verified Guests</h4>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Every guest account is phone and ID authenticated for maximum peace of mind.
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-[#CBD5E1] flex flex-col gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#E3EAF5] text-[#33599E] flex items-center justify-center font-bold">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-[#000000]">Full Flexibility</h4>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Block private dates, define house rules, and set seasonal pricing anytime.
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-[#CBD5E1] flex flex-col gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#E3EAF5] text-[#33599E] flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-[#000000]">Dual Privilege</h4>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Stay as a guest anytime using the exact same account when you travel.
                </p>
              </div>
            </div>

          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* RIGHT COLUMN: Seamless All-in-One Host Onboarding / Auth */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5">
            <div className="bg-white border-2 border-[#CBD5E1] rounded-2xl p-5 sm:p-6 shadow-md shadow-[#33599E]/5">
              
              {/* Error Alert */}
              {error && (
                <div role="alert" className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm font-bold flex items-start gap-2.5 animate-shake">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-snug">{error}</div>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────── */}
              {/* CASE 1: User is already logged in, needs to complete Host profile */}
              {/* ────────────────────────────────────────────────────────── */}
              {user && !user.hostProfile ? (
                <div>
                  <div className="border-b border-[#E2E8F0] pb-3 mb-4">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#33599E]">
                      Step 2 of 2
                    </span>
                    <h2 className="text-xl font-black text-[#000000] tracking-tight mt-0.5">
                      Activate Your Host Profile
                    </h2>
                    <p className="text-xs text-[#64748B] mt-1">
                      Logged in as <strong className="text-[#000000]">{user.name}</strong> ({user.email}). Complete your public host details to start publishing properties.
                    </p>
                  </div>

                  <form onSubmit={handleActivateHostOnly} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-[#33599E] mb-1 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" /> Host Display Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        minLength={2}
                        maxLength={100}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g., Abebe B. or Addis Luxury Stays"
                        className="w-full px-3.5 py-2 bg-[#F4F7FC] border border-[#CBD5E1] rounded-xl text-xs sm:text-sm font-bold text-[#000000] focus:ring-2 focus:ring-[#33599E] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-[#33599E] mb-1 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> Contact Phone
                      </label>
                      <input
                        type="tel"
                        maxLength={30}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+251 91 123 4567"
                        className="w-full px-3.5 py-2 bg-[#F4F7FC] border border-[#CBD5E1] rounded-xl text-xs sm:text-sm font-bold text-[#000000] focus:ring-2 focus:ring-[#33599E] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-[#33599E] mb-1 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> Short Bio & Style
                      </label>
                      <textarea
                        rows={2}
                        maxLength={500}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell future guests about yourself or your hospitality style."
                        className="w-full px-3.5 py-2 bg-[#F4F7FC] border border-[#CBD5E1] rounded-xl text-xs sm:text-sm font-medium text-[#000000] focus:ring-2 focus:ring-[#33599E] focus:outline-none resize-none"
                      />
                    </div>

                    <div className="p-2.5 bg-[#F4F7FC] rounded-xl border border-[#CBD5E1] flex items-start gap-2">
                      <input
                        id="host-agree"
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="w-4 h-4 mt-0.5 text-[#33599E] rounded border-[#CBD5E1] focus:ring-[#33599E]"
                      />
                      <label htmlFor="host-agree" className="text-[11px] text-[#475569] leading-tight cursor-pointer select-none">
                        I agree to provide accurate property information and follow Engida&apos;s Host Community Guidelines.
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !agreed}
                      className="w-full py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-[#33599E] to-[#234079] hover:from-[#234079] hover:to-[#162B54] shadow-md shadow-[#33599E]/25 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
                  <div className="flex bg-[#F4F7FC] p-1 rounded-2xl border border-[#CBD5E1] mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        setTab('register');
                        setError(null);
                      }}
                      className={`flex-1 py-2 text-xs font-black rounded-xl transition cursor-pointer ${
                        tab === 'register'
                          ? 'bg-white text-[#33599E] shadow-xs'
                          : 'text-[#64748B] hover:text-[#000000]'
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
                      className={`flex-1 py-2 text-xs font-black rounded-xl transition cursor-pointer ${
                        tab === 'login'
                          ? 'bg-white text-[#33599E] shadow-xs'
                          : 'text-[#64748B] hover:text-[#000000]'
                      }`}
                    >
                      Sign In to Host
                    </button>
                  </div>

                  {/* TAB 1: NEW HOST REGISTRATION */}
                  {tab === 'register' ? (
                    <form onSubmit={handleRegisterAndBecomeHost} className="space-y-3">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-[#33599E] mb-1 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" /> Full Legal Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g., Aster Aweke"
                          className="w-full px-3.5 py-2.5 bg-[#F4F7FC] border border-[#CBD5E1] rounded-xl text-xs sm:text-sm font-bold text-[#000000] focus:ring-2 focus:ring-[#33599E] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-[#33599E] mb-1 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5" /> Host Display Name <span className="text-xs font-normal text-[#94A3B8] normal-case">(public)</span>
                        </label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder={fullName ? `e.g., ${fullName}` : 'Defaults to your full name'}
                          className="w-full px-3.5 py-2.5 bg-[#F4F7FC] border border-[#CBD5E1] rounded-xl text-xs sm:text-sm font-bold text-[#000000] focus:ring-2 focus:ring-[#33599E] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-[#33599E] mb-1 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" /> Email Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full px-3.5 py-2.5 bg-[#F4F7FC] border border-[#CBD5E1] rounded-xl text-xs sm:text-sm font-bold text-[#000000] focus:ring-2 focus:ring-[#33599E] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-[#33599E] mb-1 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5" /> Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="At least 8 chars (A-Z, a-z, 0-9)"
                          className="w-full px-3.5 py-2.5 bg-[#F4F7FC] border border-[#CBD5E1] rounded-xl text-xs sm:text-sm font-bold text-[#000000] focus:ring-2 focus:ring-[#33599E] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-[#33599E] mb-1 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5" /> Contact Phone
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+251 91 123 4567"
                          className="w-full px-3.5 py-2.5 bg-[#F4F7FC] border border-[#CBD5E1] rounded-xl text-xs sm:text-sm font-bold text-[#000000] focus:ring-2 focus:ring-[#33599E] focus:outline-none"
                        />
                      </div>

                      <div className="p-3 bg-[#F4F7FC] rounded-xl border border-[#CBD5E1] flex items-start gap-2.5">
                        <input
                          id="agree-reg"
                          type="checkbox"
                          checked={agreed}
                          onChange={(e) => setAgreed(e.target.checked)}
                          className="w-4 h-4 mt-0.5 text-[#33599E] rounded border-[#CBD5E1] focus:ring-[#33599E]"
                        />
                        <label htmlFor="agree-reg" className="text-xs text-[#475569] leading-relaxed cursor-pointer select-none">
                          I agree to Engida&apos;s Host Community Guidelines and Terms of Service.
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || !agreed}
                        className="w-full py-3.5 px-4 rounded-xl font-black text-sm text-white bg-gradient-to-r from-[#33599E] to-[#234079] hover:from-[#234079] hover:to-[#162B54] shadow-md shadow-[#33599E]/25 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
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
                    <form onSubmit={handleLoginThroughGateway} className="space-y-5">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-[#33599E] mb-1.5 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" /> Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full px-4 py-3 bg-[#F4F7FC] border border-[#CBD5E1] rounded-xl text-sm font-bold text-[#000000] focus:ring-2 focus:ring-[#33599E] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-[#33599E] mb-1.5 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5" /> Password
                        </label>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-4 py-3 bg-[#F4F7FC] border border-[#CBD5E1] rounded-xl text-sm font-bold text-[#000000] focus:ring-2 focus:ring-[#33599E] focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 px-4 rounded-xl font-black text-sm text-white bg-gradient-to-r from-[#33599E] to-[#234079] hover:from-[#234079] hover:to-[#162B54] shadow-md shadow-[#33599E]/25 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
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
                          className="text-xs font-bold text-[#33599E] hover:underline cursor-pointer"
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
    </div>
  );
}
