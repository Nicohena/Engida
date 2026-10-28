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
      <div className={`flex flex-wrap items-center gap-2.5 pt-1 ${className}`}>
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#234B36]/10 hover:bg-[#234B36]/15 text-[#234B36] border border-[#234B36]/20 transition shadow-2xs cursor-pointer group"
          title="Open AI Pricing Copilot for dynamic valuation and strategy recommendations"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#234B36] group-hover:rotate-12 transition-transform" />
          <span>✨ {isSale ? 'AI Property Valuation' : 'AI Price Copilot'}</span>
        </button>

        {/* Clean 1-Line Feedback Pill when price is set */}
        {displayPrice && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100/70 transition cursor-pointer"
          >
            <Check className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>
              {appliedPrice ? 'Applied AI Rate:' : 'Current Rate:'}{' '}
              <strong className="font-black text-[#252923]">
                ETB {displayPrice.toLocaleString()}
              </strong>
              {isSale ? '' : ' / night'}
            </span>
            <ChevronRight className="w-3 h-3 text-emerald-600 ml-0.5 opacity-60" />
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
        onApplyPrice={handleApplyFromModal}
      />
    </>
  );
}
