import { Property, ListingType } from '../entities/property.entity';

/**
 * Validates minimum required fields before a listing can enter the manual review queue or be published.
 */
export function validatePublishReadiness(property: Property): string[] {
  const missing: string[] = [];
  if (!property.title?.trim()) missing.push('title');
  if (!property.description?.trim()) missing.push('description');
  if (!property.propertyType) missing.push('propertyType');
  if (!property.listingType) missing.push('listingType');
  if (!property.city?.trim()) missing.push('city');
  if (!property.address?.trim()) missing.push('address');
  if (!property.coverImage) missing.push('coverImage');

  if (property.listingType === ListingType.RENTAL) {
    if (!property.pricePerNight || Number(property.pricePerNight) <= 0) {
      missing.push('pricePerNight (must be > 0 for rental listings)');
    }
  } else if (property.listingType === ListingType.SALE) {
    if (!property.salePrice || Number(property.salePrice) <= 0) {
      missing.push('salePrice (must be > 0 for sale listings)');
    }
  }

  return missing;
}

/**
 * Material fields requiring admin re-approval when changed on an already-approved/published listing.
 * These protect guests against fraud, bait-and-switch pricing, and material property misrepresentation.
 */
export const IMPORTANT_LISTING_FIELDS = [
  'title',
  'description',
  'propertyType',
  'address',
  'city',
  'country',
  'region',
  'zone',
  'subCity',
  'woreda',
  'neighborhood',
  'latitude',
  'longitude',
  'pricePerNight',
  'salePrice',
  'maxGuests',
  'bedrooms',
  'bathrooms',
  'areaSqm',
  'coverImage',
  'images',
] as const;

export type ImportantListingField = (typeof IMPORTANT_LISTING_FIELDS)[number];

/**
 * Minor / administrative / presentation-only fields that hosts may safely update
 * directly on a published listing without triggering full admin re-moderation.
 */
export const MINOR_LISTING_FIELDS = [
  'parkingSpaces',
  'amenityIds',
  'isAvailable',
] as const;

export type MinorListingField = (typeof MINOR_LISTING_FIELDS)[number];

export interface FieldChange {
  from: any;
  to: any;
}

export interface ClassifiedListingChanges {
  hasImportantChanges: boolean;
  hasMinorChanges: boolean;
  importantChanges: Record<string, FieldChange>;
  minorChanges: Record<string, FieldChange>;
  rawChanges: Record<string, any>;
}

/**
 * Compares incoming listing updates against current property state to identify
 * whether any material fields have changed.
 */
export function classifyListingChanges(
  current: Property,
  updates: Record<string, any>,
): ClassifiedListingChanges {
  const importantChanges: Record<string, FieldChange> = {};
  const minorChanges: Record<string, FieldChange> = {};
  const rawChanges: Record<string, any> = {};

  for (const [key, val] of Object.entries(updates)) {
    if (val === undefined) continue;

    // Check amenity IDs comparison
    if (key === 'amenityIds') {
      const currentIds = (current.amenities || []).map((a) => a.id).sort();
      const newIds = Array.isArray(val) ? [...val].sort() : [];
      const isDifferent =
        currentIds.length !== newIds.length ||
        currentIds.some((id, idx) => id !== newIds[idx]);

      if (isDifferent) {
        minorChanges['amenityIds'] = { from: currentIds, to: newIds };
        rawChanges['amenityIds'] = val;
      }
      continue;
    }

    // Check array comparisons (e.g. images)
    if (key === 'images') {
      const currentImages = current.images || [];
      const newImages = Array.isArray(val) ? val : [];
      const isDifferent =
        currentImages.length !== newImages.length ||
        currentImages.some((img, idx) => img !== newImages[idx]);

      if (isDifferent) {
        importantChanges['images'] = { from: currentImages, to: newImages };
        rawChanges['images'] = val;
      }
      continue;
    }

    // Numbers & Decimals normalization
    const currentVal = (current as any)[key];
    if (
      key === 'pricePerNight' ||
      key === 'salePrice' ||
      key === 'latitude' ||
      key === 'longitude'
    ) {
      const numCurrent = currentVal !== null && currentVal !== undefined ? Number(currentVal) : null;
      const numNew = val !== null && val !== undefined ? Number(val) : null;
      if (numCurrent !== numNew) {
        importantChanges[key] = { from: numCurrent, to: numNew };
        rawChanges[key] = val;
      }
      continue;
    }

    // Integer normalization
    if (
      key === 'bedrooms' ||
      key === 'bathrooms' ||
      key === 'maxGuests' ||
      key === 'areaSqm'
    ) {
      const intCurrent = currentVal !== null && currentVal !== undefined ? Number(currentVal) : null;
      const intNew = val !== null && val !== undefined ? Number(val) : null;
      if (intCurrent !== intNew) {
        importantChanges[key] = { from: intCurrent, to: intNew };
        rawChanges[key] = val;
      }
      continue;
    }

    // Minor integers (e.g. parkingSpaces)
    if (key === 'parkingSpaces') {
      const intCurrent = currentVal !== null && currentVal !== undefined ? Number(currentVal) : 0;
      const intNew = val !== null && val !== undefined ? Number(val) : 0;
      if (intCurrent !== intNew) {
        minorChanges[key] = { from: intCurrent, to: intNew };
        rawChanges[key] = val;
      }
      continue;
    }

    // Minor booleans (e.g. isAvailable)
    if (key === 'isAvailable') {
      const boolCurrent = Boolean(currentVal);
      const boolNew = Boolean(val);
      if (boolCurrent !== boolNew) {
        minorChanges[key] = { from: boolCurrent, to: boolNew };
        rawChanges[key] = val;
      }
      continue;
    }

    // String normalization and trimming
    if (typeof val === 'string') {
      const strCurrent = (currentVal || '').trim();
      const strNew = val.trim();
      if (strCurrent !== strNew) {
        if ((IMPORTANT_LISTING_FIELDS as readonly string[]).includes(key)) {
          importantChanges[key] = { from: strCurrent, to: strNew };
          rawChanges[key] = val;
        } else {
          minorChanges[key] = { from: strCurrent, to: strNew };
          rawChanges[key] = val;
        }
      }
      continue;
    }

    // Fallback comparison
    if (currentVal !== val) {
      if ((IMPORTANT_LISTING_FIELDS as readonly string[]).includes(key)) {
        importantChanges[key] = { from: currentVal, to: val };
        rawChanges[key] = val;
      } else {
        minorChanges[key] = { from: currentVal, to: val };
        rawChanges[key] = val;
      }
    }
  }

  return {
    hasImportantChanges: Object.keys(importantChanges).length > 0,
    hasMinorChanges: Object.keys(minorChanges).length > 0,
    importantChanges,
    minorChanges,
    rawChanges,
  };
}
