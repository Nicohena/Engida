export interface FinanceLiveFlags {
  liveCaptureEnabled: boolean;
  liveRefundsEnabled: boolean;
  livePayoutsEnabled: boolean;
  autoReleaseEnabled: boolean;
}

export interface FinanceMetrics {
  grossCapturedMinor: string;
  heldInEscrowMinor: string;
  hostPayableMinor: string;
  platformRevenueMinor: string;
  taxWithholdingMinor: string;
  refundsTotalMinor: string;
  payoutsTotalMinor: string;
}

export interface LedgerInvariantHealth {
  totalDebitsMinor: string;
  totalCreditsMinor: string;
  differenceMinor: string;
  balanced: boolean;
}

export interface FinancePendingQueues {
  pendingRefundApprovals: number;
  pendingPayoutApprovals: number;
  frozenEscrowHolds: number;
  reconciliationIssues: number;
}

export interface FinanceSummary {
  status: 'CLEAN' | 'ATTENTION';
  liveFlags: FinanceLiveFlags;
  metrics: FinanceMetrics;
  ledgerInvariant: LedgerInvariantHealth;
  pendingQueues: FinancePendingQueues;
}

export interface PaymentListItem {
  id: string;
  bookingId: string;
  bookingReference?: string;
  propertyTitle?: string;
  guestName?: string;
  amountMinor: string;
  currency: string;
  paymentMethod: string;
  provider: string;
  providerTransactionId?: string | null;
  status: 'PENDING' | 'CAPTURED' | 'FAILED' | 'REFUNDED' | 'EXPIRED';
  capturedAt?: string | null;
  createdAt: string;
}

export interface EscrowHoldListItem {
  id: string;
  bookingId: string;
  bookingReference?: string;
  propertyTitle?: string;
  hostName?: string;
  amountMinor: string;
  currency: string;
  status: 'HELD' | 'DISPUTED' | 'RELEASED' | 'REFUNDED';
  disputeFrozen: boolean;
  freezeReason?: string | null;
  releaseDueAt: string;
  releasedAt?: string | null;
  createdAt: string;
}

export interface RefundListItem {
  id: string;
  bookingId: string;
  bookingReference?: string;
  guestName?: string;
  amountMinor: string;
  currency: string;
  reason: string;
  policyTier?: string | null;
  status: 'REQUESTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  proposedById: string;
  proposedByName?: string;
  approvedById?: string | null;
  approvedByName?: string;
  requiresDualApproval: boolean;
  providerRefundId?: string | null;
  createdAt: string;
}

export interface PayoutListItem {
  id: string;
  hostId: string;
  hostName?: string;
  amountMinor: string;
  currency: string;
  status: 'SCHEDULED' | 'PENDING_APPROVAL' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED';
  periodStart: string;
  periodEnd: string;
  providerTransferId?: string | null;
  accountLast4: string;
  proposedById?: string | null;
  proposedByName?: string;
  approvedById?: string | null;
  approvedByName?: string;
  requiresDualApproval: boolean;
  paidAt?: string | null;
  createdAt: string;
}

export interface PayoutAccountListItem {
  id: string;
  hostId: string;
  hostName?: string;
  hostEmail?: string;
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

export interface LedgerAccountItem {
  id: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  currency: string;
  balanceMinor: string;
  allowsDirectPosting: boolean;
  normalBalance: 'DEBIT' | 'CREDIT';
}

export interface LedgerEntryItem {
  id: string;
  transactionId: string;
  accountCode: string;
  accountName: string;
  direction: 'DEBIT' | 'CREDIT';
  amountMinor: string;
  currency: string;
  createdAt: string;
}

export interface LedgerTransactionItem {
  id: string;
  transactionNumber: string;
  type: string;
  reference: string;
  description: string;
  bookingId?: string | null;
  refundId?: string | null;
  payoutId?: string | null;
  entries: LedgerEntryItem[];
  createdAt: string;
}

export interface ReconciliationIssueItem {
  id: string;
  type: 'MISSING_PROVIDER_CAPTURE' | 'MISSING_LOCAL_CAPTURE' | 'AMOUNT_MISMATCH' | 'STATUS_MISMATCH';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'DETECTED' | 'INVESTIGATING' | 'RESOLVED' | 'IGNORED';
  provider: string;
  externalReference?: string | null;
  description: string;
  discrepancyMinor?: string | null;
  detectedAt: string;
  resolvedAt?: string | null;
  resolutionNotes?: string | null;
}

export interface FinanceSettingItem {
  key: string;
  value: string;
  description?: string | null;
  isSecret: boolean;
  updatedAt: string;
}
