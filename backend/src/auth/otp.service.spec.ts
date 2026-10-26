import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { OtpService } from './otp.service';
import { OtpChannel } from './dto/otp.dto';

describe('OtpService', () => {
  let service: OtpService;
  let mockConfigService: any;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockReturnValue(undefined), // default: unconfigured
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
  });

  describe('Provider Status Checking', () => {
    it('reports providers as unconfigured when environment variables are not set', () => {
      const status = service.getProviderStatus();
      expect(status.smsConfigured).toBe(false);
      expect(status.emailConfigured).toBe(false);
    });

    it('detects SMS and SMTP providers when configured in environment', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ETHIO_TELECOM_SMS_API_KEY') return 'secret-sms-key';
        if (key === 'SMTP_HOST') return 'smtp.engda.et';
        return undefined;
      });

      const status = service.getProviderStatus();
      expect(status.smsConfigured).toBe(true);
      expect(status.emailConfigured).toBe(true);
    });
  });

  describe('OTP Dispatch Security & Throttling', () => {
    it('returns PROVIDER_UNCONFIGURED without faking success when provider is absent', async () => {
      const result = await service.sendOtp({
        target: 'almaz@engda.et',
        channel: OtpChannel.EMAIL,
        purpose: 'HOST_ONBOARDING',
      });

      expect(result.success).toBe(false);
      expect(result.deliveryStatus).toBe('PROVIDER_UNCONFIGURED');
      expect((result as any).code).toBeUndefined(); // never expose raw OTP
      expect(result.cooldownSeconds).toBe(60);
    });

    it('returns DISPATCHED when provider is present and does not expose OTP in payload', async () => {
      mockConfigService.get.mockReturnValue('configured-provider-key');

      const result = await service.sendOtp({
        target: '+251911223344',
        channel: OtpChannel.PHONE,
        purpose: 'HOST_ONBOARDING',
      });

      expect(result.success).toBe(true);
      expect(result.deliveryStatus).toBe('DISPATCHED');
      expect((result as any).code).toBeUndefined(); // never expose raw OTP
    });

    it('normalizes international phone numbers to standard E.164', async () => {
      mockConfigService.get.mockReturnValue('configured-provider-key');

      const result = await service.sendOtp({
        target: '+1 (415) 555-2671',
        channel: OtpChannel.PHONE,
        purpose: 'HOST_ONBOARDING',
      });

      expect(result.success).toBe(true);
      expect(result.target).toBe('+14155552671');

      const store = (service as any).otpStore as Map<string, any>;
      expect(store.has('+14155552671')).toBe(true);
    });

    it('enforces 60-second resend throttling for the same contact target', async () => {
      mockConfigService.get.mockReturnValue('configured-provider-key');

      await service.sendOtp({
        target: '+251911223344',
        channel: OtpChannel.PHONE,
      });

      await expect(
        service.sendOtp({
          target: '+251911223344',
          channel: OtpChannel.PHONE,
        }),
      ).rejects.toThrow('Please wait');
    });

    it('enforces maximum 3 OTP dispatch requests per 10-minute sliding window', async () => {
      mockConfigService.get.mockReturnValue('configured-provider-key');
      const target = 'almaz-test@engda.et';

      // Send 1
      await service.sendOtp({ target, channel: OtpChannel.EMAIL });

      // Fast-forward lastSentAt past 60s cooldown by manipulating stored record
      const store = (service as any).otpStore;
      const key = target.toLowerCase();
      store.get(key).lastSentAt = Date.now() - 61000;

      // Send 2
      await service.sendOtp({ target, channel: OtpChannel.EMAIL });
      store.get(key).lastSentAt = Date.now() - 61000;

      // Send 3
      await service.sendOtp({ target, channel: OtpChannel.EMAIL });
      store.get(key).lastSentAt = Date.now() - 61000;

      // Send 4 should be rejected by rate-limit window
      await expect(
        service.sendOtp({ target, channel: OtpChannel.EMAIL }),
      ).rejects.toThrow('Too many verification code requests');
    });
  });

  describe('OTP Server-Side Verification & Single-Use Enforcement', () => {
    it('throws BadRequestException if no active OTP code was issued for contact', async () => {
      await expect(
        service.verifyOtp({
          target: 'unregistered@engda.et',
          code: '123456',
        }),
      ).rejects.toThrow('No active verification code found');
    });

    it('throws BadRequestException on incorrect code and decrements remaining attempts', async () => {
      mockConfigService.get.mockReturnValue('key');
      const target = '+251911000000';

      await service.sendOtp({ target, channel: OtpChannel.PHONE });

      await expect(
        service.verifyOtp({
          target,
          code: '000000',
        }),
      ).rejects.toThrow('Invalid verification code. 4 attempts remaining.');
    });

    it('invalidates code after 5 failed attempts', async () => {
      mockConfigService.get.mockReturnValue('key');
      const target = 'abuse-test@engda.et';

      await service.sendOtp({ target, channel: OtpChannel.EMAIL });

      for (let i = 0; i < 4; i++) {
        await expect(service.verifyOtp({ target, code: '000000' })).rejects.toThrow();
      }

      // 5th attempt invalidates code
      await expect(
        service.verifyOtp({ target, code: '000000' }),
      ).rejects.toThrow('Maximum verification attempts exceeded');

      // Subsequent attempt fails with no active code
      await expect(
        service.verifyOtp({ target, code: '000000' }),
      ).rejects.toThrow('No active verification code found');
    });

    it('successfully verifies correct code and invalidates it for single-use consumption', async () => {
      mockConfigService.get.mockReturnValue('key');
      const target = 'success@engda.et';

      await service.sendOtp({ target, channel: OtpChannel.EMAIL });

      // Retrieve stored record hash to simulate correct code verification
      const store = (service as any).otpStore;
      const key = target.toLowerCase();
      const crypto = require('crypto');
      const testCode = '654321';
      store.get(key).hash = crypto.createHash('sha256').update(testCode).digest('hex');

      const result = await service.verifyOtp({
        target,
        code: testCode,
      });

      expect(result.verified).toBe(true);
      expect(result.message).toContain('Contact successfully verified');

      // Re-verifying same code fails because it was consumed (single-use)
      await expect(
        service.verifyOtp({
          target,
          code: testCode,
        }),
      ).rejects.toThrow('No active verification code found');
    });

    it('rejects expired verification codes', async () => {
      mockConfigService.get.mockReturnValue('key');
      const target = 'expired@engda.et';

      await service.sendOtp({ target, channel: OtpChannel.EMAIL });

      const store = (service as any).otpStore;
      const key = target.toLowerCase();
      // Set expiration in the past
      store.get(key).expiresAt = Date.now() - 1000;

      await expect(
        service.verifyOtp({
          target,
          code: '123456',
        }),
      ).rejects.toThrow('Verification code has expired');
    });
  });
});
