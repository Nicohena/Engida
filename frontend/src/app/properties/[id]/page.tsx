'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '../../../lib/api';
import type { Property } from '../../../types';

import LandingHeader, { PartitionTab } from '../../../components/landing/LandingHeader';
import LandingFooter from '../../../components/landing/LandingFooter';
import PropertyHeroGallery from '../../../components/property-details/PropertyHeroGallery';
import PropertyQuickDetails from '../../../components/property-details/PropertyQuickDetails';
import PropertyAbout from '../../../components/property-details/PropertyAbout';
import PropertyFeaturesAmenities from '../../../components/property-details/PropertyFeaturesAmenities';
import PropertyConsultantCard from '../../../components/property-details/PropertyConsultantCard';
import PropertyBookingWidget from '../../../components/property-details/PropertyBookingWidget';
import PropertyRelatedGrid from '../../../components/property-details/PropertyRelatedGrid';

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [related, setRelated] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleTabChange = (tab: PartitionTab) => {
    router.push(`/?tab=${tab}`);
  };

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    Promise.all([
      apiFetch<Property>(`/properties/${id}`, { skipAuth: true }),
      apiFetch<Property[]>(`/properties/${id}/related`, { skipAuth: true }).catch(() => []),
    ])
      .then(([propertyData, relatedData]) => {
        setProperty(propertyData);
        setRelated(relatedData);
      })
      .catch((err) => {
        setError(err.message || 'Property not found');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <LandingHeader activeTab="stays" onTabChange={handleTabChange} />
        <main className="flex-1 w-full pt-[80px] md:pt-[70px]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
            <div className="w-full aspect-[21/9] bg-slate-100 rounded-2xl animate-pulse" />
            <div className="mt-6 space-y-4">
              <div className="h-8 w-72 bg-slate-100 rounded-xl animate-pulse" />
              <div className="h-4 w-96 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-32 w-full bg-slate-50 rounded-2xl animate-pulse" />
            </div>
          </div>
        </main>
        <LandingFooter />
      </div>
    );
  }

  // Error state
  if (error || !property) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <LandingHeader activeTab="stays" onTabChange={handleTabChange} />
        <main className="flex-1 flex items-center justify-center pt-[80px] px-4">
          <div className="text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-[#2563eb] flex items-center justify-center mx-auto text-2xl font-bold">
              !
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Stay Not Found</h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              {error || 'The property you are looking for does not exist or has been removed from Engida.'}
            </p>
            <div className="pt-2">
              <Link
                href="/?tab=stays"
                className="inline-block px-6 py-3 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs"
              >
                Browse Verified Stays
              </Link>
            </div>
          </div>
        </main>
        <LandingFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white text-slate-800 flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {/* Official Engida Landing Header */}
      <LandingHeader activeTab="stays" onTabChange={handleTabChange} />

      <main className="flex-grow pt-[72px] sm:pt-[65px]">
        {/* Back Navigation Bar */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-1">
          <Link
            href="/?tab=stays"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#2563eb] transition-colors group cursor-pointer"
          >
            <svg className="w-4 h-4 text-slate-400 group-hover:text-[#2563eb] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Verified Ethiopian Stays</span>
          </Link>
        </div>

        {/* Hero Image Gallery */}
        <PropertyHeroGallery
          coverImage={property.coverImage}
          images={property.images}
          title={property.title}
        />

        {/* Content Body */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {/* Title and Location */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-[-0.03em] mb-2">
              {property.title}
            </h1>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 font-medium">
              <svg className="w-4 h-4 text-[#2563eb] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{property.address}, {property.city}, {property.country}</span>
              <span className="text-slate-300">•</span>
              <span className="text-amber-600 font-bold flex items-center gap-1">
                ★ 4.98 <span className="text-slate-400 font-normal">(46 reviews)</span>
              </span>
            </div>
          </div>

          {/* Two Column Layout: Content + Sticky Booking Widget */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Column: Property Details */}
            <div className="lg:col-span-2">
              <PropertyQuickDetails property={property} />
              <PropertyAbout description={property.description} />
              <PropertyFeaturesAmenities amenities={property.amenities} />
              <PropertyConsultantCard host={property.host} />
            </div>

            {/* Right Column: Booking Widget (sticky) */}
            <div className="lg:col-span-1">
              <PropertyBookingWidget property={property} />
            </div>
          </div>

          {/* Related Properties */}
          <PropertyRelatedGrid properties={related} />
        </div>
      </main>

      {/* Official Engida Landing Footer */}
      <LandingFooter />
    </div>
  );
}
