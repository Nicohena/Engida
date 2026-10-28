import {
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../bookings/entities/booking.entity';

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

export interface HostEarningsSummaryResponse {
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
  paidAt: Date | null;
  createdAt: Date;
}

export interface HostTransactionsResponse {
  data: HostTransactionItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  currency: string;
}
