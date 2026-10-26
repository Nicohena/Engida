'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { googleErrorMessage } from '@/lib/google-auth';
import GoogleButton from '@/components/auth/GoogleButton';
import type { HostProfile } from '@/types/host';
import {
  Building2,
  Sparkles,
  ShieldCheck,
  CalendarDays,
  Coins,
  ArrowRight,
  ArrowLeft,
  User,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  CheckCircle2,
  Banknote,
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
  const [phone, setPhone] = useState('+251 9');
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

  // Surface Google sign-in errors (e.g. an account already uses this email)
  useEffect(() => {
    const googleError = new URLSearchParams(window.location.search).get('error');
    if (googleError) {
      setError(googleErrorMessage(googleError));
    }
  }, []);

  // Prefill display name from user name when logged in
  useEffect(() => {
    if (user && !displayName) {
      queueMicrotask(() => {
        setDisplayName(user.name);
      });
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
    setSubmittingStep('Activating your host profile…');

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
      router.replace('/host/profile?onboarded=true');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to activate host profile.');
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

      setSubmittingStep('Redirecting to your Host Profile & Verification…');
      router.replace('/host/profile?onboarded=true');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please check your information.');
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

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900">
      
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 py-3.5 px-6 lg:px-12 transition">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-[#1e40af] flex items-center justify-center text-white shadow-2xs group-hover:bg-[#1e3a8a] transition">
              <Building2 className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900 leading-none block">
                Engida
              </span>
              <span className="text-[10px] font-bold text-[#1e40af] uppercase tracking-widest leading-none">
                Host Portal
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            {user?.hostProfile ? (
              <Link
                href="/host/dashboard"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#1e40af] text-white hover:bg-[#1e3a8a] shadow-xs transition"
              >
                <span>Host Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : !user && (
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  scrollToSection('host-action-card');
                }}
                className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
              >
                Sign In
              </button>
            )}

            <Link
              href="/"
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-900 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Explore Marketplace</span>
              <span className="sm:hidden">Explore</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section (Airy, Enterprise, Focused) ── */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/70 text-[#1e40af] text-xs font-bold tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>VERIFIED ETHIOPIAN HOSTING</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12] max-w-4xl mx-auto">
          Turn your property into trusted, predictable revenue.
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
          Connect with vetted domestic travelers and diaspora guests. Enjoy complete calendar control, zero upfront listing fees, and guaranteed escrow payouts directly to your CBE or Chapa account.
        </p>

        {/* Dynamic CTA depending on current user state */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {user?.hostProfile ? (
            <Link
              href="/host/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white bg-[#1e40af] hover:bg-[#1e3a8a] shadow-xs hover:shadow-sm transition cursor-pointer"
            >
              <span>Go to Your Host Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : user && !user.hostProfile ? (
            <button
              onClick={() => scrollToSection('host-action-card')}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white bg-[#1e40af] hover:bg-[#1e3a8a] shadow-xs hover:shadow-sm transition cursor-pointer"
            >
              <span>Activate Your Host Profile in 1 Step</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setTab('register');
                  scrollToSection('host-action-card');
                }}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white bg-[#1e40af] hover:bg-[#1e3a8a] shadow-xs hover:shadow-sm transition cursor-pointer w-full sm:w-auto justify-center"
              >
                <span>Start Hosting Today</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollToSection('earnings-calculator')}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition cursor-pointer w-full sm:w-auto justify-center"
              >
                <Coins className="w-4 h-4 text-amber-600" />
                <span>Estimate Your Earnings</span>
              </button>
            </>
          )}
        </div>
      </section>

      {/* ── Interactive Revenue Estimator (Clean & Modern) ── */}
      <section id="earnings-calculator" className="max-w-4xl mx-auto w-full px-4 sm:px-6 mb-16">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-3">
            <div>
              <span className="text-[11px] font-bold text-[#1e40af] uppercase tracking-wider block mb-1">
                REVENUE SIMULATOR
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                How much could your property earn?
              </h2>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-xs font-semibold self-start sm:self-auto">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>0% Upfront Listing Fee</span>
            </div>
          </div>

          {/* Calculator Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6">
            <div>
              <label htmlFor="city-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Property Location
              </label>
              <div className="relative">
                <select
                  id="city-select"
                  value={selectedCityIndex}
                  onChange={(e) => handleCityChange(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] focus:outline-none transition appearance-none cursor-pointer pr-10"
                >
                  {ETHIOPIAN_CITIES.map((c, i) => (
                    <option key={c.name} value={i}>
                      {c.name} — Typical: {c.popularType}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label htmlFor="price-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Nightly Rate (ETB)
              </label>
              <div className="relative">
                <input
                  id="price-input"
                  type="number"
                  min={500}
                  max={50000}
                  step={100}
                  value={customPricePerNight}
                  onChange={(e) => setCustomPricePerNight(Math.max(500, Number(e.target.value)))}
                  className="w-full pl-4 pr-14 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] focus:outline-none transition"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  ETB
                </span>
              </div>
            </div>
          </div>

          {/* Nights Slider */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
              <span>Estimated Booked Nights per Month</span>
              <span className="text-sm font-black text-[#1e40af]">{bookedNights} Nights</span>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              step={1}
              value={bookedNights}
              onChange={(e) => setBookedNights(Number(e.target.value))}
              aria-label="Estimated Booked Nights"
              className="w-full h-2 rounded-lg bg-slate-200 accent-[#1e40af] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 mt-2 font-medium">
              <span>Part-time (5 nights)</span>
              <span>Average (15 nights)</span>
              <span>Peak (30 nights)</span>
            </div>
          </div>

          {/* Clean Metric Outcome Box */}
          <div className="mt-6 p-5 sm:p-6 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                PROJECTED MONTHLY REVENUE
              </span>
              <div className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
                ETB {monthlyEarnings.toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Estimated ~ETB {annualEarnings.toLocaleString()} annually based on {bookedNights} booked nights in {ETHIOPIAN_CITIES[selectedCityIndex].name}.
              </p>
            </div>

            <div className="sm:text-right shrink-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white border border-white/10 text-xs font-medium">
                <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                <span>Direct CBE / Chapa Payouts</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3 Steps: How Hosting Works ── */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 mb-16">
        <div className="text-center mb-10 space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#1e40af]">
            SEAMLESS ONBOARDING
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            How hosting on Engida works
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
            Three simple steps from listing to receiving your first guest payout.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1e40af] flex items-center justify-center font-black text-sm">
              01
            </div>
            <h3 className="text-base font-bold text-slate-900">List your property</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Upload photos, add pricing and amenities, and specify house rules. Your property is ready in under 10 minutes.
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1e40af] flex items-center justify-center font-black text-sm">
              02
            </div>
            <h3 className="text-base font-bold text-slate-900">Welcome verified guests</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Guests book instantly or request stays. Every guest account is phone and ID authenticated for community safety.
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1e40af] flex items-center justify-center font-black text-sm">
              03
            </div>
            <h3 className="text-base font-bold text-slate-900">Get paid automatically</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Funds are held securely in escrow and released directly to your Commercial Bank of Ethiopia (CBE) or Chapa wallet.
            </p>
          </div>
        </div>
      </section>

      {/* ── Enterprise Host Trust Pillars ── */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 mb-16">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-xs">
          <div className="text-center max-w-xl mx-auto mb-8 space-y-1">
            <span className="text-[11px] font-bold text-[#1e40af] uppercase tracking-wider">
              PEACE OF MIND
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Built for Ethiopian Hosts & Diaspora Guests
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Escrow Security</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Guest funds are collected in advance and guaranteed before any key exchange happens.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1e40af] flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">ID Verification</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Mandatory contact and identification verification filters out unauthorized bookings.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <CalendarDays className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Total Calendar Freedom</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Block private family dates, configure weekend pricing, and modify availability anytime.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                <Coins className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Zero Upfront Fees</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Publishing listings is 100% free. We only earn a small commission when you earn revenue.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Host Action Card (Activation / Registration) ── */}
      <section id="host-action-card" className="max-w-xl mx-auto w-full px-4 sm:px-6 mb-20">
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm">
          
          {/* Error Banner */}
          {error && (
            <div role="alert" className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm font-semibold flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{error}</div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────── */}
          {/* SCENARIO 1: Logged-in user who ALREADY has a host profile */}
          {/* ────────────────────────────────────────────────────────── */}
          {user?.hostProfile ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  You are already an active Host Partner
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Signed in as <strong>{user.name}</strong>. Access your property listings, availability calendar, and financial settlements directly.
                </p>
              </div>
              <Link
                href="/host/dashboard"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#1e40af] hover:bg-[#1e3a8a] transition shadow-xs"
              >
                <span>Open Host Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : user && !user.hostProfile ? (
            /* ────────────────────────────────────────────────────────── */
            /* SCENARIO 2: Logged-in user upgrading to Host status */
            /* ────────────────────────────────────────────────────────── */
            <div>
              <div className="border-b border-slate-100 pb-4 mb-5">
                <span className="text-[11px] font-bold text-[#1e40af] uppercase tracking-wider block mb-1">
                  1-STEP HOST UPGRADE
                </span>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Activate Your Host Profile
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Signed in as <strong className="text-slate-800">{user.name}</strong> ({user.email}). Confirm your public host identity to start publishing properties.
                </p>
              </div>

              <form onSubmit={handleActivateHostOnly} className="space-y-4">
                <div>
                  <label htmlFor="act-displayname" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Host Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="act-displayname"
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g., Aster Aweke or Addis Stays"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] focus:outline-none transition"
                  />
                </div>

                <div>
                  <label htmlFor="act-phone" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Contact Phone Number
                  </label>
                  <input
                    id="act-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+251 91 234 5678"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] focus:outline-none transition"
                  />
                </div>

                <div>
                  <label htmlFor="act-bio" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Short Host Bio (Optional)
                  </label>
                  <textarea
                    id="act-bio"
                    rows={2}
                    maxLength={500}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell guests about your hospitality and property style."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] focus:outline-none transition resize-none"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2.5">
                  <input
                    id="act-agreed"
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-[#1e40af] rounded border-slate-300 focus:ring-[#1e40af]"
                  />
                  <label htmlFor="act-agreed" className="text-xs text-slate-600 leading-relaxed cursor-pointer select-none">
                    I agree to provide accurate listing details and abide by Engida&apos;s Host Community Guidelines.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading || !agreed}
                  className="w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#1e40af] hover:bg-[#1e3a8a] transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{submittingStep || 'Activating Profile…'}</span>
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
            /* SCENARIO 3: Unauthenticated user (Clean Tabbed Auth) */
            /* ────────────────────────────────────────────────────────── */
            <div>
              {/* Tab Selector */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setTab('register');
                    setError(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                    tab === 'register'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  New Host Registration
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('login');
                    setError(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                    tab === 'login'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Sign In to Host
                </button>
              </div>

              {tab === 'register' ? (
                /* Registration Form */
                <form onSubmit={handleRegisterAndBecomeHost} className="space-y-4">
                  <div>
                    <label htmlFor="reg-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Full Legal Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="reg-name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g., Abebech Gobena"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="reg-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] focus:outline-none transition"
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
                    <label htmlFor="reg-phone" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Contact Phone (Ethiopian Mobile)
                    </label>
                    <input
                      id="reg-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+251 91 234 5678"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] focus:outline-none transition"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2.5">
                    <input
                      id="reg-agreed"
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="w-4 h-4 mt-0.5 text-[#1e40af] rounded border-slate-300 focus:ring-[#1e40af]"
                    />
                    <label htmlFor="reg-agreed" className="text-xs text-slate-600 leading-relaxed cursor-pointer select-none">
                      I agree to Engida&apos;s Host Community Guidelines and Terms of Service.
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !agreed}
                    className="w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#1e40af] hover:bg-[#1e3a8a] transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
                /* Sign In Form */
                <form onSubmit={handleLoginThroughGateway} className="space-y-4">
                  <div>
                    <label htmlFor="login-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label htmlFor="login-password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#1e40af]/20 focus:border-[#1e40af] focus:outline-none transition"
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
                    className="w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#1e40af] hover:bg-[#1e3a8a] transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{submittingStep || 'Signing in…'}</span>
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
      </section>

      {/* ── Subtle Enterprise Page Footer ── */}
      <footer className="w-full py-6 px-6 lg:px-12 border-t border-slate-200/80 bg-white text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>© Engida • Ethiopian Property Host Network</div>
          <div className="flex items-center gap-4 text-slate-500">
            <Link href="/" className="hover:text-slate-900 transition">Host Guidelines</Link>
            <span>•</span>
            <Link href="/" className="hover:text-slate-900 transition">Payment Protection</Link>
            <span>•</span>
            <Link href="/" className="hover:text-slate-900 transition">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
