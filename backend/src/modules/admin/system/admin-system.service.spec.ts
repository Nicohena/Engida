import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { AdminSystemService } from './admin-system.service';
import { JobRun, JobRunStatus } from '../../finance/entities/job-run.entity';
import { User } from '../../../users/entities/user.entity';
import { Property } from '../../properties/entities/property.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { Case } from '../cases/entities/case.entity';
import { LedgerEntry } from '../../finance/entities/ledger-entry.entity';
import { AuditLog } from '../../audit/entities/audit-log.entity';
import { AuditService } from '../../audit/audit.service';

describe('AdminSystemService', () => {
  let service: AdminSystemService;
  let dataSource: any;
  let jobRunRepo: any;
  let userRepo: any;
  let propertyRepo: any;
  let bookingRepo: any;
  let caseRepo: any;
  let ledgerEntryRepo: any;
  let auditLogRepo: any;
  let auditService: any;

  beforeEach(async () => {
    dataSource = {
      query: jest.fn().mockImplementation((q: string) => {
        if (q === 'SELECT 1') return Promise.resolve([{ '?column?': 1 }]);
        return Promise.resolve([
          { total_minor: 100000, direction: 'DEBIT' },
          { total_minor: 100000, direction: 'CREDIT' },
        ]);
      }),
    };

    jobRunRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((val) => ({ id: 'job-1', ...val })),
      save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
    };

    userRepo = { count: jest.fn().mockResolvedValue(50) };
    propertyRepo = { count: jest.fn().mockResolvedValue(30) };
    bookingRepo = { count: jest.fn().mockResolvedValue(120) };
    caseRepo = {
      count: jest.fn().mockResolvedValue(4),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      }),
    };
    ledgerEntryRepo = { count: jest.fn().mockResolvedValue(500) };
    auditLogRepo = { count: jest.fn().mockResolvedValue(800) };
    auditService = { record: jest.fn().mockResolvedValue({ id: 'audit-1' }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminSystemService,
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(JobRun), useValue: jobRunRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Property), useValue: propertyRepo },
        { provide: getRepositoryToken(Booking), useValue: bookingRepo },
        { provide: getRepositoryToken(Case), useValue: caseRepo },
        { provide: getRepositoryToken(LedgerEntry), useValue: ledgerEntryRepo },
        { provide: getRepositoryToken(AuditLog), useValue: auditLogRepo },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<AdminSystemService>(AdminSystemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHealthOverview', () => {
    it('returns database, runtime, jobs, and gateways information', async () => {
      const res = await service.getHealthOverview();

      expect(res.overallStatus).toBe('OPERATIONAL');
      expect(res.database.status).toBe('HEALTHY');
      expect(res.database.tableCounts.users).toBe(50);
      expect(res.runtime.status).toBe('ONLINE');
      expect(res.jobs).toHaveLength(3);
      expect(res.gateways).toHaveLength(3);
    });
  });

  describe('triggerJob', () => {
    it('throws BadRequestException for unsupported job name', async () => {
      await expect(
        service.triggerJob('unsupported-job', { id: 'admin-1' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('triggers ledger-invariant-check, validates zero discrepancy and records audit', async () => {
      const res = await service.triggerJob(
        'ledger-invariant-check',
        { id: 'admin-1' } as any,
      );

      expect(res.status).toBe(JobRunStatus.SUCCEEDED);
      expect(res.counts?.zeroDiscrepancy).toBe(true);
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'system.job_trigger',
          entityType: 'job_run',
        }),
      );
    });
  });
});
