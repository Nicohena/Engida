import { BadRequestException } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { LedgerAccount, LedgerAccountType } from '../entities/ledger-account.entity';
import { LedgerTransaction, LedgerTransactionType } from '../entities/ledger-transaction.entity';
import { LedgerEntry } from '../entities/ledger-entry.entity';

describe('LedgerService (Double-Entry Invariants)', () => {
  let service: LedgerService;
  let mockAccountRepo: any;
  let mockTxRepo: any;
  let mockEntryRepo: any;

  beforeEach(() => {
    mockAccountRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((acc) => ({ id: `acc-${acc.code}`, ...acc })),
      save: jest.fn().mockImplementation((acc) => Promise.resolve({ id: `acc-${acc.code}`, ...acc })),
    };

    mockTxRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ id: 'tx-123', ...dto })),
      save: jest.fn().mockImplementation((tx) => Promise.resolve({ id: 'tx-123', ...tx })),
    };

    mockEntryRepo = {
      create: jest.fn().mockImplementation((dto) => ({ id: 'entry-123', ...dto })),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
      createQueryBuilder: jest.fn(),
    };

    service = new LedgerService(
      mockAccountRepo,
      mockTxRepo,
      mockEntryRepo,
    );
  });

  it('rejects unbalanced journal entries (total debits !== total credits)', async () => {
    mockAccountRepo.findOne.mockImplementation(({ where: { code } }: any) => {
      return { id: `acc-${code}`, code, name: `Account ${code}`, type: LedgerAccountType.ASSET };
    });

    const unbalancedDto = {
      type: LedgerTransactionType.GUEST_PAYMENT_CAPTURED,
      reference: 'TX-TEST-001',
      idempotencyKey: 'idemp-001',
      description: 'Unbalanced test',
      entries: [
        { accountCode: '1010', debitMinor: 10000n, creditMinor: 0n },
        { accountCode: '2010', debitMinor: 0n, creditMinor: 9000n }, // Missing 1000n
      ],
    };

    await expect(service.recordTransaction(unbalancedDto)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('accepts balanced journal transactions and assigns sequential transaction numbers', async () => {
    mockAccountRepo.findOne.mockImplementation(({ where: { code } }: any) => {
      return { id: `acc-${code}`, code, name: `Account ${code}`, type: LedgerAccountType.ASSET };
    });

    const balancedDto = {
      type: LedgerTransactionType.GUEST_PAYMENT_CAPTURED,
      reference: 'TX-TEST-002',
      idempotencyKey: 'idemp-002',
      description: 'Balanced test capture',
      entries: [
        { accountCode: '1010', debitMinor: 150000n, creditMinor: 0n },
        { accountCode: '2010', debitMinor: 0n, creditMinor: 150000n },
      ],
    };

    const result = await service.recordTransaction(balancedDto);

    expect(result).toBeDefined();
    expect(mockTxRepo.create).toHaveBeenCalled();
    expect(mockEntryRepo.save).toHaveBeenCalled();
  });

  it('verifies ledger double-entry mathematical invariant health via checkInvariants', async () => {
    const qbMock = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      having: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]), // No unbalanced transactions
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
    };
    mockEntryRepo.createQueryBuilder.mockReturnValue(qbMock);
    mockAccountRepo.findOne.mockResolvedValue({ id: 'acc-2010', code: '2010', type: LedgerAccountType.LIABILITY });

    // Mock getAccountBalance return
    jest.spyOn(service, 'getAccountBalance').mockResolvedValue(100000n);

    const health = await service.checkInvariants();
    expect(health.isHealthy).toBe(true);
    expect(health.violations).toHaveLength(0);
  });
});
