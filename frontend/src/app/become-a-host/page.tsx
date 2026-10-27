'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Building2, Save, HelpCircle, ArrowRight, Clock, AlertTriangle } from 'lucide-react';
import StepIndicator from '@/components/host/onboarding/StepIndicator';
import Step1Account from '@/components/host/onboarding/Step1Account';
import Step2ContactOtp from '@/components/host/onboarding/Step2ContactOtp';
import Step4HostDetails from '@/components/host/onboarding/Step4HostDetails';
import Step5ReviewSubmit from '@/components/host/onboarding/Step5ReviewSubmit';
import {
  INITIAL_ONBOARDING_STATE,
  type OnboardingFormData,
} from '@/components/host/onboarding/types';
import type { HostProfile } from '@/types/host';

export default function BecomeAHostWizardPage() {
  const { user, login, register, refreshUser, setHostProfile } = useAuth();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [formData, setFormData] = useState<OnboardingFormData>(INITIAL_ONBOARDING_STATE);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Restore draft state from sessionStorage after initial client mount to prevent SSR hydration mismatch
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('engida_host_onboarding_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setFormData((prev) => ({
            ...prev,
            ...parsed,
            verificationChannel: 'EMAIL',
          }));
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Sync state changes with current user if logged in
  useEffect(() => {
    if (user) {
      queueMicrotask(() => {
        setFormData((prev) => ({
          ...prev,
          fullName: prev.fullName || user.name,
          email: prev.email || user.email,
          displayName: prev.displayName || user.name,
          isExistingUser: true,
        }));
      });
    }
  }, [user]);

  // Save draft state to sessionStorage
  const handleSaveDraft = () => {
    try {
      sessionStorage.setItem('engida_host_onboarding_state', JSON.stringify(formData));
      setSaveToast('Progress saved locally. You can resume at any time.');
      setTimeout(() => setSaveToast(null), 4000);
    } catch {
      setSaveToast('Unable to access local browser storage.');
      setTimeout(() => setSaveToast(null), 4000);
    }
  };

  const updateFormData = useCallback((fields: Partial<OnboardingFormData>) => {
    setFormData((prev) => {
      const updated = { ...prev, ...fields };
      try {
        sessionStorage.setItem('engida_host_onboarding_state', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  const handleNextStep = (stepNumber: number) => {
    setCompletedSteps((prev) => (prev.includes(currentStep) ? prev : [...prev, currentStep]));
    setCurrentStep(stepNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackStep = (stepNumber: number) => {
    setCurrentStep(stepNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleHostProfileCreated = (profile: HostProfile) => {
    setHostProfile(profile);
    void refreshUser();
  };

  // If user is already a VERIFIED host, offer quick dashboard jump
  if (user?.hostProfile && user.hostProfile.verificationStatus === 'VERIFIED') {
    return (
      <div className="min-h-screen bg-[#faf5ee] text-[#3a302a] flex flex-col justify-between selection:bg-[#c2652a]/20 selection:text-[#c2652a]">
        <header className="bg-[#faf5ee]/95 backdrop-blur-md border-b border-[#d8d0c8]/60 py-3.5 px-6 lg:px-12 shadow-[0_1px_8px_rgba(58,48,42,0.04)]">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-[#c2652a] flex items-center justify-center text-white shadow-xs group-hover:bg-[#e08850] transition">
                <Building2 className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span className="font-extrabold text-base text-[#3a302a] group-hover:text-[#c2652a] transition-colors">
                Engida Host Portal
              </span>
            </Link>
          </div>
        </header>

        <main className="max-w-lg mx-auto p-6 sm:p-8 bg-white border border-[#d8d0c8] rounded-2xl shadow-xs text-center space-y-4 my-auto">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#3a302a]">You Are Already a Verified Host</h2>
          <p className="text-xs text-[#605850] leading-relaxed">
            Your host profile is active and fully verified. You can access your listings, reservations, and financial
            reports in the Host Dashboard.
          </p>
          <div className="pt-2">
            <Link
              href="/host/dashboard"
              className="w-full py-2.5 px-4 bg-[#c2652a] hover:bg-[#e08850] active:bg-[#a65320] text-white text-xs font-bold rounded-lg transition inline-flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Go to Host Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </main>

        <footer className="py-4 text-center text-xs text-[#605850]">
          © {new Date().getFullYear()} Engida Ethiopia. All rights reserved.
        </footer>
      </div>
    );
  }

  // If user is already PENDING review, show clear status feedback
  if (user?.hostProfile && user.hostProfile.verificationStatus === 'PENDING') {
    return (
      <div className="min-h-screen bg-[#faf5ee] text-[#3a302a] flex flex-col justify-between selection:bg-[#c2652a]/20 selection:text-[#c2652a]">
        <header className="bg-[#faf5ee]/95 backdrop-blur-md border-b border-[#d8d0c8]/60 py-3.5 px-6 lg:px-12 shadow-[0_1px_8px_rgba(58,48,42,0.04)]">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-[#c2652a] flex items-center justify-center text-white shadow-xs group-hover:bg-[#e08850] transition">
                <Building2 className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span className="font-extrabold text-base text-[#3a302a] group-hover:text-[#c2652a] transition-colors">
                Engida Host Portal
              </span>
            </Link>
          </div>
        </header>

        <main className="max-w-lg mx-auto p-6 sm:p-8 bg-white border border-[#d8d0c8] rounded-2xl shadow-xs text-center space-y-4 my-auto">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <span className="inline-block px-3 py-1 bg-[#f2ece4] border border-[#d8d0c8] text-[#c2652a] rounded-full text-xs font-bold uppercase tracking-wider">
            Verification Pending Review
          </span>
          <h2 className="text-xl font-bold text-[#3a302a]">Application Under Review</h2>
          <p className="text-xs text-[#605850] leading-relaxed">
            Your host profile and identity documentation have been submitted and are currently in the administrative
            verification queue. You can prepare and edit listing drafts in the meantime.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <Link
              href="/host/dashboard"
              className="flex-1 py-2.5 px-4 bg-[#c2652a] hover:bg-[#e08850] active:bg-[#a65320] text-white text-xs font-bold rounded-lg transition inline-flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Go to Host Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/host/profile"
              className="py-2.5 px-4 bg-[#f2ece4] hover:bg-[#d8d0c8] text-[#3a302a] text-xs font-bold rounded-lg transition inline-flex items-center justify-center"
            >
              View Profile
            </Link>
          </div>
        </main>

        <footer className="py-4 text-center text-xs text-[#605850]">
          © {new Date().getFullYear()} Engida Ethiopia. All rights reserved.
        </footer>
      </div>
    );
  }

  // If user was REJECTED, show rejection explanation banner and allow correcting info
  const rejectionNotice =
    user?.hostProfile && user.hostProfile.verificationStatus === 'REJECTED' ? (
      <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
        <div className="flex items-center gap-2 font-bold text-xs text-rose-800">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>Previous Verification Submission Was Rejected</span>
        </div>
        <p className="text-xs text-rose-700 leading-relaxed">
          Reason:{' '}
          <strong className="font-semibold">
            {user.hostProfile.rejectionReason || 'Please review and resubmit valid identity credentials.'}
          </strong>
        </p>
        <p className="text-[11px] text-rose-600 pt-1">
          You may correct your identity document and host details below to resubmit for administrative approval.
        </p>
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-[#faf5ee] text-[#3a302a] flex flex-col justify-between selection:bg-[#c2652a]/20 selection:text-[#c2652a]">
      {/* ── Top Portal Navigation Bar ── */}
      <header className="sticky top-0 z-40 bg-[#faf5ee]/95 backdrop-blur-md border-b border-[#d8d0c8]/60 py-3.5 px-4 sm:px-8 shadow-[0_1px_8px_rgba(58,48,42,0.04)]">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#c2652a] flex items-center justify-center text-white shadow-xs group-hover:bg-[#e08850] transition">
              <Building2 className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-[#3a302a] leading-none block font-headline group-hover:text-[#c2652a] transition-colors">
                Engida
              </span>
              <span className="text-[10px] font-bold text-[#c2652a] uppercase tracking-widest leading-none">
                Host Onboarding
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border border-[#d8d0c8] bg-white hover:bg-[#f2ece4] rounded-lg text-xs font-semibold text-[#3a302a] transition cursor-pointer shadow-xs"
              title="Save progress locally in browser"
            >
              <Save className="w-3.5 h-3.5 text-[#605850]" />
              <span>Save & Resume</span>
            </button>

            <Link
              href="/host/guidelines"
              target="_blank"
              className="flex items-center gap-1 text-xs font-semibold text-[#605850] hover:text-[#c2652a] transition"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hosting Standards</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Persistent Multi-Step Progress Indicator ── */}
      <StepIndicator
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={(step) => {
          if (completedSteps.includes(step) || step <= currentStep) {
            setCurrentStep(step);
          }
        }}
      />

      {/* Save Draft Toast Notice */}
      {saveToast && (
        <div className="max-w-md mx-auto my-3 px-4 py-2 bg-[#3a302a] text-[#faf5ee] text-xs font-medium rounded-lg shadow-md transition flex items-center justify-between border border-[#d8d0c8]/40">
          <span>{saveToast}</span>
          <button
            type="button"
            onClick={() => setSaveToast(null)}
            className="ml-3 text-[#d8d0c8] hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Main Wizard Container ── */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-10">
        {rejectionNotice}

        {currentStep === 1 && (
          <Step1Account
            data={formData}
            updateData={updateFormData}
            currentUser={user}
            onLoginRequest={async (email, pass) => {
              await login(email, pass);
            }}
            onContinue={() => handleNextStep(2)}
          />
        )}

        {currentStep === 2 && (
          <Step2ContactOtp
            data={formData}
            updateData={updateFormData}
            onBack={() => handleBackStep(1)}
            onContinue={() => handleNextStep(3)}
          />
        )}

        {currentStep === 3 && (
          <Step4HostDetails
            data={formData}
            updateData={updateFormData}
            onBack={() => handleBackStep(2)}
            onContinue={() => handleNextStep(4)}
          />
        )}

        {currentStep === 4 && (
          <Step5ReviewSubmit
            data={formData}
            updateData={updateFormData}
            currentUser={user}
            onRegisterAccount={async (name, email, pass) => {
              try {
                await register(name, email, pass);
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                if (message.toLowerCase().includes('already exists') || message.toLowerCase().includes('conflict')) {
                  // Account already registered in a prior session; log in directly with provided credentials
                  await login(email, pass);
                  return;
                }
                throw err;
              }
            }}
            onHostProfileCreated={handleHostProfileCreated}
            onBack={() => handleBackStep(3)}
            onEditStep={(step) => setCurrentStep(step)}
          />
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="py-6 border-t border-[#d8d0c8]/60 bg-[#faf5ee] text-center text-xs text-[#605850]">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Engida Hospitality Platform · Federal Democratic Republic of Ethiopia
          </span>
          <div className="flex gap-4 text-[#605850]">
            <Link href="/privacy" className="hover:text-[#c2652a] transition">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-[#c2652a] transition">
              Terms of Service
            </Link>
            <Link href="/contact" className="hover:text-[#c2652a] transition">
              Host Support
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
