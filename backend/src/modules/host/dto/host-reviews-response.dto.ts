export interface HostReviewItem {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyCity: string;
  guestName: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
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

export interface HostReviewsSummaryResponse {
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
