'use client';

import React, { useState } from 'react';
import { Sparkles, Check, ChevronRight } from 'lucide-react';
import AiPricingModal from './AiPricingModal';

interface AiPricingWidgetProps {
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
  const [appliedPrice, setAppliedPrice] = useState<number | null>(null);

  const isSale = (listingType || '').toUpperCase() === 'SALE';
  const currentNumPrice =
    typeof currentPrice === 'string'
      ? parseFloat(currentPrice.replace(/[^0-9.]/g, '')) || 0
      : Number(currentPrice || 0);

  const displayPrice = appliedPrice || (currentNumPrice > 0 ? currentNumPrice : null);

  const handleApplyFromModal = (price: number) => {
    setAppliedPrice(price);
    onApplyPrice(price);
  };

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

        {/* Clean 1-Line Feedback Pill when price is set */}
        {displayPrice && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100/70 transition cursor-pointer shrink-0"
            title="Click to review or modify AI pricing tiers"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              {appliedPrice ? 'Applied AI:' : 'Active:'}{' '}
              <strong className="font-black text-[#252923]">
                ETB {displayPrice.toLocaleString()}
              </strong>
              {isSale ? '' : '/night'}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-emerald-600 ml-0.5 opacity-60 shrink-0" />
          </button>
        )}
      </div>

      {/* Dedicated Enterprise AI Pricing Modal */}
      <AiPricingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
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
        onApplyPrice={handleApplyFromModal}
      />
    </>
  );
}
