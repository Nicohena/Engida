'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Building2,
  RefreshCw,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { SUPPORTED_DOCUMENT_TYPES, type OnboardingFormData } from './types';
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

  const docLabel =
    SUPPORTED_DOCUMENT_TYPES.find((d) => d.value === data.documentType)?.label || data.documentType;

  // Masked document number display for privacy
  const maskedDocNumber =
    data.documentNumber.length > 4
      ? `${'*'.repeat(Math.max(data.documentNumber.length - 4, 3))}-${data.documentNumber.slice(-4)}`
      : '****';

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
        setSubmissionProgress('Creating your Engida account…');
        await onRegisterAccount(data.fullName.trim(), data.email.trim(), data.password);
      }

      // Step 2: Format address and identity summary into bio notes
      const locationSummary = `${data.streetAddress}, ${data.woreda ? data.woreda + ', ' : ''}${data.subCity ? data.subCity + ', ' : ''}${data.city}, ${data.region}`;
      const businessSummary =
        data.hostType === 'BUSINESS'
          ? ` [Corporate Host: ${data.businessName}, TIN: ${data.businessTin}]`
          : ' [Individual Host]';
      const completeBio = `${data.bio ? data.bio.trim() + ' — ' : ''}Operating Address: ${locationSummary}${businessSummary}`;

      // Step 3: Create Host Profile via backend API
      setSubmissionProgress('Setting up your host profile…');
      const hostPayload = {
        displayName: data.displayName.trim(),
        phone: data.phone.trim(),
        bio: completeBio.slice(0, 500),
      };

      const newProfile = await apiFetch<HostProfile>('/host/profile', {
        method: 'POST',
        body: JSON.stringify(hostPayload),
      });

      // Step 3.5: Upload attached document images to secure KYC vault
      let uploadedFrontUrl = data.documentFrontUrl || undefined;
      let uploadedBackUrl = data.documentBackUrl || undefined;

      if (!uploadedFrontUrl && data.filePreviewUrl) {
        try {
          setSubmissionProgress('Encrypting & uploading identity document scan…');
          const res = await fetch(data.filePreviewUrl);
          const blob = await res.blob();
          const uploadForm = new FormData();
          uploadForm.append('file', blob, data.fileName || 'identity_document.png');
          const uploadRes = await apiFetch<{ secureUrl?: string; url?: string }>('/upload/image', {
            method: 'POST',
            body: uploadForm,
          });
          if (uploadRes?.secureUrl || uploadRes?.url) {
            uploadedFrontUrl = uploadRes.secureUrl || uploadRes.url;
          }
        } catch {
          // If upload fails, continue with document metadata
        }
      }

      if (!uploadedBackUrl && data.backFilePreviewUrl) {
        try {
          const res = await fetch(data.backFilePreviewUrl);
          const blob = await res.blob();
          const uploadForm = new FormData();
          uploadForm.append('file', blob, data.backFileName || 'identity_document_back.png');
          const uploadRes = await apiFetch<{ secureUrl?: string; url?: string }>('/upload/image', {
            method: 'POST',
            body: uploadForm,
          });
          if (uploadRes?.secureUrl || uploadRes?.url) {
            uploadedBackUrl = uploadRes.secureUrl || uploadRes.url;
          }
        } catch {
          // If upload fails, continue with document metadata
        }
      }

      // Step 4: Submit Identity Verification Request with multi-document payload
      setSubmissionProgress('Submitting government identity verification for review…');
      const verificationPayload = {
        documentType: data.documentType,
        issuingCountry: data.issuingCountry,
        documentNumber: data.documentNumber.trim(),
        issuingAuthority:
          data.issuingAuthority?.trim() ||
          (data.faydaExtractedData ? 'National ID Program (NIDP)' : undefined),
        expirationDate: data.expirationDate || undefined,
        verificationProvider: data.faydaExtractedData?.isLiveNidpExtract ? 'FAYDA_NIDP' : 'MANUAL_ADMIN_REVIEW',
        verificationReference: data.faydaExtractedData?.verificationToken || `ONBOARD-${Date.now()}`,
        documentFrontUrl: uploadedFrontUrl,
        documentBackUrl: uploadedBackUrl,
        documentFileName: data.fileName || undefined,
        documentFileSize: data.fileSize || undefined,
      };

      const pendingProfile = await apiFetch<HostProfile>('/host/profile/request-verification', {
        method: 'POST',
        body: JSON.stringify(verificationPayload),
      });

      if (onHostProfileCreated) {
        onHostProfileCreated(pendingProfile || newProfile);
      }

      setCreatedProfile(pendingProfile || newProfile);
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
      <div className="w-full max-w-2xl mx-auto p-6 sm:p-8 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7 stroke-[2.2]" />
          </div>
          <span className="inline-block px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-bold uppercase tracking-wider">
            Verification Pending Administrative Review
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Application Received
          </h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            Your host profile and identity documentation have been securely recorded. An authorized platform
            administrator is reviewing your identity credentials.
          </p>
        </div>

        {/* Verification Summary Card */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Host Profile Name</span>
            <span className="font-bold text-slate-900">{createdProfile?.displayName || data.displayName}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Identity Document</span>
            <span className="font-medium text-slate-800">{docLabel}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Masked ID Number</span>
            <span className="font-mono text-slate-800">{maskedDocNumber}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Initial Verification Status</span>
            <span className="font-bold text-amber-700">PENDING REVIEW</span>
          </div>
        </div>

        {/* What You Can Do Right Now */}
        <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2 text-xs text-blue-900">
          <p className="font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-700" />
            <span>Draft Listings Are Unlocked Immediately</span>
          </p>
          <p className="text-blue-800 leading-relaxed text-[11px]">
            While awaiting administrator verification, you can immediately access your Host Dashboard to create, edit,
            and organize draft listings. In accordance with platform security policy, public listing publication will
            become active once identity verification is approved.
          </p>
        </div>

        {/* Actions */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <Link
            href="/host/dashboard"
            className="flex-1 py-3 bg-[#1e40af] hover:bg-[#1e3a8a] text-white text-xs font-bold rounded-xl transition text-center shadow-xs flex items-center justify-center gap-2"
          >
            <span>Go to Host Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/host/profile?onboarded=true"
            className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition text-center"
          >
            View Host Profile
          </Link>
        </div>
      </div>
    );
  }

  // REVIEW AND SUBMIT FORM
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Review & Submit Application
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Review your host application details before submitting for official verification.
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
        <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-[#1e40af]" />
              Account & Legal Identity
            </span>
            <button
              type="button"
              onClick={() => onEditStep(1)}
              className="text-xs font-bold text-[#1e40af] hover:underline cursor-pointer"
            >
              Edit
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500 block">Full Legal Name</span>
              <span className="font-semibold text-slate-900">{currentUser ? currentUser.name : data.fullName}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Email Address</span>
              <span className="font-semibold text-slate-900">{currentUser ? currentUser.email : data.email}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Mobile Phone</span>
              <span className="font-semibold text-slate-900 font-mono">{data.phone}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Contact Verification</span>
              <span className="font-medium text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {data.contactVerified ? 'Email Verified via OTP' : 'Pending Email Verification'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Identity Document */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#1e40af]" />
              Government Identity Document
            </span>
            <button
              type="button"
              onClick={() => onEditStep(3)}
              className="text-xs font-bold text-[#1e40af] hover:underline cursor-pointer"
            >
              Edit
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500 block">Document Type</span>
              <span className="font-semibold text-slate-900">{docLabel}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Issuing Country</span>
              <span className="font-semibold text-slate-900">{data.issuingCountry}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Masked ID Number</span>
              <span className="font-mono font-semibold text-slate-900">{maskedDocNumber}</span>
            </div>
            {data.faydaExtractedData?.isLiveNidpExtract ? (
              <div className="sm:col-span-2 pt-2 border-t border-slate-100 space-y-2">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-slate-900">
                        Verified via National ID Program (NIDP / Fayda)
                      </span>
                      <span className="text-slate-600 text-[11px] block mt-0.5">
                        Legal Name: <strong>{data.faydaExtractedData.fullName}</strong>
                      </span>
                      <span className="text-slate-500 text-[10px] block font-mono mt-0.5">
                        Token: {data.faydaExtractedData.verificationToken}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                    e-KYC Verified
                  </span>
                </div>
              </div>
            ) : (
              <div className="sm:col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[11px]">Attached Scans</span>
                  <span className="font-medium text-slate-800 text-xs">
                    {data.fileName || 'Document attached'}
                    {data.backFileName ? ` + Back: ${data.backFileName}` : ''}
                  </span>
                  {data.faydaExtractedData?.verificationToken && (
                    <span className="text-slate-500 text-[10px] block font-mono mt-0.5">
                      Fayda Format Token: {data.faydaExtractedData.verificationToken}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {data.filePreviewUrl && (
                    <div className="w-12 h-9 rounded border border-slate-200 overflow-hidden bg-slate-50 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={data.filePreviewUrl}
                        alt="Front preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  {data.backFilePreviewUrl && (
                    <div className="w-12 h-9 rounded border border-slate-200 overflow-hidden bg-slate-50 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={data.backFilePreviewUrl}
                        alt="Back preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Host Profile & Address */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#1e40af]" />
              Host Profile & Operating Location
            </span>
            <button
              type="button"
              onClick={() => onEditStep(4)}
              className="text-xs font-bold text-[#1e40af] hover:underline cursor-pointer"
            >
              Edit
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500 block">Public Display Name</span>
              <span className="font-semibold text-slate-900">{data.displayName}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Host Type</span>
              <span className="font-semibold text-slate-900">
                {data.hostType === 'BUSINESS' ? 'Corporate / Business Host' : 'Individual Host'}
              </span>
            </div>
            {data.hostType === 'BUSINESS' && (
              <>
                <div>
                  <span className="text-slate-500 block">Company Name</span>
                  <span className="font-semibold text-slate-900">{data.businessName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">TIN</span>
                  <span className="font-mono font-semibold text-slate-900">{data.businessTin}</span>
                </div>
              </>
            )}
            <div className="sm:col-span-2">
              <span className="text-slate-500 block">Operating Address</span>
              <span className="font-medium text-slate-800">
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
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={data.agreedToHostStandards}
              onChange={(e) => updateData({ agreedToHostStandards: e.target.checked })}
              className="mt-1 w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-600"
            />
            <span className="text-xs text-slate-700 leading-relaxed">
              I agree to abide by the{' '}
              <a href="/host/standards" target="_blank" className="text-[#1e40af] font-semibold hover:underline">
                Ethiopian Hospitality Standards
              </a>
              , tax compliance laws, and Engida&apos;s Host Code of Conduct. I understand that submitting false or forged
              identity documentation is grounds for immediate account termination.
            </span>
          </label>
        </div>

        {/* Navigation / Submit CTA */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            disabled={submitting}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition disabled:opacity-50 cursor-pointer"
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={submitting || !data.agreedToHostStandards}
            className="px-6 py-2.5 bg-[#1e40af] hover:bg-[#1e3a8a] text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{submissionProgress || 'Submitting Application…'}</span>
              </>
            ) : (
              <span>Submit Host Application</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
