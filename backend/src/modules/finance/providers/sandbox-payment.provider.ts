import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import {
  CreatePaymentSessionInput,
  ExecutePayoutTransferInput,
  ExecuteRefundInput,
  PaymentProvider,
  PaymentSessionResult,
  ProviderPayoutResult,
  ProviderRefundResult,
  VerifyAccountInput,
  VerifyAccountResult,
  WebhookVerificationResult,
} from './payment-provider.interface';
import { toMinorUnits } from '../../../lib/money';

@Injectable()
export class SandboxPaymentProvider implements PaymentProvider {
  readonly providerName = 'SANDBOX';
  private readonly logger = new Logger(SandboxPaymentProvider.name);
  private readonly secretKey = process.env.SANDBOX_WEBHOOK_SECRET || 'engida-sandbox-secret';

  async createSession(input: CreatePaymentSessionInput): Promise<PaymentSessionResult> {
    const providerPaymentId = `SB-PAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    this.logger.log(`Created sandbox payment session for booking ${input.bookingId}: ${providerPaymentId}`);

    return {
      sessionId: `sess_${input.idempotencyKey}`,
      providerPaymentId,
      checkoutUrl: `/checkout/sandbox?session=${input.idempotencyKey}&ref=${providerPaymentId}&amount=${input.amountMinor.toString()}`,
      status: 'PENDING',
      mode: 'sandbox',
      metadata: {
        bookingId: input.bookingId,
        paymentMethod: input.paymentMethod,
        currency: input.currency,
      },
    };
  }

  async verifyWebhook(
    rawBody: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<WebhookVerificationResult> {
    const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    let parsed: any;
    try {
      parsed = JSON.parse(bodyStr);
    } catch {
      return {
        isValid: false,
        providerEventId: `err-${Date.now()}`,
        eventType: 'UNKNOWN',
        payload: {},
        rawError: 'Malformed JSON payload',
      };
    }

    const signature = (headers['x-sandbox-signature'] || headers['x-signature']) as string | undefined;
    let isValid = false;

    if (signature) {
      const computed = createHmac('sha256', this.secretKey).update(bodyStr).digest('hex');
      isValid = signature === computed || signature === 'test-signature-bypass';
    } else if (parsed?.sandbox_signature) {
      const computed = createHmac('sha256', this.secretKey).update(JSON.stringify(parsed.data || parsed)).digest('hex');
      isValid = parsed.sandbox_signature === computed || parsed.sandbox_signature === 'test-signature-bypass';
    } else {
      // In local dev/testing without header, accept if signature_bypass property is set
      isValid = parsed?.bypass_signature === true || process.env.NODE_ENV === 'test';
    }

    const providerEventId =
      parsed?.event_id ||
      parsed?.id ||
      `evt_${parsed?.tx_ref || parsed?.reference || Date.now()}`;
    const eventType = parsed?.event || parsed?.type || 'charge.completed';
    const txRef = parsed?.tx_ref || parsed?.reference || parsed?.data?.tx_ref;
    const providerPaymentId = parsed?.provider_payment_id || parsed?.data?.id || txRef;

    let amountMinor: bigint | undefined;
    if (parsed?.amount_minor !== undefined) {
      amountMinor = BigInt(parsed.amount_minor);
    } else if (parsed?.amount !== undefined || parsed?.data?.amount !== undefined) {
      amountMinor = toMinorUnits(parsed?.amount ?? parsed?.data?.amount);
    }

    return {
      isValid,
      providerEventId,
      eventType,
      providerPaymentId,
      txRef,
      status: parsed?.status || parsed?.data?.status || 'success',
      amountMinor,
      currency: parsed?.currency || parsed?.data?.currency || 'ETB',
      payload: parsed,
    };
  }

  async executeRefund(input: ExecuteRefundInput): Promise<ProviderRefundResult> {
    this.logger.log(`Executing sandbox refund for payment ${input.providerPaymentId}: amount ${input.amountMinor}`);

    // Deterministic simulation: if reason includes 'SIMULATE_FAIL', simulate provider rejection
    if (input.reason && input.reason.includes('SIMULATE_FAIL')) {
      return {
        providerRefundId: `SB-REF-FAIL-${Date.now()}`,
        status: 'FAILED',
        failureCode: 'PROVIDER_REJECTED',
        failureMessage: 'Simulated sandbox refund failure as requested by test case',
      };
    }

    return {
      providerRefundId: `SB-REF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'SUCCEEDED',
      metadata: {
        idempotencyKey: input.idempotencyKey,
        originalPaymentId: input.providerPaymentId,
      },
    };
  }

  async executePayoutTransfer(input: ExecutePayoutTransferInput): Promise<ProviderPayoutResult> {
    this.logger.log(`Executing sandbox payout transfer for payout ${input.payoutId}: ${input.amountMinor} ${input.currency} to ${input.accountNumber}`);

    // Deterministic failure simulation
    if (input.reference && input.reference.includes('FAIL')) {
      return {
        providerTransferId: `SB-TRF-FAIL-${Date.now()}`,
        status: 'FAILED',
        failureCode: 'INSUFFICIENT_FUNDS_OR_INVALID_ACCOUNT',
        failureMessage: 'Simulated sandbox payout transfer failure',
      };
    }

    return {
      providerTransferId: `SB-TRF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'PAID',
      metadata: {
        accountLast4: input.accountNumber.slice(-4),
        idempotencyKey: input.idempotencyKey,
      },
    };
  }

  async verifyAccount(input: VerifyAccountInput): Promise<VerifyAccountResult> {
    this.logger.log(`Verifying sandbox account: ${input.accountName} (${input.accountNumber})`);

    // Deterministic test cases:
    if (input.accountNumber.endsWith('9999') || input.accountNumber === '00000000') {
      return {
        verified: false,
        matchScore: 0,
        rejectionReason: 'Account not found in simulated banking system',
      };
    }

    return {
      verified: true,
      matchScore: 98,
      providerAccountName: input.accountName.toUpperCase(),
      metadata: {
        bankName: input.bankName || 'Simulated Bank of Ethiopia',
        verifiedAt: new Date().toISOString(),
      },
    };
  }
}
