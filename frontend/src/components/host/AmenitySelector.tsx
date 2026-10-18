'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../lib/api';
import type { Amenity } from '../../types/host';
import {
  Wifi,
  Tv,
  Car,
  Waves,
  UtensilsCrossed,
  Wind,
  Shield,
  Flame,
  Dumbbell,
  Sparkles,
  Trees,
  ArrowUpDown,
  WashingMachine,
  Coffee,
  Check,
  Zap,
  Briefcase,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export function getAmenityIcon(name: string, iconKey?: string | null): React.ComponentType<{ className?: string }> {
  const query = `${iconKey || ''} ${name || ''}`.toLowerCase();
  if (query.includes('wifi') || query.includes('internet') || query.includes('wi-fi')) return Wifi;
  if (query.includes('kitchen') || query.includes('cooking')) return UtensilsCrossed;
  if (query.includes('air conditioning') || query.includes('ac') || query.includes('cooling')) return Wind;
  if (query.includes('tv') || query.includes('television')) return Tv;
  if (query.includes('pool') || query.includes('swim')) return Waves;
  if (query.includes('parking') || query.includes('garage')) return Car;
  if (query.includes('security') || query.includes('cctv') || query.includes('guard')) return Shield;
  if (query.includes('hot water') || query.includes('water') || query.includes('heater') || query.includes('heat')) return Flame;
  if (query.includes('gym') || query.includes('fitness') || query.includes('workout')) return Dumbbell;
  if (query.includes('garden') || query.includes('park') || query.includes('yard') || query.includes('tree')) return Trees;
  if (query.includes('elevator') || query.includes('lift')) return ArrowUpDown;
  if (query.includes('washer') || query.includes('washing') || query.includes('laundry')) return WashingMachine;
  if (query.includes('coffee') || query.includes('breakfast')) return Coffee;
  if (query.includes('generator') || query.includes('power') || query.includes('electricity')) return Zap;
  if (query.includes('workspace') || query.includes('desk') || query.includes('office')) return Briefcase;
  return Sparkles;
}

interface AmenitySelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}

export default function AmenitySelector({ selectedIds, onChange, error }: AmenitySelectorProps) {
  const [catalog, setCatalog] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchAmenities = useCallback(() => {
    setLoading(true);
    setFetchError(null);
    apiFetch<Amenity[]>('/amenities')
      .then((data) => {
        setCatalog(Array.isArray(data) ? data : []);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load amenities catalog';
        setFetchError(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let ignore = false;
    apiFetch<Amenity[]>('/amenities')
      .then((data) => {
        if (!ignore) {
          setCatalog(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Failed to load amenities catalog';
          setFetchError(msg);
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const toggleAmenity = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <label className="block text-sm font-bold text-[#000000]">
            Amenities &amp; Features
          </label>
          <p className="text-xs text-[#64748B]">
            Select all features available for guests at this property.
          </p>
        </div>
        {catalog.length > 0 && (
          <span className="text-xs font-semibold text-[#33599E] bg-[#E3EAF5] px-3 py-1 rounded-full self-start sm:self-auto">
            {selectedIds.length} of {catalog.length} selected
          </span>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="h-14 rounded-xl bg-[#F4F7FC] border border-[#CBD5E1]"
            />
          ))}
        </div>
      )}

      {/* Error State with Retry */}
      {!loading && fetchError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-3 text-red-800 text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              fetchAmenities();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-red-300 text-red-700 font-bold hover:bg-red-50 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !fetchError && catalog.length === 0 && (
        <div className="p-6 rounded-xl bg-[#F8FAFD] border border-[#CBD5E1] text-center text-xs text-[#64748B]">
          No amenities currently available in the catalog.
        </div>
      )}

      {/* Amenity Cards Grid */}
      {!loading && !fetchError && catalog.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {catalog.map((amenity) => {
            const isSelected = selectedIds.includes(amenity.id);
            const Icon = getAmenityIcon(amenity.name, amenity.icon);

            return (
              <button
                key={amenity.id}
                type="button"
                onClick={() => toggleAmenity(amenity.id)}
                aria-pressed={isSelected}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-[#33599E] bg-[#E3EAF5]/50 ring-1 ring-[#33599E] text-[#000000] shadow-2xs'
                    : 'border-[#CBD5E1] hover:border-[#94A3B8] bg-white text-[#334155]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-1">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-[#33599E] text-white'
                        : 'bg-[#F4F7FC] text-[#64748B]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold truncate">
                    {amenity.name}
                  </span>
                </div>

                <div
                  className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition ${
                    isSelected
                      ? 'bg-[#33599E] border-[#33599E] text-white'
                      : 'border-[#CBD5E1] bg-white'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
    </div>
  );
}
