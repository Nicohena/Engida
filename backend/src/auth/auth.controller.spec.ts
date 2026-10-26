import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { OtpChannel } from './dto/otp.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: any;
  let mockOtpService: any;

  beforeEach(async () => {
    mockAuthService = {
      register: jest.fn().mockResolvedValue({ message: 'User registered successfully' }),
      login: jest.fn(),
      refreshTokens: jest.fn(),
      logout: jest.fn(),
    };

    mockOtpService = {
      sendOtp: jest.fn().mockResolvedValue({
        success: false,
        deliveryStatus: 'PROVIDER_UNCONFIGURED',
        message: 'No SMS gateway configured',
      }),
      verifyOtp: jest.fn().mockResolvedValue({
        verified: true,
        message: 'Contact successfully verified.',
      }),
      getProviderStatus: jest.fn().mockReturnValue({
        smsConfigured: false,
        emailConfigured: false,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: OtpService, useValue: mockOtpService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('development') } },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('OTP Endpoints', () => {
    it('delegates sendOtp to OtpService', async () => {
      const dto = {
        target: '+251911223344',
        channel: OtpChannel.PHONE,
        purpose: 'HOST_ONBOARDING',
      };
      const result = await controller.sendOtp(dto);
      expect(mockOtpService.sendOtp).toHaveBeenCalledWith(dto);
      expect(result.deliveryStatus).toBe('PROVIDER_UNCONFIGURED');
    });

    it('delegates verifyOtp to OtpService', async () => {
      const dto = {
        target: '+251911223344',
        code: '123456',
      };
      const result = await controller.verifyOtp(dto);
      expect(mockOtpService.verifyOtp).toHaveBeenCalledWith(dto);
      expect(result.verified).toBe(true);
    });

    it('delegates getOtpProviderStatus to OtpService', () => {
      const status = controller.getOtpProviderStatus();
      expect(mockOtpService.getProviderStatus).toHaveBeenCalled();
      expect(status.smsConfigured).toBe(false);
    });
  });
});
