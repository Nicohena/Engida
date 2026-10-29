'use client';

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import AiPricingModal from './AiPricingModal';

interface AiPricingWidgetProps {
  propertyId?: string;
  city: string;
  subCity?: string;
  neighborhood?: string;
  propertyType: string;
  listingType?: string;
  bedrooms: number | string;
  bathrooms: number | string;
  maxGuests: number | string;
  areaSqm?: number | string;
  amenityIds: string[];
  amenityCatalog?: Array<{ id: string; name: string }>;
  currentPrice?: number | string;
  coverImage?: string;
  images?: string[];
  onApplyPrice: (priceInEtb: number) => void;
  className?: string;
}

export default function AiPricingWidget({
  propertyId,
  city,
  subCity,
  neighborhood,
  propertyType,
  listingType = 'RENTAL',
  bedrooms,
  bathrooms,
  maxGuests,
  areaSqm,
  amenityIds,
  amenityCatalog = [],
  currentPrice,
  coverImage,
  images = [],
  onApplyPrice,
  className = '',
}: AiPricingWidgetProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isSale = (listingType || '').toUpperCase() === 'SALE';
  return (
    <>
      <div className={`inline-flex items-center gap-2 shrink-0 ${className}`}>
        {/* Trigger Button - positioned directly beside the price input */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black bg-[#234B36]/10 hover:bg-[#234B36]/20 text-[#234B36] border border-[#234B36]/25 transition shadow-2xs cursor-pointer group shrink-0"
          title="Open AI Pricing Copilot for dynamic valuation and strategy recommendations"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#234B36] group-hover:rotate-12 transition-transform shrink-0" />
          <span>✨ {isSale ? 'AI Valuation Copilot' : 'AI Price Copilot'}</span>
        </button>
      </div>

      {/* Dedicated Enterprise AI Pricing Modal */}
      <AiPricingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        propertyId={propertyId}
        city={city}
        subCity={subCity}
        neighborhood={neighborhood}
        propertyType={propertyType}
        listingType={listingType}
        bedrooms={bedrooms}
        bathrooms={bathrooms}
        maxGuests={maxGuests}
        areaSqm={areaSqm}
        amenityIds={amenityIds}
        amenityCatalog={amenityCatalog}
        currentPrice={currentPrice}
        coverImage={coverImage}
        images={images}
        onApplyPrice={onApplyPrice}
      />
    </>
  );
}
