import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RefundsService } from './refunds.service';
import { Refund, RefundStatus } from '../entities/refund.entity';
import { User, UserRole, AdminRole } from '../../../users/entities/user.entity';

describe('RefundsService (Dual-Approval & Four-Eyes Principle)', () => {
  let service: RefundsService;
  let mockRefundRepo: any;
  let mockRefundEventRepo: any;
  let mockPaymentRepo: any;
  let mockEscrowRepo: any;
  let mockCommissionRepo: any;
  let mockBookingRepo: any;
  let mockCancelReqRepo: any;
  let mockCaseRepo: any;
  let mockSandboxProvider: any;
  let mockChapaProvider: any;
  let mockLedgerService: any;
  let mockSettingsService: any;
  let mockAuditService: any;
  let mockDataSource: any;

  const admin1: User = {
    id: 'admin-uuid-1',
    role: UserRole.ADMIN,
    adminRole: AdminRole.FINANCE_MANAGER,
    name: 'Admin One',
    email: 'admin1@engida.com',
  } as User;

  const admin2: User = {
    id: 'admin-uuid-2',
    role: UserRole.ADMIN,
    adminRole: AdminRole.SUPER_ADMIN,
    name: 'Admin Two',
    email: 'admin2@engida.com',
  } as User;

  beforeEach(() => {
    mockRefundRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((r) => Promise.resolve(r)),
      create: jest.fn().mockImplementation((r) => ({ id: 'ref-123', ...r })),
    };
    mockRefundEventRepo = {
      create: jest.fn().mockImplementation((e) => e),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };
    mockPaymentRepo = { findOne: jest.fn() };
    mockEscrowRepo = { findOne: jest.fn(), save: jest.fn() };
    mockCommissionRepo = { findOne: jest.fn() };
    mockBookingRepo = { findOne: jest.fn(), save: jest.fn() };
    mockCancelReqRepo = { findOne: jest.fn() };
    mockCaseRepo = { findOne: jest.fn(), save: jest.fn() };
    mockSandboxProvider = { issueRefund: jest.fn() };
    mockChapaProvider = { issueRefund: jest.fn() };
    mockLedgerService = { recordTransaction: jest.fn() };
    mockSettingsService = {
      getAllSettings: jest.fn().mockResolvedValue({
        refundDualApprovalThresholdMinor: 500000n, // ETB 5,000.00
        liveRefundsEnabled: false,
      }),
    };
    mockAuditService = { record: jest.fn().mockResolvedValue({}) };

    mockDataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => {
        const mockManager = {
          getRepository: (entity: any) => {
            if (entity === Refund) return mockRefundRepo;
            return {};
          },
          save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
        };
        return cb(mockManager);
      }),
    };

    service = new RefundsService(
      mockDataSource as unknown as DataSource,
      mockRefundRepo,
      mockRefundEventRepo,
      mockPaymentRepo,
      mockEscrowRepo,
      mockCommissionRepo,
      mockBookingRepo,
      mockCancelReqRepo,
      mockCaseRepo,
      mockSandboxProvider,
      mockChapaProvider,
      mockLedgerService,
      mockSettingsService,
      mockAuditService,
    );
  });

  it('strictly rejects approval when the approver is the same as the proposer for amounts >= threshold', async () => {
    const existingRefund: Refund = {
      id: 'refund-999',
      bookingId: 'booking-123',
      amountMinor: '600000', // ETB 6,000.00 (exceeds 5,000.00 threshold)
      currency: 'ETB',
      status: RefundStatus.PENDING_APPROVAL,
      proposedById: admin1.id,
    } as Refund;

    mockRefundRepo.findOne.mockResolvedValue(existingRefund);

    // Admin 1 attempts to approve their own proposed refund
    await expect(service.approveRefund('refund-999', admin1, 'Self approval attempt')).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.approveRefund('refund-999', admin1, 'Self approval attempt')).rejects.toThrow(
      /Dual approval violation/,
    );
  });

  it('allows approval when a second distinct administrator signs off', async () => {
    const existingRefund: Refund = {
      id: 'refund-999',
      bookingId: 'booking-123',
      amountMinor: '600000',
      currency: 'ETB',
      status: RefundStatus.PENDING_APPROVAL,
      proposedById: admin1.id,
    } as Refund;

    mockRefundRepo.findOne.mockResolvedValue(existingRefund);

    // Admin 2 (different person) approves
    const result = await service.approveRefund('refund-999', admin2, 'Policy verified');

    expect(result).toBeDefined();
    expect(result.status).toBe(RefundStatus.APPROVED);
    expect(result.approvedById).toBe(admin2.id);
  });
});
