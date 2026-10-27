'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Phone, ShieldCheck, AlertCircle, RefreshCw, CheckCircle2, Lock } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { OnboardingFormData } from './types';

interface Step2ContactOtpProps {
  data: OnboardingFormData;
  updateData: (fields: Partial<OnboardingFormData>) => void;
  onBack: () => void;
  onContinue: () => void;
}

interface OtpSendResponse {
  success: boolean;
  deliveryStatus: 'DISPATCHED' | 'PROVIDER_UNCONFIGURED';
  message: string;
  target: string;
  cooldownSeconds?: number;
}

interface OtpVerifyResponse {
  verified: boolean;
  message: string;
}

export default function Step2ContactOtp({
  data,
  updateData,
  onBack,
  onContinue,
}: Step2ContactOtpProps) {
  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(data.otpCooldownSeconds || 0);
  const [deliveryStatus, setDeliveryStatus] = useState<'IDLE' | 'DISPATCHED'>(
    data.contactVerified ? 'DISPATCHED' : 'IDLE',
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const targetEmail = data.email?.trim() || '';

  // Handle countdown timer for resend throttling cleanly without mutating parent during render
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Request real email OTP from backend via Gmail SMTP
  const handleSendCode = async () => {
    if (!targetEmail) {
      setError('Please provide a valid email address in Step 1.');
      return;
    }

    setError(null);
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await apiFetch<OtpSendResponse>('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          target: targetEmail,
          channel: 'EMAIL',
          purpose: 'HOST_ONBOARDING',
        }),
        skipAuth: true,
      });

      if (res.deliveryStatus === 'DISPATCHED') {
        setDeliveryStatus('DISPATCHED');
        setStatusMessage(res.message || 'Verification code sent to your inbox.');
        setCooldown(res.cooldownSeconds || 60);
      } else {
        setError(res.message || 'Unable to dispatch verification email. Please check your SMTP configuration.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to request verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Verify entered OTP with backend
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.otpCode || data.otpCode.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setError(null);
    setVerifyLoading(true);

    try {
      const res = await apiFetch<OtpVerifyResponse>('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          target: targetEmail,
          code: data.otpCode,
          purpose: 'HOST_ONBOARDING',
        }),
        skipAuth: true,
      });

      if (res.verified) {
        updateData({ contactVerified: true });
        onContinue();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid or expired verification code.');
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#f2ece4] text-[#c2652a] uppercase tracking-wider border border-[#d8d0c8]/60">
            Mandatory Step
          </span>
          <span className="text-xs text-[#605850] font-medium flex items-center gap-1">
            <Lock className="w-3 h-3 text-[#605850]" /> Account Security
          </span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-[#3a302a] font-headline mt-2">
          Email Verification
        </h2>
        <p className="text-xs text-[#605850] mt-1 leading-relaxed">
          Email verification is required to confirm your identity and ensure you receive booking inquiries, reservation payouts, and official platform notifications.
        </p>
      </div>

      {/* Contact Channels Status Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Email Card (Active & Mandatory) */}
        <div className="p-4 rounded-xl border border-[#c2652a] bg-[#faf5ee] ring-2 ring-[#c2652a]/20 flex items-start gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-[#c2652a] text-white shrink-0 mt-0.5 shadow-2xs">
            <Mail className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="block text-xs font-bold text-[#3a302a]">Email Address</span>
              {data.contactVerified ? (
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              ) : (
                <span className="text-[10px] font-bold text-[#c2652a] bg-[#f2ece4] px-2 py-0.5 rounded-full border border-[#d8d0c8]/40">
                  Mandatory
                </span>
              )}
            </div>
            <span className="block text-xs text-[#3a302a] font-mono font-medium truncate mt-0.5">
              {targetEmail || 'No email provided'}
            </span>
          </div>
        </div>

        {/* Phone Card (Recorded on Profile, SMS on Hold) */}
        <div className="p-4 rounded-xl border border-[#d8d0c8] bg-white flex items-start gap-3 shadow-xs">
          <div className="p-2 rounded-lg bg-[#f2ece4] text-[#605850] shrink-0 mt-0.5">
            <Phone className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="block text-xs font-bold text-[#3a302a]">Mobile Phone</span>
              <span className="text-[10px] font-semibold text-[#605850] bg-[#f2ece4] px-2 py-0.5 rounded-full border border-[#d8d0c8]/40">
                On Profile
              </span>
            </div>
            <span className="block text-xs text-[#605850] font-mono truncate mt-0.5">
              {data.phone || 'Phone not set'}
            </span>
            <span className="block text-[11px] text-[#605850]/70 mt-1">
              SMS verification on hold for this release
            </span>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* Already Verified Banner */}
      {data.contactVerified ? (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-900">Email Address Confirmed</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Your email (<strong className="font-mono">{targetEmail}</strong>) has been successfully verified. You are ready to proceed with host details.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onContinue}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#c2652a] hover:bg-[#e08850] active:bg-[#a65320] text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Proceed to Host Details →</span>
          </button>
        </div>
      ) : (
        <>
          {/* Send Verification Code State */}
          {deliveryStatus === 'IDLE' && (
            <div className="p-5 bg-white border border-[#d8d0c8] rounded-xl space-y-4 shadow-sm">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#c2652a] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#3a302a]">Request Email Verification Code</p>
                  <p className="text-xs text-[#605850] mt-0.5 leading-relaxed">
                    Click the button below to dispatch a secure 6-digit one-time code to{' '}
                    <strong className="text-[#3a302a] font-mono">{targetEmail}</strong>. The code is valid for 10 minutes.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendCode}
                disabled={loading || !targetEmail}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#c2652a] hover:bg-[#e08850] active:bg-[#a65320] text-white text-xs font-bold rounded-lg transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching Code…</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send Verification Code</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Active Code Verification Form */}
          {deliveryStatus === 'DISPATCHED' && (
            <form onSubmit={handleVerifyCode} className="p-5 bg-white border border-[#d8d0c8] rounded-xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#3a302a]">Enter 6-Digit Verification Code</p>
                  <p className="text-xs text-[#605850] mt-0.5">
                    Sent to <strong className="font-mono text-[#3a302a]">{targetEmail}</strong>
                  </p>
                </div>
                {statusMessage && (
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                    {statusMessage}
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="otpCode" className="sr-only">
                  6-Digit Verification Code
                </label>
                <input
                  id="otpCode"
                  type="text"
                  maxLength={6}
                  value={data.otpCode}
                  onChange={(e) => updateData({ otpCode: e.target.value.replace(/[^\d]/g, '') })}
                  placeholder="123456"
                  className="w-full text-center tracking-[0.5em] text-lg font-mono font-bold py-3 border border-[#d8d0c8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c2652a]/30 focus:border-[#c2652a] bg-[#faf5ee] text-[#3a302a]"
                  autoFocus
                  required
                />
                <p className="text-[11px] text-[#605850] text-center mt-1.5">
                  Check your Gmail inbox and spam folder. Code expires in 10 minutes.
                </p>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#d8d0c8]/40">
                <span className="text-[#605850]">
                  {cooldown > 0 ? (
                    <>
                      Resend available in <strong className="font-mono text-[#3a302a]">{cooldown}s</strong>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={loading}
                      className="text-[#c2652a] font-bold hover:underline cursor-pointer"
                    >
                      Resend Code
                    </button>
                  )}
                </span>
                <span className="text-[#605850]/70">Max 5 attempts allowed</span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={verifyLoading || data.otpCode.length !== 6}
                  className="w-full py-2.5 bg-[#c2652a] hover:bg-[#e08850] active:bg-[#a65320] text-white text-xs font-bold rounded-lg transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  {verifyLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying Code…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify Email & Continue →</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {/* Navigation Footer */}
      <div className="pt-4 border-t border-[#d8d0c8]/60 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 border border-[#d8d0c8] bg-white hover:bg-[#f2ece4] text-[#3a302a] text-xs font-bold rounded-lg transition cursor-pointer shadow-xs"
        >
          ← Back to Account Details
        </button>

        {data.contactVerified && (
          <button
            type="button"
            onClick={onContinue}
            className="px-6 py-2.5 bg-[#c2652a] hover:bg-[#e08850] active:bg-[#a65320] text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-sm"
          >
            Continue to Host Details →
          </button>
        )}
      </div>
    </div>
  );
}
