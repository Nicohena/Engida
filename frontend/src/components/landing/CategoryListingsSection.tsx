'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Building2, RefreshCw, Tag, Home, Key } from 'lucide-react';
import { apiFetch } from '@/lib/api';

type PropertyType = 'HOUSE' | 'APARTMENT' | 'VILLA' | 'BEDROOM' | 'STUDIO';
type ListingType = 'RENTAL' | 'SALE';

interface ListingItem {
  id: string;
  title: string;
  address: string;
  city: string;
  propertyType: PropertyType;
  listingType: ListingType;
  pricePerNight: string | number;
  salePrice?: string | number | null;
  coverImage: string | null;
  host: { name: string; hostProfile?: { displayName?: string | null } | null } | null;
  amenities: { id: string; name: string }[];
}

interface ListingsResponse {
  data: ListingItem[];
  total: number;
}

interface CategoryListingsSectionProps {
  onSelectProperty?: (id: string) => void;
  onBookClick?: (id: string) => void;
  title?: string;
  subtitle?: string;
  badge?: string;
  limit?: number;
  initialListingType?: 'ALL' | 'RENTAL' | 'SALE';
  showViewAllButton?: boolean;
  onViewAllClick?: () => void;
}

const CATEGORIES: { id: PropertyType | 'all'; label: string }[] = [
  { id: 'all', label: 'All types' },
  { id: 'APARTMENT', label: 'Apartments' },
  { id: 'VILLA', label: 'Villas & Estates' },
  { id: 'HOUSE', label: 'Houses' },
  { id: 'STUDIO', label: 'Studios' },
  { id: 'BEDROOM', label: 'Rooms' },
];

