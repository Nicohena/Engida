'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertCircle,
  User,
  Building2,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { OnboardingFormData } from './types';
import type { HostProfile } from '@/types/host';
import type { User as AuthUser } from '@/context/AuthContext';

interface Step5ReviewSubmitProps {
  data: OnboardingFormData;
  updateData: (fields: Partial<OnboardingFormData>) => void;
  currentUser: AuthUser | null;
  onRegisterAccount?: (name: string, email: string, pass: string) => Promise<void>;
  onHostProfileCreated?: (profile: HostProfile) => void;
  onBack: () => void;
  onEditStep: (stepNumber: number) => void;
}

export default function Step5ReviewSubmit({
  data,
  updateData,
  currentUser,
  onRegisterAccount,
  onHostProfileCreated,
  onBack,
  onEditStep,
}: Step5ReviewSubmitProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [createdProfile, setCreatedProfile] = useState<HostProfile | null>(null);

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.agreedToHostStandards) {
      setSubmissionError('You must agree to the Ethiopian Hospitality Standards and Host Code of Conduct.');
      return;
    }

    setSubmissionError(null);
    setSubmitting(true);

    try {
      // Step 1: If user is not yet authenticated, create account first
      if (!currentUser && onRegisterAccount) {
        setSubmissionProgress('Setting up your Engida account…');
        await onRegisterAccount(data.fullName.trim(), data.email.trim(), data.password);
      }

      // Step 2: Format address and summary into bio notes
      const locationSummary = `${data.streetAddress}, ${data.woreda ? data.woreda + ', ' : ''}${data.subCity ? data.subCity + ', ' : ''}${data.city}, ${data.region}`;
      const businessSummary =
        data.hostType === 'BUSINESS'
          ? ` [Corporate Host: ${data.businessName}, TIN: ${data.businessTin}]`
          : ' [Individual Host]';
      const completeBio = `${data.bio ? data.bio.trim() + ' — ' : ''}Operating Address: ${locationSummary}${businessSummary}`;

      // Step 3: Create Host Profile via backend API (or update existing unverified draft)
      setSubmissionProgress('Activating your host profile…');
      const hostPayload = {
        displayName: data.displayName.trim(),
        phone: data.phone.trim(),
        bio: completeBio.slice(0, 500),
      };

      let newProfile: HostProfile;
      try {
        newProfile = await apiFetch<HostProfile>('/host/profile', {
          method: 'POST',
          body: JSON.stringify(hostPayload),
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('already has a host profile') || msg.includes('Conflict')) {
          newProfile = await apiFetch<HostProfile>('/host/profile', {
            method: 'PUT',
            body: JSON.stringify(hostPayload),
          });
        } else {
          throw err;
        }
      }

      if (onHostProfileCreated) {
        onHostProfileCreated(newProfile);
      }

      setCreatedProfile(newProfile);
      setIsSubmitted(true);
      // Clear session storage on completed submission
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('engida_host_onboarding_state');
      }
    } catch (err: unknown) {
      setSubmissionError(
        err instanceof Error
          ? err.message
          : 'Failed to complete host onboarding. Please verify your information and retry.',
      );
      setSubmitting(false);
      setSubmissionProgress(null);
    }
  };

  // SUCCESS CONFIRMATION SCREEN
  if (isSubmitted) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 sm:p-8 bg-white border border-[#E5E0D5] rounded-2xl shadow-xs space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-[#EEF3EF] text-[#234B36] flex items-center justify-center mx-auto border border-[#E5E0D5]/60 shadow-xs">
            <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
          </div>
          <span className="inline-block px-3 py-1 bg-[#EEF3EF] border border-[#E5E0D5] text-[#234B36] rounded-full text-xs font-bold uppercase tracking-wider">
            Host Account Active &amp; Verified
          </span>
          <h2 className="text-2xl font-extrabold text-[#252923] tracking-tight font-headline">
            Welcome to Hosting on Engida!
          </h2>
          <p className="text-xs text-[#73776F] max-w-md mx-auto leading-relaxed">
            Your email has been successfully verified and your host account is fully active. You can now immediately create your first property listing and welcome guests to Ethiopia.
          </p>
        </div>

        {/* Verification Summary Card */}
        <div className="p-4 bg-[#F8F5ED] border border-[#E5E0D5] rounded-xl space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-[#E5E0D5]/60">
            <span className="text-[#73776F]">Host Profile Name</span>
            <span className="font-bold text-[#252923]">{createdProfile?.displayName || data.displayName}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#E5E0D5]/60">
            <span className="text-[#73776F]">Verified Contact Email</span>
            <span className="font-medium text-emerald-800 flex items-center gap-1 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {currentUser ? currentUser.email : data.email}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#E5E0D5]/60">
            <span className="text-[#73776F]">Operating Location</span>
            <span className="font-medium text-[#252923]">{data.city}, {data.region}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[#73776F]">Host Account Status</span>
            <span className="font-bold text-[#234B36]">ACTIVE &amp; VERIFIED</span>
          </div>
        </div>

        {/* What You Can Do Right Now */}
        <div className="p-4 bg-[#F8F5ED] border border-[#234B36]/40 rounded-xl space-y-2 text-xs text-[#252923]">
          <p className="font-bold flex items-center gap-2 text-[#234B36]">
            <CheckCircle2 className="w-4 h-4 text-[#234B36]" />
            <span>Full Hosting Privileges Unlocked</span>
          </p>
          <p className="text-[#73776F] leading-relaxed text-[11px]">
            You have full access to create property listings, manage nightly rates, configure booking calendars, and accept reservations from travelers worldwide.
          </p>
        </div>

        {/* Actions */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <Link
            href="/host/listings/new"
            className="flex-1 py-3 bg-[#234B36] hover:bg-[#2D5E43] active:bg-[#1A3828] text-white text-xs font-bold rounded-xl transition text-center shadow-xs flex items-center justify-center gap-2"
          >
            <span>Create Your First Listing</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/host/dashboard"
            className="py-3 px-6 bg-[#EEF3EF] hover:bg-[#e8e0d6] text-[#252923] text-xs font-bold rounded-xl transition text-center border border-[#E5E0D5]"
          >
            Go to Host Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // REVIEW AND SUBMIT FORM
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-[#252923] font-headline">
          Review &amp; Activate Host Account
        </h2>
        <p className="text-xs text-[#73776F] mt-1">
          Review your host profile and contact details before activating your hosting status.
        </p>
      </div>

      {submissionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <span>{submissionError}</span>
        </div>
      )}

      {/* Review Sections */}
      <div className="space-y-4">
        {/* Section 1: Account & Contact */}
        <div className="p-4 bg-white border border-[#E5E0D5] rounded-xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E5E0D5]/40 pb-2">
            <span className="text-xs font-bold text-[#252923] flex items-center gap-2">
              <User className="w-4 h-4 text-[#234B36]" />
              Account &amp; Legal Identity
            </span>
            <button
              type="button"
              onClick={() => onEditStep(1)}
              className="text-xs font-bold text-[#234B36] hover:underline cursor-pointer"
            >
              Edit
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[#73776F] block">Full Legal Name</span>
              <span className="font-semibold text-[#252923]">{currentUser ? currentUser.name : data.fullName}</span>
            </div>
            <div>
              <span className="text-[#73776F] block">Email Address</span>
              <span className="font-semibold text-[#252923]">{currentUser ? currentUser.email : data.email}</span>
            </div>
            <div>
              <span className="text-[#73776F] block">Mobile Phone</span>
              <span className="font-semibold text-[#252923] font-mono">{data.phone}</span>
            </div>
            <div>
              <span className="text-[#73776F] block">Contact Verification</span>
              <span className="font-medium text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {data.contactVerified ? 'Email Verified via OTP' : 'Pending Email Verification'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Host Profile & Operating Location */}
        <div className="p-4 bg-white border border-[#E5E0D5] rounded-xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E5E0D5]/40 pb-2">
            <span className="text-xs font-bold text-[#252923] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#234B36]" />
              Host Profile &amp; Operating Location
            </span>
            <button
              type="button"
              onClick={() => onEditStep(3)}
              className="text-xs font-bold text-[#234B36] hover:underline cursor-pointer"
            >
              Edit
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[#73776F] block">Public Display Name</span>
              <span className="font-semibold text-[#252923]">{data.displayName}</span>
            </div>
            <div>
              <span className="text-[#73776F] block">Host Type</span>
              <span className="font-semibold text-[#252923]">
                {data.hostType === 'BUSINESS' ? 'Corporate / Business Host' : 'Individual Host'}
              </span>
            </div>
            {data.hostType === 'BUSINESS' && (
              <>
                <div>
                  <span className="text-[#73776F] block">Company Name</span>
                  <span className="font-semibold text-[#252923]">{data.businessName}</span>
                </div>
                <div>
                  <span className="text-[#73776F] block">TIN</span>
                  <span className="font-mono font-semibold text-[#252923]">{data.businessTin}</span>
                </div>
              </>
            )}
            <div className="sm:col-span-2">
              <span className="text-[#73776F] block">Operating Address</span>
              <span className="font-medium text-[#252923]">
                {data.streetAddress}, {data.woreda ? data.woreda + ', ' : ''}
                {data.subCity ? data.subCity + ', ' : ''}
                {data.city}, {data.region}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Host Code of Conduct & Standards Agreement */}
      <form onSubmit={handleFinalSubmit} className="space-y-5">
        <div className="p-4 rounded-xl bg-[#F8F5ED] border border-[#E5E0D5]">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={data.agreedToHostStandards}
              onChange={(e) => updateData({ agreedToHostStandards: e.target.checked })}
              className="mt-1 w-4 h-4 rounded text-[#234B36] border-[#E5E0D5] focus:ring-[#234B36]"
            />
            <span className="text-xs text-[#252923] leading-relaxed">
              I agree to abide by the{' '}
              <a href="/host/standards" target="_blank" className="text-[#234B36] font-semibold hover:underline">
                Ethiopian Hospitality Standards
              </a>
              , guest safety guidelines, tax compliance laws, and Engida&apos;s Host Code of Conduct.
            </span>
          </label>
        </div>

        {/* Navigation / Submit CTA */}
        <div className="pt-2 border-t border-[#E5E0D5]/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            disabled={submitting}
            className="px-4 py-2 border border-[#E5E0D5] bg-white hover:bg-[#EEF3EF] text-[#252923] text-xs font-bold rounded-lg transition disabled:opacity-50 cursor-pointer shadow-xs"
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={submitting || !data.agreedToHostStandards}
            className="px-6 py-2.5 bg-[#234B36] hover:bg-[#2D5E43] active:bg-[#1A3828] text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{submissionProgress || 'Activating Account…'}</span>
              </>
            ) : (
              <span>Complete Registration &amp; Activate Host Account</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
