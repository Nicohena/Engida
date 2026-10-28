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
  Plus,
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

  const [customAmenityInput, setCustomAmenityInput] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  const toggleAmenity = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleAddCustomAmenity = async (suggestedName?: string) => {
    const nameToAdd = (suggestedName || customAmenityInput).trim();
    if (!nameToAdd) return;

    // Check if already in catalog
    const existing = catalog.find(
      (a) => a.name.toLowerCase() === nameToAdd.toLowerCase(),
    );
    if (existing) {
      if (!selectedIds.includes(existing.id)) {
        onChange([...selectedIds, existing.id]);
      }
      setCustomAmenityInput('');
      setCustomError(null);
      return;
    }

    setIsAddingCustom(true);
    setCustomError(null);

    try {
      const created = await apiFetch<Amenity>('/amenities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameToAdd }),
      });

      if (created && created.id) {
        setCatalog((prev) => [...prev, created]);
        if (!selectedIds.includes(created.id)) {
          onChange([...selectedIds, created.id]);
        }
        setCustomAmenityInput('');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add custom amenity';
      setCustomError(msg);
    } finally {
      setIsAddingCustom(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <label className="block text-sm font-bold text-[#252923]">
            Amenities &amp; Features
          </label>
          <p className="text-xs text-[#73776F]">
            Select all features available for guests at this property.
          </p>
        </div>
        {catalog.length > 0 && (
          <span className="text-xs font-semibold text-[#234B36] bg-[#EEF3EF] px-3 py-1 rounded-full self-start sm:self-auto border border-[#E5E0D5]">
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
              className="h-14 rounded-xl bg-[#F8F5ED] border border-[#E5E0D5]"
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
        <div className="p-6 rounded-xl bg-[#F8F5ED] border border-[#E5E0D5] text-center text-xs text-[#73776F]">
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
                    ? 'border-[#234B36] bg-[#234B36]/10 ring-1 ring-[#234B36] text-[#252923] shadow-xs'
                    : 'border-[#E5E0D5] hover:border-[#234B36]/50 bg-white text-[#252923]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-1">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-[#234B36] text-white'
                        : 'bg-[#EEF3EF] text-[#73776F]'
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
                      ? 'bg-[#234B36] border-[#234B36] text-white'
                      : 'border-[#E5E0D5] bg-white'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Dynamic Custom Amenity Input */}
      <div className="pt-3 border-t border-[#EEF3EF] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#252923] flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-[#234B36]" /> Add Custom Amenity
          </span>
          <span className="text-[11px] text-[#73776F]">
            Have additional features? Add them dynamically to your listing
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={customAmenityInput}
            onChange={(e) => {
              setCustomAmenityInput(e.target.value);
              if (customError) setCustomError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomAmenity();
              }
            }}
            placeholder="e.g. Dedicated Workspace, Private Balcony, Rooftop Terrace..."
            className="flex-1 px-3.5 py-2 rounded-xl border border-[#E5E0D5] text-xs font-medium text-[#252923] placeholder:text-[#73776F] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36] transition"
          />
          <button
            type="button"
            onClick={() => handleAddCustomAmenity()}
            disabled={isAddingCustom || !customAmenityInput.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#234B36] hover:bg-[#2D5E43] text-white text-xs font-bold transition disabled:opacity-50 shrink-0"
          >
            {isAddingCustom ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Add
          </button>
        </div>

        {customError && <p className="text-xs text-red-600 font-semibold">{customError}</p>}

        {/* Quick Suggestions */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] font-semibold text-[#73776F]">Quick Add:</span>
          {['Balcony', 'Dedicated Workspace', 'Rooftop Terrace', 'Solar Power', 'BBQ Grill', 'Baby Crib'].map(
            (sug) => {
              const alreadyHas = catalog.some(
                (a) => a.name.toLowerCase() === sug.toLowerCase() && selectedIds.includes(a.id),
              );
              return (
                <button
                  key={sug}
                  type="button"
                  onClick={() => handleAddCustomAmenity(sug)}
                  disabled={alreadyHas || isAddingCustom}
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition ${
                    alreadyHas
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 opacity-60 cursor-default'
                      : 'bg-[#F8F5ED] hover:bg-[#EEF3EF] text-[#234B36] border-[#E5E0D5]'
                  }`}
                >
                  {alreadyHas ? `✓ ${sug}` : `+ ${sug}`}
                </button>
              );
            },
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
    </div>
  );
}