export default function CategoryListingsSection({
  onSelectProperty,
  onBookClick,
  title,
  subtitle,
  badge,
  limit,
  initialListingType = 'ALL',
  showViewAllButton,
  onViewAllClick,
}: CategoryListingsSectionProps) {
  const [listingTypeFilter, setListingTypeFilter] = useState<'ALL' | 'RENTAL' | 'SALE'>(initialListingType);
  const [selectedCategory, setSelectedCategory] = useState<PropertyType | 'all'>('all');
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const queryParam = listingTypeFilter === 'ALL' ? '' : `&listingType=${listingTypeFilter}`;

    apiFetch<ListingsResponse>(`/properties?limit=100${queryParam}`, {
      skipAuth: true,
    })
      .then((response) => {
        if (!active) return;
        setListings(response.data);
        setTotal(response.total);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load properties.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [listingTypeFilter, reloadVersion]);

  const filteredListings = useMemo(() => {
    const filtered =
      selectedCategory === 'all'
        ? listings
        : listings.filter((listing) => listing.propertyType === selectedCategory);
    return limit ? filtered.slice(0, limit) : filtered;
  }, [limit, listings, selectedCategory]);

  const handlePropertyClick = (id: string) => {
    if (onSelectProperty) onSelectProperty(id);
    else onBookClick?.(id);
  };

  return (
    <section className="w-full bg-white py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header Title and Counts */}
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            {badge && (
              <h2 className="mb-1.5 font-mono text-xs font-bold uppercase tracking-widest text-[#2563eb]">
                {badge}
              </h2>
            )}
            {title && (
              <h3 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
                {title}
              </h3>
            )}
            {subtitle && <p className="mt-1 max-w-xl text-xs text-slate-500 sm:text-sm">{subtitle}</p>}
          </div>
          <p className="text-xs font-medium text-slate-500" aria-live="polite">
            {loading ? (
              'Loading Ethiopian properties…'
            ) : (
              `${filteredListings.length} shown · ${total} published ${
                listingTypeFilter === 'ALL'
                  ? 'properties (rentals & real estate)'
                  : listingTypeFilter === 'SALE'
                  ? 'properties for sale'
                  : 'rentals'
              }`
            )}
          </p>
        </div>

        {/* Listing Type Filter (Rentals vs Real Estate / Sale) */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setListingTypeFilter('ALL')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
              listingTypeFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Home className="w-3.5 h-3.5" /> All Listings
          </button>

          <button
            type="button"
            onClick={() => setListingTypeFilter('RENTAL')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
              listingTypeFilter === 'RENTAL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <Key className="w-3.5 h-3.5" /> Stays & Rentals
          </button>

          <button
            type="button"
            onClick={() => setListingTypeFilter('SALE')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
              listingTypeFilter === 'SALE'
                ? 'bg-violet-700 text-white shadow-xs'
                : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
            }`}
          >
            <Tag className="w-3.5 h-3.5" /> Real Estate & Apartments for Sale
          </button>
        </div>

        {/* Sub-Category Pills */}
        <div
          className="mb-7 flex gap-2 overflow-x-auto border-b border-slate-100 pb-3"
          aria-label="Filter by property type"
        >
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={selectedCategory === category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                selectedCategory === category.id
                  ? 'border-[#2563eb] bg-[#2563eb] text-white shadow-xs'
                  : 'border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setLoading(true);
                setReloadVersion((version) => version + 1);
              }}
              className="inline-flex items-center gap-2 font-bold text-red-900"
            >
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        )}

        {loading ? (
          <div role="status" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="h-80 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center">
            <Building2 className="mx-auto mb-3 h-8 w-8 text-slate-400" aria-hidden="true" />
            <h4 className="font-bold text-slate-900">No properties found</h4>
            <p className="mt-1 text-sm text-slate-600">
              Try selecting a different property type or listing category filter above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {filteredListings.map((listing) => (
              <Link
                key={listing.id}
                href={`/properties/${listing.id}`}
                onClick={(event) => {
                  if (onSelectProperty || onBookClick) {
                    event.preventDefault();
                    handlePropertyClick(listing.id);
                  }
                }}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl"
              >
                {/* Photo Container */}
                <div className="relative flex h-52 items-end bg-slate-200 p-4 overflow-hidden">
                  {listing.coverImage && (
                    <Image
                      src={listing.coverImage}
                      alt={listing.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition duration-500"
                      unoptimized
                    />
                  )}
                  {listing.coverImage && (
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"
                      aria-hidden="true"
                    />
                  )}
                  {!listing.coverImage && (
                    <Building2
                      className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-sm ${
                        listing.listingType === 'SALE'
                          ? 'bg-violet-600 text-white'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {listing.listingType === 'SALE' ? 'For Sale' : 'Rental Stay'}
                    </span>

                    <span className="rounded-full bg-white/90 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-800 shadow-sm">
                      {listing.propertyType.toLowerCase()}
                    </span>
                  </div>

                  {/* Location overlay */}
                  <p className="relative z-10 truncate text-xs font-bold text-white drop-shadow-md">
                    {[listing.address, listing.city].filter(Boolean).join(', ')}
                  </p>
                </div>

                {/* Card Info */}
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <h4 className="mb-2.5 line-clamp-2 text-sm font-bold text-slate-900 group-hover:text-blue-700 transition">
                      {listing.title}
                    </h4>

                    {listing.amenities && listing.amenities.length > 0 && (
                      <ul className="mb-3 flex flex-wrap gap-1" aria-label="Amenities">
                        {listing.amenities.slice(0, 3).map((amenity) => (
                          <li
                            key={amenity.id}
                            className="rounded-md border border-slate-100 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600"
                          >
                            {amenity.name}
                          </li>
                        ))}
                        {listing.amenities.length > 3 && (
                          <li className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400">
                            +{listing.amenities.length - 3}
                          </li>
                        )}
                      </ul>
                    )}
                  </div>

                  {/* Pricing Footer */}
                  <div className="flex items-end justify-between border-t border-slate-100 pt-3">
                    <div>
                      {listing.listingType === 'SALE' ? (
                        <>
                          <p className="text-base font-black text-slate-900">
                            ETB {Number(listing.salePrice || 0).toLocaleString()}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            Real Estate Sale ·{' '}
                            {listing.host?.hostProfile?.displayName?.trim() || listing.host?.name || 'Owner/Agent'}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-base font-black text-slate-900">
                            ETB {Number(listing.pricePerNight).toLocaleString()}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            per night ·{' '}
                            {listing.host?.hostProfile?.displayName?.trim() || listing.host?.name || 'Host'}
                          </p>
                        </>
                      )}
                    </div>
                    <span className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition group-hover:bg-blue-600 shadow-xs">
                      {listing.listingType === 'SALE' ? 'View Estate' : 'View Stay'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {showViewAllButton && (
          <div className="mt-9 text-center">
            <button
              type="button"
              onClick={onViewAllClick}
              className="rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-sm cursor-pointer"
            >
              Explore all published properties
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
