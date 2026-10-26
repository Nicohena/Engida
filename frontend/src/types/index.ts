/**
 * Shared TypeScript Type Definitions
 * 
 * Centralized type definitions for the ENGIDA frontend.
 * Keep types organized by domain (user, property, listing, etc.)
 */

// Common types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// User / Host types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  phone?: string | null;
  title?: string | null;
  bio?: string | null;
  avatar?: string | null;
  officeLocation?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyHost {
  id: string;
  name: string;
  hostProfile?: {
    id?: string;
    displayName?: string | null;
    bio?: string | null;
    phone?: string | null;
  } | null;
}

// Amenity
export interface Amenity {
  id: string;
  name: string;
  icon: string | null;
}

// Room
export interface Room {
  id: string;
  propertyId: string;
  title: string;
  roomNumber: string;
  capacity: number;
  pricePerNight: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

// Review
export interface Review {
  id: string;
  propertyId: string;
  user: Pick<User, 'id' | 'name'>;
  rating: number;
  comment: string | null;
  createdAt: string;
}

// Property types
export type PropertyType = 'HOUSE' | 'APARTMENT' | 'VILLA' | 'BEDROOM' | 'STUDIO';

export interface Property {
  id: string;
  hostId: string;
  host: PropertyHost;
  title: string;
  description: string;
  propertyType: PropertyType;
  listingType?: 'RENTAL' | 'SALE';
  salePrice?: string | number | null;
  address: string;
  city: string;
  country: string;
  pricePerNight: string;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number;
  parkingSpaces: number;
  isAvailable: boolean;
  coverImage: string | null;
  images: string[];
  amenities: Amenity[];
  rooms: Room[];
  reviews: Review[];
  createdAt: string;
  updatedAt: string;
}

// Booking
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export type PaymentMethod =
  | 'CHAPA'
  | 'TELEBIRR'
  | 'CBE_BIRR'
  | 'INTERNATIONAL_CARD'
  | 'PAYPAL'
  | 'WISE'
  | 'CASH_ON_ARRIVAL';

export type PaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'ON_ARRIVAL'
  | 'REFUNDED'
  | 'FAILED';

export interface Booking {
  id: string;
  propertyId: string;
  roomId?: string | null;
  guestId: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  totalPrice: string;
  status: BookingStatus;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  paymentReference?: string | null;
  paymentCurrency?: string;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingPayload {
  propertyId: string;
  roomId?: string;
  checkInDate: string;
  checkOutDate: string;
  guestCount?: number;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  paymentCurrency?: string;
}

