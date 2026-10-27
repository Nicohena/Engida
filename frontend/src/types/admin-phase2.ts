export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'ON_ARRIVAL' | 'REFUNDED' | 'FAILED';
export type PaymentMethod =
  | 'CHAPA'
  | 'TELEBIRR'
  | 'CBE_BIRR'
  | 'INTERNATIONAL_CARD'
  | 'PAYPAL'
  | 'WISE'
  | 'CASH_ON_ARRIVAL';

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING: 'Awaiting host',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  ON_ARRIVAL: 'On arrival',
  REFUNDED: 'Refunded',
  FAILED: 'Failed',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CHAPA: 'Chapa',
  TELEBIRR: 'TeleBirr',
  CBE_BIRR: 'CBE Birr',
  INTERNATIONAL_CARD: 'International card',
  PAYPAL: 'PayPal',
  WISE: 'Wise',
  CASH_ON_ARRIVAL: 'Cash on arrival',
};

export interface AdminBookingParty {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}

export interface AdminBookingProperty {
  id: string;
  title: string;
  city: string;
  address: string;
  coverImage?: string | null;
}

export interface AdminBookingRoom {
  id: string;
  name: string;
}

export interface AdminBookingSummary {
  id: string;
  reference: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentCurrency: string;
  totalPrice: string | number;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  createdAt: string;
  updatedAt: string;
  guest: AdminBookingParty | null;
  host: AdminBookingParty | null;
  property: AdminBookingProperty | null;
  room: AdminBookingRoom | null;
}

export interface AdminBookingStatusHistory {
  id: string;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  source: 'GUEST' | 'HOST' | 'ADMIN' | 'SYSTEM';
  reason: string | null;
  actor: { id: string; name: string; email: string } | null;
  createdAt: string;
}

export type CancellationRequestStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'WITHDRAWN';
export type CancellationRequestSource = 'GUEST' | 'HOST' | 'ADMIN';

export interface CancellationRequest {
  id: string;
  bookingId: string;
  source: CancellationRequestSource;
  reason: string;
  status: CancellationRequestStatus;
  policyTier: string;
  estimatedRefundAmount: string | number;
  currency: string;
  policyPreview: Record<string, unknown> | null;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
  requestedBy: { id: string; name: string; email: string } | null;
  decidedBy: { id: string; name: string; email: string } | null;
}

export interface AvailabilityBlock {
  id: string;
  propertyId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  source: string;
  createdById: string | null;
  createdAt: string;
}

export interface AdminBookingCaseLink {
  id: string;
  number: string;
  subject: string;
  status: CaseStatus;
  priority: CasePriority;
  createdAt: string;
}

export interface AdminBookingDetail extends AdminBookingSummary {
  cancellationPolicy: string;
  payment: {
    method: PaymentMethod;
    status: PaymentStatus;
    reference: string | null;
    currency: string;
    paidAt: string | null;
  };
  cancellation: {
    cancelledAt: string | null;
    cancelledByType: string | null;
    reason: string | null;
  };
  statusHistory: AdminBookingStatusHistory[];
  cancellationRequests: CancellationRequest[];
  availability: {
    overlaps: Array<{
      id: string;
      reference: string;
      guestName: string;
      checkInDate: string;
      checkOutDate: string;
      status: BookingStatus;
    }>;
    blocks: AvailabilityBlock[];
  };
  cases: AdminBookingCaseLink[];
  allowedTransitions: BookingStatus[];
}

export interface CancellationPreview {
  bookingId: string;
  reference: string;
  checkInDate: string;
  totalPrice: string | number;
  currency: string;
  policyTier: string;
  policyLabel: string;
  refundPercent: number;
  refundAmount: string;
  hoursUntilCheckIn: number;
  rule: string;
  evaluatedAt: string;
  note: string;
}

export interface AdminBookingsResponse {
  data: AdminBookingSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: Record<BookingStatus, number>;
}

export type CaseType = 'COMPLAINT' | 'DISPUTE' | 'SAFETY' | 'SUPPORT' | 'CANCELLATION';
export type CaseCategory = 'BOOKING' | 'LISTING' | 'ACCOUNT' | 'REVIEW' | 'PAYMENT' | 'OTHER';
export type CasePriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type CaseSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type CaseStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_ON_REQUESTER'
  | 'WAITING_ON_INTERNAL'
  | 'RESOLVED'
  | 'CLOSED';
export type CompensationStatus = 'NONE' | 'PROPOSED' | 'APPROVED' | 'REJECTED';
export type CaseMessageDirection = 'OUTBOUND' | 'INBOUND';
export type CaseMessageChannel = 'IN_APP' | 'EMAIL' | 'PHONE' | 'SYSTEM';
export type CaseMessageDeliveryStatus = 'DELIVERED_IN_APP' | 'LOGGED' | 'FAILED';

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  COMPLAINT: 'Complaint',
  DISPUTE: 'Dispute',
  SAFETY: 'Safety',
  SUPPORT: 'Support',
  CANCELLATION: 'Cancellation',
};

