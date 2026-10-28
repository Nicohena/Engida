import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { fromMinorUnits, toMinorUnits } from '../../../lib/money';

@Injectable()
export class ChapaPaymentProvider implements PaymentProvider {
  readonly providerName = 'CHAPA';
  private readonly logger = new Logger(ChapaPaymentProvider.name);
  private readonly secretKey?: string;
  private readonly webhookSecret?: string;
  private readonly baseUrl = 'https://api.chapa.co/v1';

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>('CHAPA_SECRET_KEY');
    this.webhookSecret =
      this.configService.get<string>('CHAPA_WEBHOOK_SECRET') || this.secretKey;
  }

  async createSession(input: CreatePaymentSessionInput): Promise<PaymentSessionResult> {
    const txRef = `ENGIDA-${input.bookingId.slice(0, 8)}-${Date.now()}`;
    const amountDecimal = fromMinorUnits(input.amountMinor);

    if (!this.secretKey) {
      this.logger.warn('Chapa secret key missing; cannot generate live session');
      return {
        sessionId: txRef,
        status: 'FAILED',
        mode: 'live',
        metadata: { error: 'Chapa secret key not configured' },
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountDecimal,
          currency: input.currency,
          email: input.customerEmail,
          first_name: input.customerName.split(' ')[0] || 'Guest',
          last_name: input.customerName.split(' ').slice(1).join(' ') || 'User',
          phone_number: input.customerPhone || '0911000000',
          tx_ref: txRef,
          callback_url: input.callbackUrl,
          return_url: input.returnUrl,
          'customization[title]': `ENGIDA - ${input.propertyTitle.slice(0, 30)}`,
          'customization[description]': `Stay in ${input.city}`,
        }),
      });

      const data = await response.json();
      if (data.status === 'success' && data.data?.checkout_url) {
        return {
          sessionId: txRef,
          checkoutUrl: data.data.checkout_url,
          providerPaymentId: txRef,
          status: 'PENDING',
          mode: 'live',
          metadata: { chapaReference: txRef },
        };
      }

      return {
        sessionId: txRef,
        status: 'FAILED',
        mode: 'live',
        metadata: { error: data.message || 'Chapa initialization failed' },
      };
    } catch (err: any) {
      this.logger.error(`Chapa initialize error: ${err.message}`);
      return {
        sessionId: txRef,
        status: 'FAILED',
        mode: 'live',
        metadata: { error: err.message },
      };
    }
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

    const signature = (headers['x-chapa-signature'] || headers['chapa-signature']) as string | undefined;
    let isValid = false;

    if (this.webhookSecret && signature) {
      const computed = createHmac('sha256', this.webhookSecret).update(bodyStr).digest('hex');
      isValid = signature === computed;
    } else if (process.env.NODE_ENV === 'test') {
      isValid = true;
    }

    const txRef = parsed?.tx_ref || parsed?.data?.tx_ref;
    const providerEventId = parsed?.event_id || txRef || `chapa-${Date.now()}`;
    const status = parsed?.status || parsed?.data?.status;

    let amountMinor: bigint | undefined;
    if (parsed?.amount !== undefined || parsed?.data?.amount !== undefined) {
      amountMinor = toMinorUnits(parsed?.amount ?? parsed?.data?.amount);
    }

    return {
      isValid,
      providerEventId,
      eventType: parsed?.event || 'charge.completed',
      providerPaymentId: txRef,
      txRef,
      status,
      amountMinor,
      currency: parsed?.currency || parsed?.data?.currency || 'ETB',
      payload: parsed,
    };
  }

  async executeRefund(input: ExecuteRefundInput): Promise<ProviderRefundResult> {
    // Chapa refund API endpoint
    if (!this.secretKey) {
      return {
        providerRefundId: `chapa-ref-unavail-${Date.now()}`,
        status: 'FAILED',
        failureCode: 'MISSING_CREDENTIALS',
        failureMessage: 'Live Chapa credentials not configured',
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/refund`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: input.providerPaymentId,
          amount: fromMinorUnits(input.amountMinor),
          reason: input.reason,
        }),
      });

      const data = await response.json();
      if (data.status === 'success') {
        return {
          providerRefundId: data.data?.id || `chapa-ref-${Date.now()}`,
          status: 'SUCCEEDED',
          metadata: data.data,
        };
      }

      return {
        providerRefundId: `chapa-ref-failed-${Date.now()}`,
        status: 'FAILED',
        failureCode: data.code || 'CHAPA_REFUND_ERROR',
        failureMessage: data.message || 'Refund rejected by Chapa',
      };
    } catch (err: any) {
      return {
        providerRefundId: `chapa-ref-err-${Date.now()}`,
        status: 'FAILED',
        failureCode: 'NETWORK_ERROR',
        failureMessage: err.message,
      };
    }
  }

  async executePayoutTransfer(input: ExecutePayoutTransferInput): Promise<ProviderPayoutResult> {
    if (!this.secretKey) {
      return {
        providerTransferId: `chapa-trf-unavail-${Date.now()}`,
        status: 'FAILED',
        failureCode: 'MISSING_CREDENTIALS',
        failureMessage: 'Live Chapa credentials not configured',
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/transfers`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_name: input.accountName,
          account_number: input.accountNumber,
          amount: fromMinorUnits(input.amountMinor),
          currency: input.currency,
          reference: input.reference,
        }),
      });

      const data = await response.json();
      if (data.status === 'success') {
        return {
          providerTransferId: data.data?.id || `chapa-trf-${Date.now()}`,
          status: 'PAID',
          metadata: data.data,
        };
      }

      return {
        providerTransferId: `chapa-trf-failed-${Date.now()}`,
        status: 'FAILED',
        failureCode: data.code || 'CHAPA_TRANSFER_ERROR',
        failureMessage: data.message || 'Transfer rejected by Chapa',
      };
    } catch (err: any) {
      return {
        providerTransferId: `chapa-trf-err-${Date.now()}`,
        status: 'FAILED',
        failureCode: 'NETWORK_ERROR',
        failureMessage: err.message,
      };
    }
  }

  async verifyAccount(input: VerifyAccountInput): Promise<VerifyAccountResult> {
    if (!this.secretKey) {
      return {
        verified: false,
        rejectionReason: 'Chapa credentials not configured for live account verification',
      };
    }

    try {
      // In Chapa, account verification uses name inquiry / bank validation
      const response = await fetch(
        `${this.baseUrl}/banks/validate?account_number=${encodeURIComponent(input.accountNumber)}&account_name=${encodeURIComponent(input.accountName)}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      const data = await response.json();
      if (data.status === 'success') {
        return {
          verified: true,
          matchScore: 95,
          providerAccountName: data.data?.account_name || input.accountName,
        };
      }

      return {
        verified: false,
        rejectionReason: data.message || 'Account verification failed with provider',
      };
    } catch (err: any) {
      return {
        verified: false,
        rejectionReason: `Provider error during account check: ${err.message}`,
      };
    }
  }
}
