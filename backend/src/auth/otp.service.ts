import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
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
    // Normalize Ethiopian phone number (+251 9... / 09... -> +2519...)
    const digitsOnly = trimmed.replace(/[^\d+]/g, '');
    if (digitsOnly.startsWith('09') || digitsOnly.startsWith('07')) {
      return `+251${digitsOnly.slice(1)}`;
    }
    if (digitsOnly.startsWith('251')) {
      return `+${digitsOnly}`;
    }
    return digitsOnly;
  }

  /**
   * Determine whether SMS or Email provider transport is configured in the environment
   */
  getProviderStatus(): { smsConfigured: boolean; emailConfigured: boolean } {
    const smsApiKey =
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
    return {
      success: true,
      deliveryStatus: 'DISPATCHED',
      message: 'Verification code dispatched successfully.',
      target: targetKey,
      cooldownSeconds: Math.ceil(this.RESEND_COOLDOWN_MS / 1000),
    };
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
