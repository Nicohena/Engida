/**
 * Host-specific TypeScript types.
 * These mirror the backend HostService response shapes.
 */

export type HostVerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type ListingType = 'RENTAL' | 'SALE';
export type ListingStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED' | 'SOLD';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
export type PropertyType = 'HOUSE' | 'APARTMENT' | 'VILLA' | 'BEDROOM' | 'STUDIO';

export type ReviewSubmissionType = 'INITIAL_PUBLISH' | 'IMPORTANT_EDIT';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

export interface ListingReviewItem {
  id: string;
  propertyId: string;
  submissionType: ReviewSubmissionType;
  status: ReviewStatus;
  proposedChanges: Record<string, unknown> | null;
  submittedByHostId: string;
  submittedAt: string;
  reviewedByAdminId: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Amenity {
  id: string;
  name: string;
  icon: string | null;
}

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
  images?: string[];
  amenityIds?: string[];
}

export interface UpdateHostListingPayload {
  title?: string;
  description?: string;
  propertyType?: PropertyType;
  pricePerNight?: number;
  salePrice?: number;
  maxGuests?: number;
  bedrooms?: number;
  bathrooms?: number;
  areaSqm?: number;
  parkingSpaces?: number;
  address?: string;
  city?: string;
  country?: string;
  region?: string;
  zone?: string;
  subCity?: string;
  woreda?: string;
  neighborhood?: string;
  latitude?: number;
  longitude?: number;
  coverImage?: string;
  images?: string[];
  amenityIds?: string[];
}

