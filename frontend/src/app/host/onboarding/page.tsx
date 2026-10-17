'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import type { HostProfile } from '@/types/host';
import {
  Building2,
  CheckCircle2,
  Sparkles,
  CalendarCheck,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  ArrowLeft,
  User,
  Phone,
  FileText,
} from 'lucide-react';

export default function BecomeAHostPage() {
  const { user, refreshUser, setHostProfile } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.hostProfile) {
      router.replace('/host/dashboard');
    } else if (!displayName && user.name) {
      setDisplayName(user.name);
    }
  }, [router, user, displayName]);

  if (user?.hostProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7FC]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#33599E] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-[#64748B]">You are already a registered host. Redirecting to your dashboard…</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = displayName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError('Please provide a display name with at least 2 characters.');
      return;
    }

    if (!agreed) {
      setError('Please accept the Host Community Standards to continue.');
      return;
    }

    setLoading(true);

    try {
      const payload: { displayName: string; phone?: string; bio?: string } = {
        displayName: trimmedName,
      };
      if (phone.trim()) payload.phone = phone.trim();
      if (bio.trim()) payload.bio = bio.trim();

      const newProfile = await apiFetch<HostProfile>('/host/profile', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Synchronously update auth context so layout guards recognize host state immediately
      setHostProfile(newProfile);
      void refreshUser();

      // Smoothly navigate directly to host dashboard
      router.replace('/host/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to create host profile. Please check your network and try again.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FC] text-[#000000]">
      {/* Top Header */}
      <header className="bg-white border-b border-[#CBD5E1] py-4 px-6 md:px-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-[#33599E] flex items-center justify-center text-white shadow-sm group-hover:bg-[#234079] transition">
            <Building2 className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <span className="font-black text-lg tracking-tight text-[#000000] leading-none block">Engida</span>
            <span className="text-[10px] font-semibold text-[#33599E] uppercase tracking-widest leading-none">Host Onboarding</span>
          </div>
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#64748B] hover:text-[#33599E] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Column: Value Proposition & Host Benefits */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E3EAF5] text-[#33599E] text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Become an Engida Host</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-[#000000] tracking-tight leading-tight">
              Share your space, welcome guests across Ethiopia.
            </h1>

            <p className="text-base text-[#475569] leading-relaxed">
              Whether you have an apartment in Addis Ababa, a lakeside retreat in Bishoftu, or a vacation home in Hawassa, Engida connects you with verified guests and serious buyers.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3.5 p-4 bg-white rounded-2xl border border-[#CBD5E1]">
                <div className="w-10 h-10 rounded-xl bg-[#E3EAF5] text-[#33599E] flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#000000]">Manage Rental & Sale Listings</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Full control over photos, descriptions, nightly rates, or sale prices in ETB.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 bg-white rounded-2xl border border-[#CBD5E1]">
                <div className="w-10 h-10 rounded-xl bg-[#E3EAF5] text-[#33599E] flex items-center justify-center shrink-0">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#000000]">Smart Calendar & Availability</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Block custom dates, set seasonal rates, and manage incoming reservations with one click.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 bg-white rounded-2xl border border-[#CBD5E1]">
                <div className="w-10 h-10 rounded-xl bg-[#E3EAF5] text-[#33599E] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#000000]">Keep Your Guest Privileges</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Your account maintains regular guest access so you can still search and book stays.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Host Setup Form */}
          <div className="lg:col-span-7">
            <div className="bg-white border border-[#CBD5E1] rounded-3xl p-6 sm:p-10 shadow-sm">
              <div className="border-b border-[#E2E8F0] pb-5 mb-6">
                <h2 className="text-xl sm:text-2xl font-black text-[#000000] tracking-tight">
                  Complete Your Host Profile
                </h2>
                <p className="text-xs sm:text-sm text-[#64748B] mt-1">
                  This public profile helps guests know who is hosting them. You can update this at any time in your Host Portal.
                </p>
              </div>

              {error && (
                <div role="alert" className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm font-semibold flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-snug">{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Display Name */}
                <div>
                  <label htmlFor="displayName" className="block text-xs font-black uppercase tracking-wider text-[#33599E] mb-2 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>Host Display Name</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g., Abebe B. or Sunshine Stays"
                    className="w-full px-4 py-3 bg-[#F4F7FC] border border-[#CBD5E1] rounded-xl text-sm font-bold text-[#000000] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#33599E] focus:border-transparent transition"
                  />
                  <p className="text-[11px] text-[#64748B] mt-1">This is the name guests will see on your property listings.</p>
                </div>

                {/* Phone Number */}
                <div>
                  <label htmlFor="phone" className="block text-xs font-black uppercase tracking-wider text-[#33599E] mb-2 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    <span>Contact Phone Number</span>
                    <span className="text-xs font-normal text-[#94A3B8] normal-case">(optional)</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    maxLength={30}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+251 91 123 4567"
                    className="w-full px-4 py-3 bg-[#F4F7FC] border border-[#CBD5E1] rounded-xl text-sm font-bold text-[#000000] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#33599E] focus:border-transparent transition"
                  />
                  <p className="text-[11px] text-[#64748B] mt-1">Used for booking confirmations and urgent guest communications.</p>
                </div>

                {/* Bio */}
                <div>
                  <label htmlFor="bio" className="block text-xs font-black uppercase tracking-wider text-[#33599E] mb-2 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>About You & Hosting Style</span>
                    <span className="text-xs font-normal text-[#94A3B8] normal-case">(optional)</span>
                  </label>
                  <textarea
                    id="bio"
                    rows={4}
                    maxLength={500}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell guests about your hospitality, languages spoken, or what makes your accommodations special."
                    className="w-full px-4 py-3 bg-[#F4F7FC] border border-[#CBD5E1] rounded-xl text-sm font-medium text-[#000000] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#33599E] focus:border-transparent transition resize-none"
                  />
                  <p className="text-[11px] text-right text-[#94A3B8] mt-1">{bio.length}/500</p>
                </div>

                {/* Community Agreement */}
                <div className="p-4 bg-[#F4F7FC] rounded-2xl border border-[#CBD5E1] flex items-start gap-3">
                  <input
                    id="standards"
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-[#33599E] rounded border-[#CBD5E1] focus:ring-[#33599E]"
                  />
                  <label htmlFor="standards" className="text-xs text-[#475569] leading-relaxed cursor-pointer select-none">
                    I agree to provide accurate property details, maintain clean and safe accommodations, and follow Engida&apos;s Host Community Guidelines.
                  </label>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3">
                  <Link
                    href="/"
                    className="w-full sm:w-auto text-center px-6 py-3 rounded-xl border border-[#CBD5E1] text-sm font-bold text-[#475569] hover:bg-[#F4F7FC] transition"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={loading || !agreed}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-[#33599E] to-[#234079] hover:from-[#234079] hover:to-[#162B54] text-white text-sm font-black shadow-md shadow-[#33599E]/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creating Host Profile…</span>
                      </>
                    ) : (
                      <>
                        <span>Start Hosting</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
