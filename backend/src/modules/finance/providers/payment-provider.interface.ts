export interface CreatePaymentSessionInput {
  bookingId: string;
  amountMinor: bigint;
  currency: string;
  paymentMethod: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  returnUrl?: string;
  callbackUrl?: string;
  propertyTitle: string;
  city: string;
  idempotencyKey: string;
}

export interface PaymentSessionResult {
  sessionId: string;
  checkoutUrl?: string;
  providerPaymentId?: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  mode: 'live' | 'sandbox';
  metadata?: Record<string, any>;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  providerEventId: string;
  eventType: string;
  providerPaymentId?: string;
  txRef?: string;
  status?: string;
  amountMinor?: bigint;
  currency?: string;
  payload: Record<string, any>;
  rawError?: string;
}

export interface ExecuteRefundInput {
  refundId: string;
  providerPaymentId: string;
  amountMinor: bigint;
  currency: string;
  reason: string;
  idempotencyKey: string;
}

export interface ProviderRefundResult {
  providerRefundId: string;
  status: 'SUCCEEDED' | 'PENDING' | 'FAILED';
  failureCode?: string;
  failureMessage?: string;
  metadata?: Record<string, any>;
}

export interface ExecutePayoutTransferInput {
  payoutId: string;
  accountName: string;
  accountNumber: string;
  phone?: string;
  bankName?: string;
  bankBranch?: string;
  swiftBic?: string;
  amountMinor: bigint;
  currency: string;
  idempotencyKey: string;
  reference: string;
}

export interface ProviderPayoutResult {
  providerTransferId: string;
  status: 'PAID' | 'PROCESSING' | 'FAILED';
  failureCode?: string;
  failureMessage?: string;
  metadata?: Record<string, any>;
}

export interface VerifyAccountInput {
  accountName: string;
  accountNumber: string;
  phone?: string;
  bankName?: string;
  provider: string;
}

export interface VerifyAccountResult {
  verified: boolean;
  matchScore?: number;
  providerAccountName?: string;
  rejectionReason?: string;
  metadata?: Record<string, any>;
}

export interface PaymentProvider {
  readonly providerName: string;

  createSession(input: CreatePaymentSessionInput): Promise<PaymentSessionResult>;

  verifyWebhook(rawBody: string | Buffer, headers: Record<string, string | string[] | undefined>): Promise<WebhookVerificationResult>;

  executeRefund(input: ExecuteRefundInput): Promise<ProviderRefundResult>;

  executePayoutTransfer(input: ExecutePayoutTransferInput): Promise<ProviderPayoutResult>;

  verifyAccount(input: VerifyAccountInput): Promise<VerifyAccountResult>;
}