export interface HostListingDetail {
  id: string;
  hostId: string;
  title: string;
  description: string;
  propertyType: PropertyType;
  listingType: ListingType;
  status: ListingStatus;
  address: string;
  city: string;
  country: string;
  region: string | null;
  zone: string | null;
  subCity: string | null;
  woreda: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  pricePerNight: string | number;
  salePrice: string | number | null;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number;
  parkingSpaces: number;
  isAvailable: boolean;
  coverImage: string | null;
  images: string[];
  amenities?: Amenity[];
  rooms?: import('./index').Room[];
  adminHidden?: boolean;
  adminHiddenReason?: string | null;
  adminHiddenAt?: string | null;
  activeReview?: ListingReviewItem | null;
  reviewHistory?: ListingReviewItem[];
  moderationMessage?: string | null;
  isPendingReview?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────
// Host Profile & Payout Settings
// ──────────────────────────────────────

export type PayoutProvider =
  | 'TELEBIRR'
  | 'CBE'
  | 'AWASH'
  | 'DASHEN'
  | 'ABYSSINIA'
  | 'CHAPA'
  | 'INTERNATIONAL_SWIFT'
  | 'PAYPAL'
  | 'WISE';

export interface HostProfile {
  id: string;
  userId: string;
  displayName: string | null;
  bio: string | null;
  phone: string | null;
  verificationStatus: HostVerificationStatus;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    role: string;
  };
  rejectionReason?: string | null;
  payoutProvider?: PayoutProvider | null;
  payoutAccountName?: string | null;
  payoutAccountNumber?: string | null;
  payoutPhone?: string | null;
  payoutBankBranch?: string | null;
  payoutSwiftBic?: string | null;
  payoutEmail?: string | null;
  payoutCurrency?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminHostVerificationsResponse {
  data: HostProfile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdateHostProfilePayload {
  displayName?: string;
  phone?: string | null;
  bio?: string | null;
  avatar?: string | null;
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
  adminHidden?: boolean;
  adminHiddenReason?: string | null;
  hasPendingReview?: boolean;
  pendingReviewType?: ReviewSubmissionType | null;
  rejectionReason?: string | null;
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
  room: { id: string; title: string; roomNumber: string } | null;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  totalPrice: number;
  status: BookingStatus;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentReference?: string | null;
  paymentCurrency?: string;
  paidAt?: string | null;
  createdAt: string;
}


export interface HostReservationsResponse {
  data: HostReservationRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type PaymentStatus = 'PENDING' | 'PAID' | 'ON_ARRIVAL' | 'REFUNDED' | 'FAILED';
export type PaymentMethod =
  | 'CHAPA'
  | 'TELEBIRR'
  | 'CBE_BIRR'
  | 'INTERNATIONAL_CARD'
  | 'PAYPAL'
  | 'WISE'
  | 'CASH_ON_ARRIVAL';

export interface MonthlyEarningItem {
  yearMonth: string;
  label: string;
  bookingCount: number;
  totalBookingValue: number;
  confirmedPaidAmount: number;
  confirmedPaidCount: number;
  onArrivalAmount: number;
  onArrivalCount: number;
  refundedAmount: number;
  refundedCount: number;
  cancelledCount: number;
}

export interface HostEarningsSummary {
  currency: string;
  totalBookingsCount: number;
  totalBookingValue: number;
  confirmedPaidAmount: number;
  confirmedPaidCount: number;
  onArrivalAmount: number;
  onArrivalCount: number;
  pendingPaymentAmount: number;
  pendingPaymentCount: number;
  refundedAmount: number;
  refundedCount: number;
  cancelledCount: number;
  cancelledBookingValue: number;
  monthlyBreakdown: MonthlyEarningItem[];
  ledgerAvailableMinor?: string;
  ledgerPendingEscrowMinor?: string;
  ledgerPaidTotalMinor?: string;
}

export interface HostPayoutAccount {
  id: string;
  provider: string;
  accountName: string;
  accountNumberLast4: string;
  phoneLast4?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  currency: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'DISABLED';
  verifiedAt?: string | null;
  createdAt: string;
}

export interface HostPayoutRow {
  id: string;
  amountMinor: string;
  currency: string;
  status: 'SCHEDULED' | 'PENDING_APPROVAL' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED';
  periodStart: string;
  periodEnd: string;
  providerTransferId?: string | null;
  paidAt?: string | null;
  accountLast4: string;
  createdAt: string;
}

export interface HostTransactionItem {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyCity: string;
  guestName: string;
  guestEmail: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  totalPrice: number;
  paymentCurrency: string;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentReference: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface HostTransactionsResponse {
  data: HostTransactionItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  currency: string;
}

export interface HostReviewItem {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyCity: string;
  guestName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface HostReviewsPage {
  data: HostReviewItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PropertyReviewSummary {
  propertyId: string;
  propertyTitle: string;
  propertyCity: string;
  coverImage: string | null;
  reviewCount: number;
  averageRating: number;
}

export interface HostReviewsSummary {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  propertySummaries: PropertyReviewSummary[];
}

export interface AiKeyPriceDriver {
  factor: string;
  impact: string;
  type: 'positive' | 'neutral' | 'premium';
}

export interface AiPriceStrategyTier {
  rate: number;
  label: string;
  badge?: string;
  rationale: string;
  occupancyTarget?: string;
}

export interface AiPricePredictionResponse {
  predictedPrice: number;
  currency: 'ETB';
  confidence: number;
  priceRange: {
    min: number;
    max: number;
  };
  tiers?: {
    fastBooking: AiPriceStrategyTier;
    optimal: AiPriceStrategyTier;
    peakSeason: AiPriceStrategyTier;
  };
  hostTip?: string;
  breakdown: {
    baseRateEtb: number;
    locationMultiplier: number;
    locationTier: string;
    propertyTypeMultiplier: number;
    amenitiesPremiumEtb: number;
    keyDrivers: AiKeyPriceDriver[];
  };
}

export interface GenerateListingContentRequest {
  propertyType: string;
  listingType?: string; // 'RENTAL' | 'SALE'
  city: string;
  subCity?: string;
  neighborhood?: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  areaSqm?: number;
  amenities: string[];
  language?: 'en' | 'am';
  tone?: 'luxury' | 'warm' | 'business';
  descriptionLength?: 'short' | 'medium' | 'long';
  titleLength?: 'concise' | 'standard' | 'extended';
  coverImage?: string;
  images?: string[];
}

export interface GenerateListingContentResponse {
  title: string;
  description: string;
  language: 'en' | 'am';
  tone: 'luxury' | 'warm' | 'business';
  highlights: string[];
}

