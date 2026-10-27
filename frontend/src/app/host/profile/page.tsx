'use client';

import React, { useEffect, useState, useRef, useCallback, type FormEvent, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiFetch, formatDate } from '@/lib/api';
import type { HostProfile, HostVerificationStatus } from '@/types/host';
import {
  User as UserIcon,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Camera,
  Upload,
  Trash2,
  Landmark,
  Phone,
  Mail,
  Calendar,
  Building2,
  ExternalLink,
  Info,
  BadgeCheck,
  Sparkles,
} from 'lucide-react';

interface FormState {
  displayName: string;
  phone: string;
  bio: string;
  avatar: string;
}

interface FormErrors {
  displayName?: string;
  phone?: string;
  bio?: string;
  avatar?: string;
}

const EMPTY_FORM: FormState = {
  displayName: '',
  phone: '',
  bio: '',
  avatar: '',
};

export default function HostProfilePage() {
  const { user: authUser, refreshUser } = useAuth();
  const [profile, setProfile] = useState<HostProfile | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [requestingVerification, setRequestingVerification] = useState(false);

  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [onboardingNotice, setOnboardingNotice] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('onboarded') === 'true') {
        queueMicrotask(() => {
          setOnboardingNotice(true);
        });
      }
    }
  }, []);

  // Sync loaded profile into form state
  const syncProfileToForm = useCallback((data: HostProfile) => {
    setProfile(data);
    setForm({
      displayName: data.displayName ?? '',
      phone: data.phone ?? '',
      bio: data.bio ?? '',
      avatar: data.user?.avatar ?? authUser?.avatar ?? '',
    });
    setErrors({});
  }, [authUser?.avatar]);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        const data = await apiFetch<HostProfile>('/host/profile');
        if (!active) return;
        syncProfileToForm(data);
      } catch (err) {
        if (!active) return;
        setErrorBanner(
          err instanceof Error ? err.message : 'Unable to load your host profile.',
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    queueMicrotask(() => {
      if (active) {
        setLoading(true);
        setErrorBanner(null);
      }
    });

    void loadProfile();

    return () => {
      active = false;
    };
  }, [reloadKey, syncProfileToForm]);

  // Client-side validation
  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};

    const trimmedName = form.displayName.trim();
    if (!trimmedName) {
      nextErrors.displayName = 'Host display name is required.';
    } else if (trimmedName.length < 2) {
      nextErrors.displayName = 'Display name must be at least 2 characters.';
    } else if (trimmedName.length > 100) {
      nextErrors.displayName = 'Display name cannot exceed 100 characters.';
    }

    const trimmedPhone = form.phone.trim();
    if (trimmedPhone) {
      // Basic phone format check: allows international +251, digits, spaces, hyphens
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,20}$/;
      if (!phoneRegex.test(trimmedPhone)) {
        nextErrors.phone = 'Please enter a valid phone number (e.g., +251 91 123 4567).';
      } else if (trimmedPhone.length > 50) {
        nextErrors.phone = 'Phone number cannot exceed 50 characters.';
      }
    }

    if (form.bio.length > 500) {
      nextErrors.bio = 'Bio cannot exceed 500 characters.';
    }

    if (form.avatar.trim() && !form.avatar.startsWith('http://') && !form.avatar.startsWith('https://')) {
      nextErrors.avatar = 'Avatar must be a valid HTTP or HTTPS URL, or uploaded as an image file.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Handle avatar file upload via Cloudinary (/upload/image)
  const handleAvatarFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input value so same file can be selected again if needed
    e.target.value = '';

    // Validate mime type & size (max 5MB)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        avatar: 'Invalid file format. Please upload a JPEG, PNG, or WebP image.',
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        avatar: 'File size exceeds 5MB. Please choose a smaller image.',
      }));
      return;
    }

    setUploadingAvatar(true);
    setErrorBanner(null);
    setErrors((prev) => ({ ...prev, avatar: undefined }));

    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await apiFetch<{ secureUrl: string }>('/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (result?.secureUrl) {
        setForm((prev) => ({ ...prev, avatar: result.secureUrl }));
        setSuccessBanner('Photo uploaded successfully! Remember to save your profile changes.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to upload photo.';
      setErrors((prev) => ({ ...prev, avatar: msg }));
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Remove avatar photo
  const handleRemoveAvatar = () => {
    setForm((prev) => ({ ...prev, avatar: '' }));
    setErrors((prev) => ({ ...prev, avatar: undefined }));
  };

  // Submit profile settings
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile) return;

    if (!validateForm()) {
      setErrorBanner('Please resolve the errors highlighted below before saving.');
      return;
    }

    setSaving(true);
    setErrorBanner(null);
    setSuccessBanner(null);

    try {
      const updated = await apiFetch<HostProfile>('/host/profile', {
        method: 'PUT',
        body: JSON.stringify({
          displayName: form.displayName.trim(),
          phone: form.phone.trim() || null,
          bio: form.bio.trim() || null,
          avatar: form.avatar.trim() || null,
        }),
      });

      syncProfileToForm(updated);
      await refreshUser();
      setSuccessBanner('Your host profile has been updated successfully.');
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : 'Unable to update your host profile.',
      );
    } finally {
      setSaving(false);
    }
  };

  // Request verification transition (UNVERIFIED or REJECTED -> PENDING)
  const handleRequestVerification = async () => {
    if (!profile) return;

    // Pre-flight check
    const trimmedName = form.displayName.trim();
    const trimmedPhone = form.phone.trim();
    if (!trimmedName || !trimmedPhone) {
      setErrorBanner(
        'Both Display Name and Contact Phone are required before submitting for verification.',
      );
      setErrors((prev) => ({
        ...prev,
        displayName: !trimmedName ? 'Display name is required for verification.' : prev.displayName,
        phone: !trimmedPhone ? 'Contact phone is required for verification.' : prev.phone,
      }));
      return;
    }

    setRequestingVerification(true);
    setErrorBanner(null);
    setSuccessBanner(null);

    try {
      // First save any unsaved profile changes
      await apiFetch<HostProfile>('/host/profile', {
        method: 'PUT',
        body: JSON.stringify({
          displayName: trimmedName,
          phone: trimmedPhone || null,
          bio: form.bio.trim() || null,
          avatar: form.avatar.trim() || null,
        }),
      });

      // Submit verification request
      const updatedProfile = await apiFetch<HostProfile>('/host/profile/request-verification', {
        method: 'POST',
      });

      syncProfileToForm(updatedProfile);
      await refreshUser();
      setSuccessBanner(
        'Identity verification request submitted successfully! Your profile is now under review by the ENGIDA compliance team.',
      );
    } catch (err) {
      setErrorBanner(
        err instanceof Error ? err.message : 'Failed to submit verification request.',
      );
    } finally {
      setRequestingVerification(false);
    }
  };

  // Helper for status badge styling
  const getStatusBadge = (status: HostVerificationStatus) => {
    switch (status) {
      case 'VERIFIED':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: <BadgeCheck className="w-4 h-4 text-emerald-600" />,
          label: 'Verified Host',
        };
      case 'PENDING':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: <Clock className="w-4 h-4 text-amber-600" />,
          label: 'Verification Pending Review',
        };
      case 'REJECTED':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          icon: <AlertTriangle className="w-4 h-4 text-rose-600" />,
          label: 'Verification Rejected',
        };
      case 'UNVERIFIED':
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: <ShieldCheck className="w-4 h-4 text-slate-500" />,
          label: 'Unverified Host',
        };
    }
  };

  // Initials for avatar fallback
  const getInitials = () => {
    const source = form.displayName.trim() || profile?.user?.name || authUser?.name || 'Host';
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#d8d0c8]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f2ece4] text-[#c2652a] border border-[#d8d0c8] text-xs font-black uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Host Account & Identity</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#3a302a] tracking-tight">
            Host Profile & Verification Settings
          </h1>
          <p className="text-xs sm:text-sm text-[#605850] font-medium mt-1">
            Manage your public host identity, hospitality story, and check your trust & verification status.
          </p>
        </div>

        {profile && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {(() => {
              const badge = getStatusBadge(profile.verificationStatus);
              return (
                <div
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold border ${badge.bg}`}
                >
                  {badge.icon}
                  <span>{badge.label}</span>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Notifications */}
      {errorBanner && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 text-xs sm:text-sm font-medium animate-in fade-in"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Error</p>
            <p className="mt-0.5">{errorBanner}</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-red-500 hover:text-red-800 font-bold text-xs cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {successBanner && (
        <div
          role="status"
          className="flex items-start gap-3 p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs sm:text-sm font-medium animate-in fade-in"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Success</p>
            <p className="mt-0.5">{successBanner}</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold text-xs cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-[#d8d0c8] bg-white p-12 text-center text-[#605850] text-sm">
          <RotateCcw className="w-6 h-6 animate-spin mx-auto text-[#c2652a] mb-3" />
          Loading your host profile and verification details...
        </div>
      ) : profile ? (
        <div className="space-y-8">
          {/* Post-Onboarding Welcome & Continuity Notice */}
          {onboardingNotice && (
            <div
              role="region"
              aria-label="Host onboarding confirmation"
              className="flex items-start gap-3.5 p-4 sm:p-5 rounded-2xl border border-[#c2652a]/30 bg-[#f2ece4] text-[#3a302a] shadow-xs animate-in fade-in"
            >
              <div className="w-9 h-9 rounded-xl bg-[#c2652a]/15 text-[#c2652a] flex items-center justify-center shrink-0 mt-0.5 border border-[#c2652a]/20">
                <Sparkles className="w-5 h-5 text-[#c2652a]" />
              </div>
              <div className="flex-1 space-y-1">
                <h2 className="text-sm font-bold text-[#3a302a]">
                  Welcome to ENGIDA Hosting!
                </h2>
                <p className="text-xs text-[#605850] leading-relaxed">
                  Your host profile has been created with initial status <span className="font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#c2652a]/10 text-[#c2652a]">UNVERIFIED</span>. You can start drafting properties and setting your availability immediately. To display the official Verified Host badge on public listings, review your details below and click <strong>Submit for Verification Review</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOnboardingNotice(false)}
                className="text-[#c2652a] hover:text-[#e08850] text-xs font-bold shrink-0 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Card 1: Identity & Business Verification Hub */}
          <section className="rounded-2xl border border-[#d8d0c8] bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#f2ece4]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#f2ece4] text-[#c2652a] flex items-center justify-center shrink-0 border border-[#d8d0c8]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[#3a302a] flex items-center gap-2">
                    <span>Identity & Trust Verification</span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        getStatusBadge(profile.verificationStatus).bg
                      }`}
                    >
                      {profile.verificationStatus}
                    </span>
                  </h2>
                  <p className="text-xs text-[#605850]">
                    Verified hosts gain prominent badges on published listings and increase guest reservation confidence.
                  </p>
                </div>
              </div>
            </div>

            {/* Dynamic Status Display & Actions */}
            {profile.verificationStatus === 'VERIFIED' && (
              <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 space-y-3">
                <div className="flex items-center gap-2.5">
                  <BadgeCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-black text-emerald-900">
                    Host Identity Fully Verified
                  </h3>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Your host identity and compliance records have been approved by the ENGIDA trust &amp; safety team. Your published listings proudly display the Verified Host trust badge to guests across Addis Ababa and Ethiopia.
                </p>
              </div>
            )}

            {profile.verificationStatus === 'PENDING' && (
              <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/70 space-y-3">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                  <h3 className="text-sm font-black text-amber-900">
                    Verification Request Under Administrative Review
                  </h3>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Your verification request has been queued and is actively being reviewed by the ENGIDA compliance team. We verify host credentials against platform trust standards. No further action is required from you at this time.
                </p>
              </div>
            )}

            {profile.verificationStatus === 'REJECTED' && (
              <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/70 space-y-4">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <h3 className="text-sm font-black text-rose-900">
                    Previous Verification Submission Was Not Approved
                  </h3>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed">
                  Your previous verification request could not be approved. Please review your public host profile details below—especially your display name and contact phone number—update any inaccurate information, and resubmit for review.
                </p>
                {profile.rejectionReason && (
                  <div className="p-3.5 rounded-xl bg-white border border-rose-200 text-xs text-rose-900 space-y-1">
                    <p className="font-bold">Compliance Team Feedback:</p>
                    <p className="text-slate-700 font-medium">{profile.rejectionReason}</p>
                  </div>
                )}
                <div>
                  <button
                    type="button"
                    disabled={requestingVerification || saving}
                    onClick={handleRequestVerification}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    {requestingVerification ? (
                      <>
                        <RotateCcw className="w-4 h-4 animate-spin" />
                        <span>Submitting Resubmission...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Resubmit for Administrative Review</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {profile.verificationStatus === 'UNVERIFIED' && (
              <div className="p-5 rounded-2xl border border-[#d8d0c8] bg-[#faf5ee] space-y-4">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-[#c2652a]" />
                  <h3 className="text-sm font-black text-[#3a302a]">
                    Get Your Host Profile Verified
                  </h3>
                </div>
                <p className="text-xs text-[#605850] leading-relaxed">
                  Verified hosts receive higher placement in search results, guest trust badges, and increased bookings. Make sure your display name and phone number below are complete, then submit your request for compliance review.
                </p>
                <div>
                  <button
                    type="button"
                    disabled={requestingVerification || saving}
                    onClick={handleRequestVerification}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#e08850] active:bg-[#a65320] text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    {requestingVerification ? (
                      <>
                        <RotateCcw className="w-4 h-4 animate-spin" />
                        <span>Submitting Verification Request...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Submit for Verification Review</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Truthful Infrastructure Disclosure (as requested in Step 5J prompt) */}
            <div className="flex items-start gap-3 p-4 rounded-xl border border-[#d8d0c8] bg-[#f2ece4]/50 text-[11px] text-[#605850]">
              <Info className="w-4 h-4 text-[#c2652a] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-[#3a302a]">
                  Administrative Review Workflow &amp; Document Infrastructure Note
                </p>
                <p>
                  ENGIDA is actively developing an end-to-end encrypted document vault for national identity cards (Kebele ID / Passport) and business licenses. Currently, host verification requests are processed administratively by authorized platform administrators without exposing unverified documents to the public. Hosts cannot self-verify.
                </p>
              </div>
            </div>
          </section>

          {/* Card 2: Public Host Identity & Profile Settings */}
          <form onSubmit={handleSubmit} className="space-y-8">
            <section className="rounded-2xl border border-[#d8d0c8] bg-white p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-[#f2ece4]">
                <div className="w-10 h-10 rounded-xl bg-[#f2ece4] text-[#c2652a] flex items-center justify-center shrink-0 border border-[#d8d0c8]">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[#3a302a]">Public Host Profile</h2>
                  <p className="text-xs text-[#605850]">
                    This information is displayed on your published listings and visible to prospective guests.
                  </p>
                </div>
              </div>

              {/* Profile Photo / Avatar Section */}
              <div className="p-5 rounded-2xl bg-[#faf5ee] border border-[#d8d0c8] space-y-4">
                <label className="block text-xs font-bold text-[#3a302a] uppercase tracking-wider">
                  Host Profile Photo
                </label>

                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  {/* Avatar Visual Preview */}
                  <div className="relative shrink-0">
                    <div className="w-24 h-24 rounded-2xl border-2 border-[#d8d0c8] bg-gradient-to-br from-[#c2652a] to-[#a65320] text-white flex items-center justify-center text-2xl font-black shadow-inner overflow-hidden">
                      {form.avatar ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={form.avatar}
                          alt="Host Avatar"
                          className="w-full h-full object-cover"
                          onError={() => {
                            setErrors((prev) => ({
                              ...prev,
                              avatar: 'Failed to load avatar from URL. Image may be broken.',
                            }));
                          }}
                        />
                      ) : (
                        <span>{getInitials()}</span>
                      )}
                    </div>

                    {uploadingAvatar && (
                      <div className="absolute inset-0 rounded-2xl bg-black/50 backdrop-blur-xs flex items-center justify-center text-white">
                        <RotateCcw className="w-6 h-6 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Avatar Actions */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarFileChange}
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                      />

                      <button
                        type="button"
                        disabled={uploadingAvatar || saving}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#d8d0c8] hover:bg-[#f2ece4] text-[#3a302a] text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
                      >
                        <Camera className="w-4 h-4 text-[#c2652a]" />
                        <span>{uploadingAvatar ? 'Uploading...' : 'Upload Photo'}</span>
                      </button>

                      {form.avatar && (
                        <button
                          type="button"
                          disabled={uploadingAvatar || saving}
                          onClick={handleRemoveAvatar}
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-[#605850]">
                      Upload a friendly photo of yourself (JPEG, PNG, or WebP up to 5MB). Direct image URLs are also supported.
                    </p>

                    {/* Direct URL input fallback */}
                    <div className="pt-1">
                      <input
                        type="url"
                        value={form.avatar}
                        onChange={(e) => {
                          setForm((prev) => ({ ...prev, avatar: e.target.value }));
                          setErrors((prev) => ({ ...prev, avatar: undefined }));
                        }}
                        placeholder="Or enter direct image URL (https://...)"
                        className={`w-full rounded-xl border bg-white px-3.5 py-2 text-xs text-[#3a302a] placeholder-[#605850]/50 focus:outline-none focus:ring-2 focus:ring-[#c2652a]/20 focus:border-[#c2652a] ${
                          errors.avatar ? 'border-red-300' : 'border-[#d8d0c8]'
                        }`}
                      />
                    </div>

                    {errors.avatar && (
                      <p className="text-xs text-red-600 font-semibold">{errors.avatar}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Read-only Legal Account Information */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[#faf5ee] border border-[#d8d0c8]/60 text-xs">
                <div className="flex items-center gap-2.5">
                  <UserIcon className="w-4 h-4 text-[#605850] shrink-0" />
                  <div>
                    <span className="block text-[10px] font-bold text-[#605850] uppercase">
                      Legal Account Name
                    </span>
                    <span className="font-bold text-[#3a302a]">
                      {profile.user?.name || authUser?.name || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#605850] shrink-0" />
                  <div>
                    <span className="block text-[10px] font-bold text-[#605850] uppercase">
                      Account Email
                    </span>
                    <span className="font-bold text-[#3a302a] truncate max-w-[180px] block">
                      {profile.user?.email || authUser?.email || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-[#605850] shrink-0" />
                  <div>
                    <span className="block text-[10px] font-bold text-[#605850] uppercase">
                      Host Since
                    </span>
                    <span className="font-bold text-[#3a302a]">
                      {profile.createdAt ? formatDate(profile.createdAt) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Display Name */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label
                      htmlFor="displayName"
                      className="block text-xs font-bold text-[#3a302a] uppercase tracking-wider"
                    >
                      Host Display Name *
                    </label>
                    <span className="text-[10px] font-bold text-[#605850]">
                      Public to guests
                    </span>
                  </div>
                  <input
                    id="displayName"
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    value={form.displayName}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, displayName: e.target.value }));
                      if (errors.displayName) {
                        setErrors((prev) => ({ ...prev, displayName: undefined }));
                      }
                    }}
                    placeholder="e.g. Almaz Hospitality"
                    className={`w-full rounded-xl border px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#3a302a] focus:outline-none focus:ring-2 focus:ring-[#c2652a]/20 ${
                      errors.displayName
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-[#d8d0c8] focus:border-[#c2652a]'
                    }`}
                  />
                  {errors.displayName && (
                    <p className="mt-1 text-xs text-red-600 font-semibold">
                      {errors.displayName}
                    </p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label
                      htmlFor="phone"
                      className="block text-xs font-bold text-[#3a302a] uppercase tracking-wider"
                    >
                      Contact Phone Number
                    </label>
                    <span className="text-[10px] font-bold text-[#605850]">
                      Required for verification
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      id="phone"
                      type="tel"
                      maxLength={50}
                      value={form.phone}
                      onChange={(e) => {
                        setForm((prev) => ({ ...prev, phone: e.target.value }));
                        if (errors.phone) {
                          setErrors((prev) => ({ ...prev, phone: undefined }));
                        }
                      }}
                      placeholder="+251 91 123 4567"
                      className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold text-[#3a302a] focus:outline-none focus:ring-2 focus:ring-[#c2652a]/20 ${
                        errors.phone
                          ? 'border-red-300 focus:border-red-500'
                          : 'border-[#d8d0c8] focus:border-[#c2652a]'
                      }`}
                    />
                    <Phone className="w-4 h-4 text-[#605850] absolute left-3.5 top-3" />
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-xs text-red-600 font-semibold">{errors.phone}</p>
                  )}
                </div>

                {/* Host Bio */}
                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-1.5">
                    <label
                      htmlFor="bio"
                      className="block text-xs font-bold text-[#3a302a] uppercase tracking-wider"
                    >
                      Host Biography &amp; Hospitality Story
                    </label>
                    <span
                      className={`text-[11px] font-bold ${
                        form.bio.length > 450 ? 'text-amber-600' : 'text-[#605850]'
                      }`}
                    >
                      {form.bio.length} / 500 characters
                    </span>
                  </div>
                  <textarea
                    id="bio"
                    rows={4}
                    maxLength={500}
                    value={form.bio}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, bio: e.target.value }));
                      if (errors.bio) {
                        setErrors((prev) => ({ ...prev, bio: undefined }));
                      }
                    }}
                    placeholder="Tell guests about your background, hosting hospitality, neighborhood tips, and what makes your stays in Ethiopia special..."
                    className={`w-full rounded-xl border px-4 py-2.5 text-xs sm:text-sm text-[#3a302a] focus:outline-none focus:ring-2 focus:ring-[#c2652a]/20 resize-y ${
                      errors.bio
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-[#d8d0c8] focus:border-[#c2652a]'
                    }`}
                  />
                  {errors.bio && (
                    <p className="mt-1 text-xs text-red-600 font-semibold">{errors.bio}</p>
                  )}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-[#f2ece4]">
                <button
                  type="button"
                  disabled={saving || uploadingAvatar}
                  onClick={() => profile && syncProfileToForm(profile)}
                  className="px-5 py-2.5 rounded-xl border border-[#d8d0c8] bg-white hover:bg-[#f2ece4] text-xs sm:text-sm font-bold text-[#3a302a] transition cursor-pointer disabled:opacity-50"
                >
                  Reset Changes
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingAvatar}
                  className="px-6 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#e08850] active:bg-[#a65320] text-white text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
              </div>
            </section>
          </form>

          {/* Card 3: Payout & Financial Settlement Information (Truthful Status per Step 5J prompt) */}
          <section className="rounded-2xl border border-[#d8d0c8] bg-white p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#f2ece4]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-50 to-teal-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-[#3a302a] flex items-center gap-2">
                    <span>Payout &amp; Settlement Information</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#f2ece4] text-[#605850] border border-[#d8d0c8]">
                      Disbursement Policy
                    </span>
                  </h2>
                  <p className="text-xs text-[#605850]">
                    How rental earnings are collected, secured, and disbursed for your properties.
                  </p>
                </div>
              </div>

              <Link
                href="/host/earnings"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#c2652a] hover:text-[#e08850] hover:underline self-start sm:self-auto"
              >
                <span>View Earnings Summary</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-5 rounded-2xl bg-[#faf5ee] border border-[#d8d0c8] space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-[#3a302a] uppercase tracking-wider">
                <Info className="w-4 h-4 text-[#c2652a]" />
                <span>Automated Direct Payouts Currently Unsupported</span>
              </div>
              <p className="text-xs text-[#605850] leading-relaxed">
                As detailed on the host earnings dashboard, automated bank transfers and direct mobile-money wallet payouts (Telebirr / CBE Birr) are currently unsupported in this release. All guest payments are safely collected and escrowed via Chapa according to platform reservation policies.
              </p>
              <p className="text-xs text-[#605850] leading-relaxed">
                To protect your financial security, ENGIDA does not collect, store, or solicit unencrypted bank account numbers or mobile-money PINs on this page. Settlement schedules and administrative disbursements will be coordinated with verified hosts directly.
              </p>
            </div>
          </section>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#d8d0c8] bg-white p-10 text-center max-w-md mx-auto">
          <Building2 className="w-12 h-12 text-[#605850]/60 mx-auto mb-4" />
          <h2 className="text-lg font-black text-[#3a302a]">Host Profile Unavailable</h2>
          <p className="mt-2 text-xs sm:text-sm text-[#605850]">
            We could not load the host profile connected to your account.
          </p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="mt-6 px-5 py-2.5 rounded-xl bg-[#c2652a] hover:bg-[#e08850] active:bg-[#a65320] text-white text-xs font-bold transition cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
