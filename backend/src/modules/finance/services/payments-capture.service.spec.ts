import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PaymentsCaptureService } from './payments-capture.service';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { ProviderEvent } from '../entities/provider-event.entity';
import { EscrowHold } from '../entities/escrow-hold.entity';
import { CommissionSnapshot } from '../entities/commission-snapshot.entity';
import { TaxLine } from '../entities/tax-line.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { User, UserRole } from '../../../users/entities/user.entity';

describe('PaymentsCaptureService (Server Quote Binding & Idempotent Capture)', () => {
  let service: PaymentsCaptureService;
  let mockPaymentRepo: any;
  let mockEventRepo: any;
  let mockEscrowRepo: any;
  let mockCommissionRepo: any;
  let mockTaxRepo: any;
  let mockBookingRepo: any;
  let mockSandboxProvider: any;
  let mockChapaProvider: any;
  let mockLedgerService: any;
  let mockSettingsService: any;
  let mockAuditService: any;
  let mockDataSource: any;

  const mockUser: User = {
    id: 'guest-uuid-1',
    role: UserRole.USER,
    email: 'guest@engida.com',
  } as User;

  beforeEach(() => {
    mockPaymentRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((p) => Promise.resolve(p)),
      create: jest.fn().mockImplementation((p) => ({ id: 'pay-123', ...p })),
    };
    mockEventRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((e) => e),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };
    mockEscrowRepo = {
      create: jest.fn().mockImplementation((e) => e),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };
    mockCommissionRepo = {
      create: jest.fn().mockImplementation((c) => c),
      save: jest.fn().mockImplementation((c) => Promise.resolve(c)),
    };
    mockTaxRepo = {
      create: jest.fn().mockImplementation((t) => t),
      save: jest.fn().mockImplementation((t) => Promise.resolve(t)),
    };
    mockBookingRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((b) => Promise.resolve(b)),
    };
    mockSandboxProvider = {
      providerName: 'SANDBOX',
      createSession: jest.fn().mockResolvedValue({
        sessionId: 'sand-sess-1',
        checkoutUrl: 'https://sandbox.engida.com/pay',
        status: 'PENDING',
        mode: 'sandbox',
      }),
      verifyWebhook: jest.fn().mockResolvedValue({
        isValid: true,
        providerEventId: 'evt-123',
        eventType: 'payment.succeeded',
        payload: {},
        status: 'success',
        txRef: 'ENGIDA-CHAPA-123',
      }),
    };
    mockChapaProvider = {
      providerName: 'CHAPA',
      createSession: jest.fn().mockResolvedValue({
        sessionId: 'chapa-sess-1',
        checkoutUrl: 'https://checkout.chapa.co/pay',
        status: 'PENDING',
        mode: 'sandbox',
      }),
      verifyWebhook: jest.fn(),
    };
    mockLedgerService = {
      recordTransaction: jest.fn().mockResolvedValue({ id: 'tx-123' }),
    };
    mockSettingsService = {
      getAllSettings: jest.fn().mockResolvedValue({
        liveCaptureEnabled: false,
        platformCommissionBps: 1000,
        vatRateBps: 1500,
        withholdingTaxBps: 300,
      }),
    };
    mockAuditService = { record: jest.fn().mockResolvedValue({}) };

    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => {
        const mockManager = {
          getRepository: (entity: any) => {
            if (entity === Payment) return mockPaymentRepo;
            if (entity === ProviderEvent) return mockEventRepo;
            if (entity === EscrowHold) return mockEscrowRepo;
            if (entity === CommissionSnapshot) return mockCommissionRepo;
            if (entity === TaxLine) return mockTaxRepo;
            if (entity === Booking) return mockBookingRepo;
            return {};
          },
          save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
        };
        return cb(mockManager);
      }),
    };

    service = new PaymentsCaptureService(
      mockDataSource as unknown as DataSource,
      mockPaymentRepo,
      mockEventRepo,
      mockEscrowRepo,
      mockCommissionRepo,
      mockTaxRepo,
      mockBookingRepo,
      mockSandboxProvider,
      mockChapaProvider,
      mockLedgerService,
      mockSettingsService,
      mockAuditService,
    );
  });

  it('rejects quote session creation if booking is not found', async () => {
    mockBookingRepo.findOne.mockResolvedValue(null);

    await expect(
      service.createPaymentSession(
        { bookingId: 'non-existent', paymentMethod: 'CHAPA', currency: 'ETB' },
        mockUser,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('binds session amount strictly from server booking record, ignoring client amounts', async () => {
    mockBookingRepo.findOne.mockResolvedValue({
      id: 'booking-123',
      userId: mockUser.id,
      totalPrice: 2500, // 2,500.00 ETB
      currency: 'ETB',
      property: { hostId: 'host-uuid' },
    });

    const session = await service.createPaymentSession(
      { bookingId: 'booking-123', paymentMethod: 'CHAPA', currency: 'ETB' },
      mockUser,
    );

    expect(session).toBeDefined();
    expect(mockPaymentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amountMinor: '250000', // Stored as 250000 minor units
        currency: 'ETB',
      }),
    );
  });

  it('idempotently handles duplicate webhook replay without re-posting ledger entries', async () => {
    mockSandboxProvider.verifyWebhook.mockResolvedValue({
      isValid: true,
      providerEventId: 'evt-123',
      eventType: 'payment.succeeded',
      payload: {},
      status: 'success',
      txRef: 'ENGIDA-CHAPA-123',
    });

    // Existing event found
    mockEventRepo.findOne.mockResolvedValue({
      id: 'evt-existing',
      provider: 'SANDBOX',
      providerEventId: 'evt-123',
      replayCount: 1,
    });

    const result = await service.handleWebhook('SANDBOX', '{"status":"success"}', {});

    expect(result).toEqual({ received: true, duplicate: true });
    expect(mockLedgerService.recordTransaction).not.toHaveBeenCalled();
  });
});
