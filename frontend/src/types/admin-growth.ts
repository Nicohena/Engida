export interface PropertyCategory {
  id: string;
  slug: string;
  name: string;
  nameAmharic: string | null;
  description: string | null;
  icon: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Destination {
  id: string;
  slug: string;
  name: string;
  nameAmharic: string | null;
  region: string;
  tagline: string | null;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  isFeatured: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AmenityCategory =
  | 'ESSENTIALS'
  | 'KITCHEN'
  | 'SAFETY'
  | 'OUTDOOR'
  | 'WELLNESS'
  | 'SERVICES';

export interface AmenityItem {
  id: string;
  name: string;
  nameAmharic: string | null;
  category: AmenityCategory;
  icon: string | null;
  displayOrder: number;
  isActive: boolean;
}

export type CouponDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface CouponItem {
  id: string;
  code: string;
  description: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  currency: string;
  minBookingAmountMinor: number;
  maxDiscountAmountMinor: number | null;
  startsAt: string;
  expiresAt: string | null;
  maxRedemptions: number | null;
  redemptionsCount: number;
  perUserLimit: number;
  isActive: boolean;
  createdAt: string;
  redemptions?: CouponRedemptionItem[];
}

export interface CouponRedemptionItem {
  id: string;
  couponId: string;
  userId: string;
  bookingId: string | null;
  discountAmountMinor: number;
  redeemedAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export type FaqCategory = 'BOOKING' | 'PAYMENTS' | 'HOSTING' | 'SAFETY' | 'GENERAL';

export interface FaqItemRecord {
  id: string;
  category: FaqCategory;
  question: string;
  questionAmharic: string | null;
  answer: string;
  answerAmharic: string | null;
  displayOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContentBlockRecord {
  id: string;
  slug: string;
  title: string;
  content: string;
  metaDescription: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}
