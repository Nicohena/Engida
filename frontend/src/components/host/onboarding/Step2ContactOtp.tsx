'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Phone, ShieldCheck, AlertCircle, RefreshCw, CheckCircle2, Info } from 'lucide-react';
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
  const [selectedChannel, setSelectedChannel] = useState<'PHONE' | 'EMAIL'>(data.verificationChannel);
  const [loading, setLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(data.otpCooldownSeconds || 0);
  const [deliveryStatus, setDeliveryStatus] = useState<'IDLE' | 'DISPATCHED' | 'PROVIDER_UNCONFIGURED'>('IDLE');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const currentTarget = selectedChannel === 'PHONE' ? data.phone : data.email;

  // Handle countdown timer for resend throttling
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        const next = prev - 1;
        updateData({ otpCooldownSeconds: next });
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown, updateData]);

  // Request OTP from backend
  const handleSendCode = async () => {
    setError(null);
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await apiFetch<OtpSendResponse>('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({
          target: currentTarget,
          channel: selectedChannel,
          purpose: 'HOST_ONBOARDING',
        }),
        skipAuth: true,
      });

      setDeliveryStatus(res.deliveryStatus);
      setStatusMessage(res.message);

      if (res.deliveryStatus === 'DISPATCHED') {
        setCooldown(res.cooldownSeconds || 60);
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
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setError(null);
    setVerifyLoading(true);

    try {
      const res = await apiFetch<OtpVerifyResponse>('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          target: currentTarget,
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

  // When provider is unconfigured, acknowledge manual verification boundary
  const handleAcknowledgeManualVerification = () => {
    updateData({
      manualVerificationAcknowledged: true,
      verificationChannel: selectedChannel,
    });
    onContinue();
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Contact Verification
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Verify your primary contact details to ensure reliable communication with guests and platform administrators.
        </p>
      </div>

      {/* Channel Selection: Email vs Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            setSelectedChannel('PHONE');
            updateData({ verificationChannel: 'PHONE' });
            setError(null);
            setDeliveryStatus('IDLE');
          }}
          className={`p-4 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
            selectedChannel === 'PHONE'
              ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-100'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div
            className={`p-2 rounded-lg ${
              selectedChannel === 'PHONE' ? 'bg-[#1e40af] text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <Phone className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-900">Ethiopian Phone OTP</span>
            <span className="block text-xs text-slate-500 font-mono mt-0.5">{data.phone || 'Phone not set'}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedChannel('EMAIL');
            updateData({ verificationChannel: 'EMAIL' });
            setError(null);
            setDeliveryStatus('IDLE');
          }}
          className={`p-4 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
            selectedChannel === 'EMAIL'
              ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-100'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div
            className={`p-2 rounded-lg ${
              selectedChannel === 'EMAIL' ? 'bg-[#1e40af] text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-xs font-bold text-slate-900">Email Address OTP</span>
            <span className="block text-xs text-slate-500 font-mono mt-0.5">{data.email || 'Email not set'}</span>
          </div>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Initial Send Code Card */}
      {deliveryStatus === 'IDLE' && (
        <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-900">Server-Side Code Verification</p>
              <p className="text-xs text-slate-500 mt-0.5">
                We will send a 6-digit one-time code to{' '}
                <strong className="text-slate-800 font-mono">{currentTarget}</strong>. The code expires in 10 minutes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSendCode}
            disabled={loading || !currentTarget}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#1e40af] hover:bg-[#1e3a8a] text-white text-xs font-bold rounded-lg transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Checking Gateway…</span>
              </>
            ) : (
              <span>Send Verification Code</span>
            )}
          </button>
        </div>
      )}

      {/* REAL INTEGRATION BOUNDARY: Telecommunications Gateway Unconfigured in this Environment */}
      {deliveryStatus === 'PROVIDER_UNCONFIGURED' && (
        <div className="p-5 bg-amber-50/70 border border-amber-300 rounded-xl space-y-4">
          <div className="flex items-start gap-3 text-amber-900">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold tracking-tight">
                Telecommunications Delivery Gateway Not Configured
              </h3>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Automated dispatch via Ethio Telecom SMS or SMTP email transport is currently unconfigured in this
                environment. Per ENGIDA security standards, contact verification is never simulated or faked.
              </p>
              <p className="text-xs text-amber-800 mt-2 leading-relaxed">
                Your contact details (<strong className="font-mono text-slate-900">{currentTarget}</strong>) will be
                recorded in your host application and verified by platform administration during manual identity review.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              type="button"
              onClick={handleAcknowledgeManualVerification}
              className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-lg transition cursor-pointer"
            >
              Acknowledge & Proceed to Identity Verification →
            </button>
            <button
              type="button"
              onClick={() => setDeliveryStatus('IDLE')}
              className="px-4 py-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              Change Contact Details
            </button>
          </div>
        </div>
      )}

      {/* Active Code Verification Form (When Gateway Dispatched Real Code) */}
      {deliveryStatus === 'DISPATCHED' && (
        <form onSubmit={handleVerifyCode} className="p-5 bg-white border border-slate-200 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900">Enter 6-Digit Code</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Sent to <strong className="font-mono text-slate-800">{currentTarget}</strong>
              </p>
            </div>
            {statusMessage && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
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
              className="w-full text-center tracking-[0.5em] text-lg font-mono font-bold py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              autoFocus
              required
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-500">
              {cooldown > 0 ? (
                <>Resend available in <strong className="font-mono">{cooldown}s</strong></>
              ) : (
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loading}
                  className="text-[#1e40af] font-bold hover:underline cursor-pointer"
                >
                  Resend Code
                </button>
              )}
            </span>
            <span className="text-slate-400">Max 5 attempts</span>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={verifyLoading || data.otpCode.length !== 6}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {verifyLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Code…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify Code & Continue</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Navigation Footer */}
      <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
        >
          ← Back
        </button>

        {data.contactVerified && (
          <button
            type="button"
            onClick={onContinue}
            className="px-6 py-2.5 bg-[#1e40af] hover:bg-[#1e3a8a] text-white text-xs font-bold rounded-lg transition cursor-pointer"
          >
            Continue to Identity Verification →
          </button>
        )}
      </div>
    </div>
  );
}