export const CASE_CATEGORY_LABELS: Record<CaseCategory, string> = {
  BOOKING: 'Booking',
  LISTING: 'Listing',
  ACCOUNT: 'Account',
  REVIEW: 'Review',
  PAYMENT: 'Payment',
  OTHER: 'Other',
};

export const CASE_PRIORITY_LABELS: Record<CasePriority, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export const CASE_SEVERITY_LABELS: Record<CaseSeverity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  WAITING_ON_REQUESTER: 'Waiting on requester',
  WAITING_ON_INTERNAL: 'Waiting on internal',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const CASE_CHANNEL_LABELS: Record<CaseMessageChannel, string> = {
  IN_APP: 'In-app',
  EMAIL: 'Email',
  PHONE: 'Phone',
  SYSTEM: 'System',
};

export const CASE_DELIVERY_LABELS: Record<CaseMessageDeliveryStatus, string> = {
  DELIVERED_IN_APP: 'Delivered in app',
  LOGGED: 'Logged',
  FAILED: 'Delivery failed',
};

export const COMPENSATION_STATUS_LABELS: Record<CompensationStatus, string> = {
  NONE: 'None',
  PROPOSED: 'Awaiting decision',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export interface AdminCaseSummary {
  id: string;
  number: string;
  type: CaseType;
  category: CaseCategory;
  priority: CasePriority;
  severity: CaseSeverity;
  status: CaseStatus;
  subject: string;
  requesterName: string;
  requesterEmail: string | null;
  requesterUserId: string | null;
  createdAt: string;
  updatedAt: string;
  escalatedAt: string | null;
  firstResponseBreachedAt: string | null;
  resolutionBreachedAt: string | null;
  firstResponseDueAt: string;
  resolutionDueAt: string;
  overdue: boolean;
  assignee: {
    id: string;
    name: string;
    email: string;
    adminRole: string | null;
  } | null;
  booking: {
    id: string;
    reference: string;
    status: BookingStatus;
    checkInDate: string;
    checkOutDate: string;
  } | null;
  property: { id: string; title: string; city: string } | null;
  compensationStatus: CompensationStatus;
  compensationAmount: string | number | null;
  compensationCurrency: string;
}

export interface CaseMessage {
  id: string;
  direction: CaseMessageDirection;
  channel: CaseMessageChannel;
  authorName: string;
  authorEmail: string | null;
  body: string;
  deliveryStatus: CaseMessageDeliveryStatus;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
}

export interface CaseNote {
  id: string;
  body: string;
  author: { id: string; name: string } | null;
  createdAt: string;
}

export interface CaseAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  caption: string | null;
  uploadedBy: { id: string; name: string } | null;
  createdAt: string;
}

export interface CaseEvent {
  id: string;
  type: string;
  fromValue: string | null;
  toValue: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  actor: { id: string; name: string } | null;
  createdAt: string;
}

export interface AdminCaseDetail extends AdminCaseSummary {
  description: string;
  context: Record<string, unknown> | null;
  firstRespondedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  escalationReason: string | null;
  lastMessageAt: string | null;
  compensation: {
    status: CompensationStatus;
    amount: string | number | null;
    currency: string;
    note: string | null;
    proposedBy: { id: string; name: string } | null;
    decidedBy: { id: string; name: string } | null;
    decidedAt: string | null;
  };
  messages: CaseMessage[];
  notes: CaseNote[];
  attachments: CaseAttachment[];
  events: CaseEvent[];
  allowedTransitions: CaseStatus[];
  notifyInApp: boolean;
}

export interface AdminCasesResponse {
  data: AdminCaseSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: Record<CaseStatus, number>;
  overdue: number;
  unassigned: number;
}

export interface CaseAssignee {
  id: string;
  name: string;
  email: string;
  adminRole: string | null;
}

export interface CannedResponse {
  id: string;
  title: string;
  body: string;
  category: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function formatMoney(
  amount: string | number | null | undefined,
  currency = 'ETB',
): string {
  if (amount === null || amount === undefined || amount === '') return '—';
  const numeric = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(numeric)) return `${currency} ${amount}`;
  return `${currency} ${numeric.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function shortDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function shortDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function relativeTime(value: string | null | undefined): string {
  if (!value) return '—';
  const diff = new Date(value).getTime() - Date.now();
  const absolute = Math.abs(diff);
  const minutes = Math.round(absolute / 60_000);
  const hours = Math.round(absolute / 3_600_000);
  const days = Math.round(absolute / 86_400_000);
  const amount = minutes < 60 ? `${minutes}m` : hours < 48 ? `${hours}h` : `${days}d`;
  return diff >= 0 ? `in ${amount}` : `${amount} ago`;
}
