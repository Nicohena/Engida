/**
 * Host-specific TypeScript types.
 * These mirror the backend HostService response shapes.
 */

export type HostVerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type ListingType = 'RENTAL' | 'SALE';
export type ListingStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED' | 'SOLD';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
export type PropertyType = 'HOUSE' | 'APARTMENT' | 'VILLA' | 'BEDROOM' | 'STUDIO';

export interface CreateHostListingPayload {
  title: string;
  description: string;
  propertyType?: PropertyType;
  listingType: ListingType;
  pricePerNight?: number;
  salePrice?: number;
  maxGuests?: number;
  bedrooms?: number;
  bathrooms?: number;
  areaSqm?: number;
  parkingSpaces?: number;
  address: string;
  city: string;
  country?: string;
  region?: string;
  zone?: string;
  subCity?: string;
  woreda?: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
  coverImage?: string;
}

// ──────────────────────────────────────
// Host Profile
// ──────────────────────────────────────

export interface HostProfile {
  id: string;
  userId: string;
  displayName: string | null;
  bio: string | null;
  phone: string | null;
  verificationStatus: HostVerificationStatus;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────
// Dashboard Summary (GET /host/dashboard)
// ──────────────────────────────────────

export interface HostDashboardSummary {
  // Listings by status
  totalListings: number;
  publishedListings: number;
  draftListings: number;
  pausedListings: number;
  saleListings: number;
  rentalListings: number;
  // Reservations by status
  pendingReservations: number;
  confirmedReservations: number;
  completedReservations: number;
  upcomingReservations: number;
  // Booking totals — NOT actual paid/settled revenue
  totalBookingValue: number;
}

// ──────────────────────────────────────
// Host Listing (condensed for list view)
// ──────────────────────────────────────

export interface HostListingRow {
  id: string;
  title: string;
  coverImage: string | null;
  listingType: ListingType;
  status: ListingStatus;
  pricePerNight: string | number;
  salePrice: string | number | null;
  city: string;
  subCity: string | null;
  bedrooms: number;
  bathrooms: number;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HostListingsResponse {
  data: HostListingRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Query params for GET /host/listings — mirrors QueryHostListingsDto */
export interface HostListingsQuery {
  listingType?: ListingType | '';
  status?: ListingStatus | '';
  city?: string;
  subCity?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ──────────────────────────────────────
// Host Reservations
// ──────────────────────────────────────

export interface HostReservationRow {
  id: string;
  property: {
    id: string;
    title: string;
    coverImage: string | null;
    city: string;
    listingType: ListingType;
  };
  guest: {
    id: string;
    name: string;
    email: string;
  };
  checkInDate: string;
  checkOutDate: string;
  totalPrice: number;
  status: BookingStatus;
  createdAt: string;
}

export interface HostReservationsResponse {
  data: HostReservationRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
