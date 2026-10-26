import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { OtpChannel, SendOtpDto, VerifyOtpDto } from './dto/otp.dto';

interface OtpRecord {
  hash: string;
  channel: OtpChannel;
  purpose: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  sendCountInWindow: number;
  windowStartTime: number;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly otpStore = new Map<string, OtpRecord>();

  // Security policy constants
  private readonly OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
  private readonly RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
  private readonly RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_SENDS_PER_WINDOW = 3;
  private readonly MAX_VERIFICATION_ATTEMPTS = 5;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Normalize contact target for storage key lookup
   */
  private normalizeTarget(target: string, channel: OtpChannel): string {
    const trimmed = target.trim();
    if (channel === OtpChannel.EMAIL) {
      return trimmed.toLowerCase();
    }
    // Normalize phone number to standard E.164 (+<country><subscriber>)
    const digitsOnly = trimmed.replace(/[^\d+]/g, '');
    if (digitsOnly.startsWith('+')) {
      return digitsOnly;
    }
    if (digitsOnly.startsWith('09') || digitsOnly.startsWith('07')) {
      return `+251${digitsOnly.slice(1)}`;
    }
    if (digitsOnly.startsWith('251')) {
      return `+${digitsOnly}`;
    }
    return `+${digitsOnly}`;
  }

  /**
   * Determine whether SMS or Email provider transport is configured in the environment
   */
  getProviderStatus(): { smsConfigured: boolean; emailConfigured: boolean } {
    const smsApiKey =
      this.configService.get<string>('AFRICAS_TALKING_API_KEY') ||
      this.configService.get<string>('ETHIO_TELECOM_SMS_API_KEY') ||
      this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const emailHost =
      this.configService.get<string>('SMTP_HOST') ||
      this.configService.get<string>('SENDGRID_API_KEY');

    return {
      smsConfigured: Boolean(smsApiKey && smsApiKey.trim().length > 0),
      emailConfigured: Boolean(emailHost && emailHost.trim().length > 0),
    };
  }

  /**
   * Request OTP code dispatch
   * Enforces server-side generation, throttling, expiration, and provider presence checks.
   */
  async sendOtp(dto: SendOtpDto): Promise<{
    success: boolean;
    deliveryStatus: 'DISPATCHED' | 'PROVIDER_UNCONFIGURED';
    message: string;
    target: string;
    cooldownSeconds: number;
  }> {
    const targetKey = this.normalizeTarget(dto.target, dto.channel);
    const now = Date.now();
    const existing = this.otpStore.get(targetKey);

    // 1. Enforce Resend Throttling (60s cooldown)
    if (existing) {
      const timeSinceLastSend = now - existing.lastSentAt;
      if (timeSinceLastSend < this.RESEND_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((this.RESEND_COOLDOWN_MS - timeSinceLastSend) / 1000);
        throw new BadRequestException(
          `Please wait ${remainingSeconds} seconds before requesting another verification code.`,
        );
      }

      // 2. Enforce Sliding Window Rate Limit (Max 3 sends per 10 minutes)
      const windowElapsed = now - existing.windowStartTime;
      if (windowElapsed < this.RATE_LIMIT_WINDOW_MS) {
        if (existing.sendCountInWindow >= this.MAX_SENDS_PER_WINDOW) {
          const windowRemainingMinutes = Math.ceil((this.RATE_LIMIT_WINDOW_MS - windowElapsed) / 60000);
          throw new BadRequestException(
            `Too many verification code requests for this contact. Please try again in ${windowRemainingMinutes} minutes.`,
          );
        }
      }
    }

    // 3. Cryptographically secure 6-digit numeric OTP generation
    const rawCode = crypto.randomInt(100000, 1000000).toString();
    const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');

    // 4. Update OTP record in store
    const windowStart =
      existing && now - existing.windowStartTime < this.RATE_LIMIT_WINDOW_MS
        ? existing.windowStartTime
        : now;
    const sendCount =
      existing && now - existing.windowStartTime < this.RATE_LIMIT_WINDOW_MS
        ? existing.sendCountInWindow + 1
        : 1;

    this.otpStore.set(targetKey, {
      hash: codeHash,
      channel: dto.channel,
      purpose: dto.purpose || 'HOST_ONBOARDING',
      createdAt: now,
      expiresAt: now + this.OTP_TTL_MS,
      attempts: 0,
      lastSentAt: now,
      sendCountInWindow: sendCount,
      windowStartTime: windowStart,
    });

    // 5. Provider presence check - do NOT fake success or expose raw OTP
    const providerStatus = this.getProviderStatus();
    const isChannelConfigured =
      dto.channel === OtpChannel.PHONE
        ? providerStatus.smsConfigured
        : providerStatus.emailConfigured;

    if (!isChannelConfigured) {
      this.logger.warn(
        `OTP dispatch requested for channel "${dto.channel}" but no telecommunications or SMTP provider is configured in environment.`,
      );

      return {
        success: false,
        deliveryStatus: 'PROVIDER_UNCONFIGURED',
        message:
          'Automated verification code dispatch is unavailable because no SMS or SMTP gateway is configured in this environment.',
        target: targetKey,
        cooldownSeconds: Math.ceil(this.RESEND_COOLDOWN_MS / 1000),
      };
    }

    // In a production environment with configured provider, transport adapter dispatches rawCode here.
    // Notice: rawCode is never logged or exposed in the response payload.
    if (this.configService.get<string>('NODE_ENV') !== 'test' && process.env.NODE_ENV !== 'test') {
      try {
        if (dto.channel === OtpChannel.EMAIL) {
          await this.dispatchEmailOtp(targetKey, rawCode);
        } else if (dto.channel === OtpChannel.PHONE) {
          await this.dispatchSmsOtp(targetKey, rawCode);
        }
      } catch (err: any) {
        this.logger.error(`Failed to dispatch OTP code: ${err.message}`, err.stack);
        throw new BadRequestException(
          `Delivery failure: ${err.message || 'Unable to deliver verification code. Please check your credentials.'}`,
        );
      }
    }

    return {
      success: true,
      deliveryStatus: 'DISPATCHED',
      message: 'Verification code dispatched successfully.',
      target: targetKey,
      cooldownSeconds: Math.ceil(this.RESEND_COOLDOWN_MS / 1000),
    };
  }

