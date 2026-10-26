'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, CheckCircle2, AlertCircle, Lock, Mail, Phone, User as UserIcon } from 'lucide-react';
import {
  COUNTRY_DIAL_CODES,
  parsePhoneNumber,
  formatToE164,
  type OnboardingFormData,
} from './types';
import CountryCodePicker from './CountryCodePicker';
import type { User } from '@/context/AuthContext';

interface Step1AccountProps {
  data: OnboardingFormData;
  updateData: (fields: Partial<OnboardingFormData>) => void;
  currentUser: User | null;
  onLoginRequest?: (email: string, pass: string) => Promise<void>;
  onContinue: () => void;
}

export default function Step1Account({
  data,
  updateData,
  currentUser,
  onLoginRequest,
  onContinue,
}: Step1AccountProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isExistingUserLogin, setIsExistingUserLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Parse initial country dial code and national number from data.phone
  const parsedPhone = parsePhoneNumber(data.phone);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(parsedPhone.countryCode);
  const [nationalNumber, setNationalNumber] = useState<string>(parsedPhone.nationalNumber);

  const currentCountry =
    COUNTRY_DIAL_CODES.find((c) => c.code === selectedCountryCode) || COUNTRY_DIAL_CODES[0];

  const handleCountryChange = (newCountryCode: string) => {
    setSelectedCountryCode(newCountryCode);
    const cfg = COUNTRY_DIAL_CODES.find((c) => c.code === newCountryCode) || COUNTRY_DIAL_CODES[0];
    const full = formatToE164(cfg.dialCode, nationalNumber);
    updateData({ phone: full });
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
  };

  const handleNationalNumberChange = (rawInput: string) => {
    let clean = rawInput.replace(/[^\d]/g, '');
    // Auto-strip leading zeros (e.g. 0911... -> 911... in Ethiopia, 079... -> 79... in UK)
    if (clean.startsWith('0') && currentCountry.code !== 'OTHER') {
      clean = clean.replace(/^0+/, '');
    }
    setNationalNumber(clean);
    const full = formatToE164(currentCountry.dialCode, clean);
    updateData({ phone: full });
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!currentUser) {
      if (!data.fullName.trim() || data.fullName.trim().length < 3) {
        newErrors.fullName = 'Full legal name must be at least 3 characters.';
      }
      if (!data.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
        newErrors.email = 'Please provide a valid email address.';
      }
      if (!data.password || data.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters long.';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password)) {
        newErrors.password = 'Password must include uppercase, lowercase, and a number.';
      }
      if (data.password !== data.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match.';
      }
    }

    // Phone validation (Ethiopian or International mobile phone)
    const phoneDigits = nationalNumber.replace(/[^\d]/g, '');
    if (!phoneDigits) {
      newErrors.phone = 'Mobile phone number is required.';
    } else if (currentCountry.pattern && !currentCountry.pattern.test(phoneDigits)) {
      newErrors.phone = `Invalid ${currentCountry.name} number. ${currentCountry.formatHint || `${currentCountry.minLength} digits expected`}.`;
    } else if (phoneDigits.length < currentCountry.minLength || phoneDigits.length > currentCountry.maxLength) {
      newErrors.phone = `Phone number must be between ${currentCountry.minLength} and ${currentCountry.maxLength} digits for ${currentCountry.name}.`;
    }

    if (!data.agreedToTerms) {
      newErrors.agreedToTerms = 'You must agree to the Terms of Service and Host Policies.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onContinue();
    }
  };

  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onLoginRequest) return;
    setLoginError(null);
    if (!loginEmail || !loginPassword) {
      setLoginError('Please enter both email and password.');
      return;
    }
    setLoginLoading(true);
    try {
      await onLoginRequest(loginEmail.trim(), loginPassword);
      setIsExistingUserLogin(false);
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Invalid login credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Existing User Upgrade Banner */}
      {currentUser ? (
        <div className="mb-6 p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold">Existing Account Verified</p>
              <p className="text-xs text-blue-800 mt-0.5">
                Logged in as <strong className="font-semibold">{currentUser.name}</strong> ({currentUser.email}).
                You are upgrading this account to a verified Host.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <span className="text-slate-600">Already registered on Engida?</span>
          <button
            type="button"
            onClick={() => setIsExistingUserLogin(!isExistingUserLogin)}
            className="font-bold text-[#1e40af] hover:underline cursor-pointer"
          >
            {isExistingUserLogin ? 'Create new host account instead' : 'Sign in to upgrade existing account'}
          </button>
        </div>
      )}

      {/* Inline Login Form for Existing Users */}
      {isExistingUserLogin && !currentUser && (
        <form onSubmit={handleInlineLogin} className="mb-8 p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Sign in to your Engida Account</h3>
          <p className="text-xs text-slate-500 mb-4">
            Sign in with your existing account credentials to upgrade directly to host status.
          </p>

          {loginError && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{loginError}</span>
            </div>
          )}

          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loginLoading}
              className="px-4 py-2 bg-[#1e40af] hover:bg-[#1e3a8a] text-white text-xs font-bold rounded-lg transition disabled:opacity-50 cursor-pointer"
            >
              {loginLoading ? 'Signing in…' : 'Sign in & Upgrade'}
            </button>
            <button
              type="button"
              onClick={() => setIsExistingUserLogin(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Step 1 Account Details Form */}
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {currentUser ? 'Confirm Account Information' : 'Create Your Host Account'}
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            {currentUser
              ? 'Confirm your legal identity and contact details for host verification.'
              : 'Enter your legal account details. This information is verified against government records.'}
          </p>
        </div>

        {/* Full Legal Name */}
        <div>
          <label htmlFor="fullName" className="block text-xs font-bold text-slate-700 mb-1">
            Full Legal Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <UserIcon className="w-4 h-4" />
            </div>
            <input
              id="fullName"
              type="text"
              value={currentUser ? currentUser.name : data.fullName}
              disabled={Boolean(currentUser)}
              onChange={(e) => updateData({ fullName: e.target.value })}
              placeholder="e.g. Almaz Bekele Hailu"
              className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition ${
                currentUser
                  ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed'
                  : errors.fullName
                  ? 'border-rose-400 bg-rose-50/30'
                  : 'border-slate-300 bg-white'
              }`}
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? 'fullName-error' : undefined}
            />
          </div>
          {errors.fullName && (
            <p id="fullName-error" className="text-xs text-rose-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.fullName}</span>
            </p>
          )}
          <span className="text-[11px] text-slate-500 block mt-0.5">
            Must match the legal name on your national ID or passport.
          </span>
        </div>

        {/* Email Address */}
        <div>
          <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1">
            Email Address <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="email"
              type="email"
              value={currentUser ? currentUser.email : data.email}
              disabled={Boolean(currentUser)}
              onChange={(e) => updateData({ email: e.target.value })}
              placeholder="almaz@example.com"
              className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition ${
                currentUser
                  ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed'
                  : errors.email
                  ? 'border-rose-400 bg-rose-50/30'
                  : 'border-slate-300 bg-white'
              }`}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
          </div>
          {errors.email && (
            <p id="email-error" className="text-xs text-rose-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.email}</span>
            </p>
          )}
        </div>

        {/* Mobile Phone Number (Country Dial Code + National Number) */}
        <div>
          <label htmlFor="nationalPhone" className="block text-xs font-bold text-slate-700 mb-1">
            Mobile Phone Number <span className="text-rose-500">*</span>
          </label>
          <div className="flex gap-2">
            {/* Country Dial Code Dropdown with Real SVG Flags */}
            <CountryCodePicker
              selectedCountryCode={selectedCountryCode}
              onSelectCountry={handleCountryChange}
            />

            {/* National Number Input */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                id="nationalPhone"
                type="tel"
                inputMode="numeric"
                value={nationalNumber}
                onChange={(e) => handleNationalNumberChange(e.target.value)}
                placeholder={currentCountry.placeholder}
                className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition font-mono ${
                  errors.phone ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300 bg-white'
                }`}
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? 'phone-error' : undefined}
              />
            </div>
          </div>

          {/* Standard E.164 preview */}
          {nationalNumber && (
            <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1.5">
              <span>Standard E.164:</span>
              <span className="font-mono font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                {formatToE164(currentCountry.dialCode, nationalNumber)}
              </span>
            </div>
          )}

          {errors.phone && (
            <p id="phone-error" className="text-xs text-rose-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.phone}</span>
            </p>
          )}
          <span className="text-[11px] text-slate-500 block mt-0.5">
            Select your country code and enter your mobile number. Used for urgent host-guest booking communications and account recovery.
          </span>
        </div>

        {/* Password fields (unauthenticated registration only) */}
        {!currentUser && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-700 mb-1">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={data.password}
                  onChange={(e) => updateData({ password: e.target.value })}
                  placeholder="At least 8 characters"
                  className={`w-full pl-9 pr-10 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition ${
                    errors.password ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300 bg-white'
                  }`}
                  aria-invalid={Boolean(errors.password)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.password}</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-bold text-slate-700 mb-1">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={data.confirmPassword}
                  onChange={(e) => updateData({ confirmPassword: e.target.value })}
                  placeholder="Repeat password"
                  className={`w-full pl-9 pr-10 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition ${
                    errors.confirmPassword ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300 bg-white'
                  }`}
                  aria-invalid={Boolean(errors.confirmPassword)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.confirmPassword}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Terms and Host Policy Agreement */}
        <div className="pt-2">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={data.agreedToTerms}
              onChange={(e) => updateData({ agreedToTerms: e.target.checked })}
              className="mt-1 w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-600"
            />
            <span className="text-xs text-slate-600 leading-relaxed">
              I agree to Engida&apos;s{' '}
              <a href="/terms" target="_blank" className="text-[#1e40af] font-semibold hover:underline">
                Terms of Service
              </a>
              ,{' '}
              <a href="/privacy" target="_blank" className="text-[#1e40af] font-semibold hover:underline">
                Privacy Policy
              </a>
              , and{' '}
              <a href="/host/guidelines" target="_blank" className="text-[#1e40af] font-semibold hover:underline">
                Host Community Standards
              </a>
              . I certify that all registration information provided is accurate and true.
            </span>
          </label>
          {errors.agreedToTerms && (
            <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.agreedToTerms}</span>
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="pt-4 flex items-center justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#1e40af] hover:bg-[#1e3a8a] text-white text-sm font-bold rounded-lg shadow-sm transition cursor-pointer"
          >
            Continue to Contact Verification →
          </button>
        </div>
      </form>
    </div>
  );
}
