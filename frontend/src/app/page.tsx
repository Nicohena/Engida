'use client';

import React, { useState } from 'react';
import { LandingProvider } from '../context/LandingContext';
import LandingHeader, { PartitionTab } from '../components/landing/LandingHeader';
import SkylineIllustration from '../components/landing/SkylineIllustration';
import HeroSearchBar from '../components/landing/HeroSearchBar';
import HeroDockedBanner from '../components/landing/HeroDockedBanner';
import CategoryListingsSection from '../components/landing/CategoryListingsSection';
import ThreeStepsSection from '../components/landing/ThreeStepsSection';
import AiDiscoverySection from '../components/landing/AiDiscoverySection';
import BenefitsGrid from '../components/landing/BenefitsGrid';
import LandingFooter from '../components/landing/LandingFooter';
import HostEarningsSection from '../components/landing/HostEarningsSection';
import TrustVerificationSection from '../components/landing/TrustVerificationSection';
import PaymentEscrowSection from '../components/landing/PaymentEscrowSection';
import DestinationsSection from '../components/landing/DestinationsSection';

function MainLandingPage() {
  const [activeTab, setActiveTab] = useState<PartitionTab>('home');

  const navigateToTab = (tab: PartitionTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <div className="min-h-screen w-full bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900 relative flex flex-col">
      {/* Sticky Global Top Header (Locked Across All Partitions) */}
      <LandingHeader
        activeTab={activeTab}
        onTabChange={navigateToTab}
      />

      {/* Main Partition Render Area (accounting for sticky header height) */}
      <main className="flex-1 w-full pt-[98px] md:pt-[65px] flex flex-col">
        
        {/* ============================================================ */}
        {/* PARTITION 1: HOME (HERO + SKYLINE + DOCKED BANNER) */}
        {/* ============================================================ */}
        {activeTab === 'home' && (
          <section
            key="home"
            className="animate-partition flex-1 flex flex-col justify-between overflow-hidden bg-gradient-to-b from-amber-50/20 via-blue-50/15 to-white relative min-h-[calc(100vh-65px)]"
          >
            {/* Central Hero Typography & Search Pill */}
            <div className="relative z-20 max-w-4xl mx-auto px-4 sm:px-6 text-center my-auto py-6 sm:py-8">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[50px] font-extrabold text-slate-900 tracking-[-0.03em] leading-[1.14]">
                Effortless to the perfect stay
              </h1>

              <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm md:text-base text-slate-500 font-normal max-w-xl mx-auto leading-relaxed">
                Find verified accommodations across Ethiopia directly and without stress.
              </p>

              <div className="mt-5 sm:mt-7">
                <HeroSearchBar onSearchClick={() => navigateToTab('stays')} />
              </div>
            </div>

            {/* Architectural Ethiopian Modern Skyline Artwork */}
            <div className="relative w-full z-10 -mb-2 sm:-mb-4 pointer-events-none select-none">
              <SkylineIllustration />
            </div>

            {/* Docked Blue Feature Strip (Bottom of Hero Viewport) */}
            <div className="relative z-30 w-full">
              <HeroDockedBanner />
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* PARTITION 2: STAYS & HOMES (AIRBNB-STYLE LISTINGS & CATEGORIES) */}
        {/* ============================================================ */}
        {activeTab === 'stays' && (
          <section
            key="stays"
            className="animate-partition flex-1 w-full bg-white px-4 sm:px-6 py-6 sm:py-10"
          >
            <div className="max-w-6xl mx-auto">
              <CategoryListingsSection onBookClick={() => navigateToTab('payments-escrow')} />
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* PARTITION 3: HOW IT WORKS (3 EASY STEPS WITH VECTOR ART - FR-01) */}
        {/* ============================================================ */}
        {activeTab === 'how-it-works' && (
          <section
            key="how-it-works"
            className="animate-partition flex-1 w-full bg-white flex flex-col justify-center items-center px-4 sm:px-6 py-10 sm:py-16 min-h-[calc(100vh-65px)]"
          >
            <div className="w-full max-w-6xl mx-auto my-auto">
              <ThreeStepsSection onCtaClick={() => navigateToTab('stays')} />
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* PARTITION 4: AI DISCOVERY (INTELLIGENT ASSISTANT - FR-13) */}
        {/* ============================================================ */}
        {activeTab === 'ai-discovery' && (
          <section
            key="ai-discovery"
            className="animate-partition flex-1 w-full bg-white flex flex-col justify-center items-center px-4 sm:px-6 py-10 sm:py-16 min-h-[calc(100vh-65px)]"
          >
            <div className="w-full max-w-6xl mx-auto my-auto">
              <AiDiscoverySection onCtaClick={() => navigateToTab('stays')} />
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* PARTITION 5: HOST EARNINGS CALCULATOR (SRS FR-02, FR-12, FR-17) */}
        {/* ============================================================ */}
        {activeTab === 'host-calculator' && (
          <section
            key="host-calculator"
            className="animate-partition flex-1 w-full bg-white flex flex-col justify-center items-center min-h-[calc(100vh-65px)]"
          >
            <HostEarningsSection onExploreStays={() => navigateToTab('stays')} />
          </section>
        )}

        {/* ============================================================ */}
        {/* PARTITION 6: TRUST & VERIFICATION HUB (SRS FR-04, FR-10, FR-16) */}
        {/* ============================================================ */}
        {activeTab === 'trust-verification' && (
          <section
            key="trust-verification"
            className="animate-partition flex-1 w-full bg-white flex flex-col justify-center items-center min-h-[calc(100vh-65px)]"
          >
            <TrustVerificationSection onExplore={() => navigateToTab('stays')} />
          </section>
        )}

        {/* ============================================================ */}
        {/* PARTITION 7: PAYMENTS & ESCROW (SRS FR-07) */}
        {/* ============================================================ */}
        {activeTab === 'payments-escrow' && (
          <section
            key="payments-escrow"
            className="animate-partition flex-1 w-full bg-white flex flex-col justify-center items-center min-h-[calc(100vh-65px)]"
          >
            <PaymentEscrowSection onExploreStays={() => navigateToTab('stays')} />
          </section>
        )}

        {/* ============================================================ */}
        {/* PARTITION 8: POPULAR DESTINATIONS (SRS FR-05, FR-14, FR-18) */}
        {/* ============================================================ */}
        {activeTab === 'destinations' && (
          <section
            key="destinations"
            className="animate-partition flex-1 w-full bg-white flex flex-col justify-center items-center min-h-[calc(100vh-65px)]"
          >
            <DestinationsSection onSelectDestination={() => navigateToTab('stays')} />
          </section>
        )}

        {/* ============================================================ */}
        {/* PARTITION 9: BENEFITS & FOOTER (TRUST GRID + FOOTER - FR-08) */}
        {/* ============================================================ */}
        {activeTab === 'benefits' && (
          <section
            key="benefits"
            className="animate-partition flex-1 w-full bg-white flex flex-col justify-between px-4 sm:px-6 pt-8 sm:pt-12 min-h-[calc(100vh-65px)]"
          >
            {/* Main Benefits Content */}
            <div className="w-full max-w-5xl mx-auto my-auto">
              <BenefitsGrid />

              {/* Navigation Action Buttons */}
              <div className="text-center mt-6 mb-8 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigateToTab('stays')}
                  className="px-5 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white rounded-full text-xs sm:text-sm font-semibold shadow-md transition-all cursor-pointer"
                >
                  Explore Stays & Homes
                </button>
                <button
                  type="button"
                  onClick={() => navigateToTab('home')}
                  className="px-4 py-2 border border-slate-300 hover:border-slate-400 text-slate-700 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer hover:bg-slate-50"
                >
                  Back to Home
                </button>
              </div>
            </div>

            {/* Docked Footer */}
            <div className="w-full relative z-20 mt-6">
              <LandingFooter />
            </div>
          </section>
        )}

      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <LandingProvider>
      <MainLandingPage />
    </LandingProvider>
  );
}
