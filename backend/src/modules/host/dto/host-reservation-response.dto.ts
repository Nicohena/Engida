import { BookingStatus, PaymentMethod, PaymentStatus } from '../../bookings/entities/booking.entity';
import { ListingType } from '../../properties/entities/property.entity';

export interface HostReservationPropertySummary {
  id: string;
  title: string;
  coverImage: string | null;
  city: string;
  listingType: ListingType;
}

export interface HostReservationGuestSummary {
  id: string;
  name: string;
  email: string;
}

export interface HostReservationRoomSummary {
  id: string;
  title: string;
  roomNumber: string;
}

export interface HostReservationResponse {
  id: string;
  property: HostReservationPropertySummary;
  guest: HostReservationGuestSummary;
  room: HostReservationRoomSummary | null;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  totalPrice: number;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentReference: string | null;
  paymentCurrency: string;
  paidAt: Date | null;
  createdAt: Date;
}


export interface HostReservationsPage {
  data: HostReservationResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