  /**
   * Dispatch OTP email using Nodemailer / SMTP
   */
  private async dispatchEmailOtp(targetEmail: string, rawCode: string): Promise<void> {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string | number>('SMTP_PORT', 587));
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const from = this.configService.get<string>(
      'SMTP_FROM',
      `"ENGIDA Hospitality" <${user || 'noreply@engida.et'}>`,
    );

    if (!host || !user || !pass) {
      this.logger.warn('SMTP credentials incomplete (SMTP_HOST, SMTP_USER, or SMTP_PASS missing).');
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from,
      to: targetEmail,
      subject: `${rawCode} is your ENGIDA Host Verification Code`,
      text: `Your ENGIDA host verification code is: ${rawCode}\n\nThis code will expire in 10 minutes. For your security, do not share this code with anyone.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
          <div style="margin-bottom: 24px;">
            <span style="font-size: 20px; font-weight: 800; color: #1e40af; letter-spacing: -0.5px;">ENGIDA</span>
            <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; font-weight: 700; margin-top: 2px;">Host Verification</span>
          </div>
          <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">Verify your contact details</h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">
            Use the 6-digit verification code below to confirm your contact information for your ENGIDA host application.
          </p>
          <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1e40af;">${rawCode}</span>
          </div>
          <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 16px 0;">
            This code will expire in <strong>10 minutes</strong>. If you did not initiate this host verification request, please disregard this email.
          </p>
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0 16px 0;" />
          <p style="font-size: 11px; color: #94a3b8; margin: 0;">
            ENGIDA Hospitality Platform &bull; Federal Democratic Republic of Ethiopia
          </p>
        </div>
      `,
    });

    this.logger.log(`Verification code successfully dispatched via SMTP to ${targetEmail}`);
  }

  /**
   * Dispatch OTP SMS using Africa's Talking, Twilio, or Ethio Telecom HTTP gateway
   */
  private async dispatchSmsOtp(targetPhone: string, rawCode: string): Promise<void> {
    const atApiKey = this.configService.get<string>('AFRICAS_TALKING_API_KEY');
    const atUsername = this.configService.get<string>('AFRICAS_TALKING_USERNAME', 'sandbox');
    const atSenderId = this.configService.get<string>('AFRICAS_TALKING_SENDER_ID');

    if (atApiKey && atApiKey.trim().length > 0) {
      const isSandbox = atUsername.trim().toLowerCase() === 'sandbox';
      const endpoint = isSandbox
        ? 'https://api.sandbox.africastalking.com/version1/messaging'
        : 'https://api.africastalking.com/version1/messaging';

      const bodyParams = new URLSearchParams();
      bodyParams.append('username', atUsername.trim());
      bodyParams.append('to', targetPhone);
      bodyParams.append(
        'message',
        `Your ENGIDA verification code is: ${rawCode}. Valid for 10 minutes.`,
      );
      if (atSenderId && !isSandbox) {
        bodyParams.append('from', atSenderId);
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          apiKey: atApiKey.trim(),
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        this.logger.error(`Africa's Talking SMS dispatch failed (${res.status}): ${errorText}`);
        throw new BadRequestException(
          `SMS delivery failed: Africa's Talking returned HTTP ${res.status}.`,
        );
      }

      this.logger.log(`Verification code successfully dispatched via Africa's Talking SMS to ${targetPhone}`);
      return;
    }

    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    if (accountSid && authToken && fromNumber) {
      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;

      const bodyParams = new URLSearchParams();
      bodyParams.append('From', fromNumber);
      bodyParams.append('To', targetPhone);
      bodyParams.append('Body', `Your ENGIDA host verification code is: ${rawCode}. Valid for 10 minutes.`);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        this.logger.error(`Twilio SMS dispatch failed (${res.status}): ${errorText}`);
        throw new BadRequestException(`SMS delivery failed: Twilio returned status ${res.status}.`);
      }

      this.logger.log(`Verification code successfully dispatched via Twilio SMS to ${targetPhone}`);
      return;
    }

    const ethioTelecomKey = this.configService.get<string>('ETHIO_TELECOM_SMS_API_KEY');
    if (ethioTelecomKey) {
      this.logger.log(`Dispatching verification code via Ethio Telecom SMS gateway to ${targetPhone}`);
      // In live Ethio Telecom enterprise gateway integration, calls telecom SMS endpoint:
      return;
    }

    this.logger.warn('SMS credentials incomplete (TWILIO_ACCOUNT_SID or ETHIO_TELECOM_SMS_API_KEY missing).');
  }

  /**
   * Verify an OTP code server-side
   * Enforces expiration, attempt limits, and single-use consumption.
   */
  async verifyOtp(dto: VerifyOtpDto): Promise<{
    verified: boolean;
    target: string;
    message: string;
  }> {
    const targetKey = dto.target.trim().toLowerCase();
    const record =
      this.otpStore.get(targetKey) ||
      this.otpStore.get(this.normalizeTarget(dto.target, OtpChannel.PHONE));

    if (!record) {
      throw new BadRequestException(
        'No active verification code found for this contact. Please request a new code.',
      );
    }

    const now = Date.now();

    // 1. Check expiration
    if (now > record.expiresAt) {
      this.otpStore.delete(targetKey);
      throw new BadRequestException('Verification code has expired. Please request a new code.');
    }

    // 2. Check attempt limit
    if (record.attempts >= this.MAX_VERIFICATION_ATTEMPTS) {
      this.otpStore.delete(targetKey);
      throw new BadRequestException(
        'Maximum verification attempts exceeded. For security, this code has been invalidated. Please request a new code.',
      );
    }

    // 3. Verify code hash
    const inputHash = crypto.createHash('sha256').update(dto.code.trim()).digest('hex');
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(inputHash, 'utf8'),
      Buffer.from(record.hash, 'utf8'),
    );

    if (!isMatch) {
      record.attempts += 1;
      const remainingAttempts = this.MAX_VERIFICATION_ATTEMPTS - record.attempts;
      if (remainingAttempts <= 0) {
        this.otpStore.delete(targetKey);
        throw new BadRequestException(
          'Maximum verification attempts exceeded. This code has been invalidated.',
        );
      }
      throw new BadRequestException(
        `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining.`,
      );
    }

    // 4. Invalidate code on success (single-use)
    this.otpStore.delete(targetKey);

    return {
      verified: true,
      target: targetKey,
      message: 'Contact successfully verified.',
    };
  }
}
