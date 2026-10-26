import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminReportsService } from './admin-reports.service';
import {
  Report,
  ReportReason,
  ReportStatus,
  ReportTargetType,
} from '../../reports/entities/report.entity';
import { ReviewModerationStatus } from '../../reviews/entities/review.entity';
import { AdminRole, User, UserRole } from '../../../users/entities/user.entity';

function makeReport(overrides: Partial<Report> = {}): Report {
  return {
    id: 'report-1',
    targetType: ReportTargetType.LISTING,
    targetId: 'property-1',
    reporterId: 'reporter-1',
    reporterEmail: 'reporter@example.com',
    reason: ReportReason.SCAM,
    details: 'Details',
    status: ReportStatus.OPEN,
    resolutionNote: null,
    resolvedById: null,
    resolvedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as Report;
}

describe('AdminReportsService', () => {
  let service: AdminReportsService;
  let reportRepository: any;
  let propertyRepository: any;
  let reviewRepository: any;
  let reportTxRepo: any;
  let auditService: { record: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  const actor = {
    id: 'admin-1',
    name: 'Admin',
    email: 'admin@engida.test',
    role: UserRole.ADMIN,
    adminRole: AdminRole.PROPERTY_MODERATOR,
  } as User;

  beforeEach(() => {
    reportRepository = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    propertyRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };
    reviewRepository = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
    };
    reportTxRepo = {
      findOne: jest.fn(),
      save: jest.fn(async (report) => report),
    };

    auditService = { record: jest.fn() };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Report) return reportTxRepo;
        return {};
      }),
    };
    dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };

    service = new AdminReportsService(
      reportRepository,
      propertyRepository,
      reviewRepository,
      dataSource as any,
      auditService as any,
    );
  });

  describe('updateStatus', () => {
    it('requires a resolution note before closing a report', async () => {
      await expect(
        service.updateStatus(
          'report-1',
          { status: ReportStatus.RESOLVED, resolutionNote: 'no' },
          actor,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('returns not found when the report does not exist', async () => {
      reportTxRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatus(
          'missing',
          { status: ReportStatus.INVESTIGATING },
          actor,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects transitions from a closed report', async () => {
      reportTxRepo.findOne.mockResolvedValue(
        makeReport({
          status: ReportStatus.RESOLVED,
          resolutionNote: 'Already handled',
          resolvedById: 'admin-0',
          resolvedAt: new Date(),
        }),
      );

      await expect(
        service.updateStatus(
          'report-1',
          { status: ReportStatus.DISMISSED, resolutionNote: 'Reopen test' },
          actor,
        ),
      ).rejects.toThrow('Cannot move a report from RESOLVED to DISMISSED');

      expect(reportTxRepo.save).not.toHaveBeenCalled();
      expect(auditService.record).not.toHaveBeenCalled();
    });

    it('moves an open report to investigating without closing fields', async () => {
      const report = makeReport();
      reportTxRepo.findOne.mockResolvedValue(report);
      jest.spyOn(service, 'getDetail').mockResolvedValue({ id: report.id } as any);

      const result = await service.updateStatus(
        report.id,
        { status: ReportStatus.INVESTIGATING },
        actor,
        { ipAddress: '10.0.0.1', userAgent: 'jest' },
      );

      expect(reportTxRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReportStatus.INVESTIGATING,
          resolutionNote: null,
          resolvedById: null,
          resolvedAt: null,
        }),
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'report.status.update',
          entityId: report.id,
          before: {
            status: ReportStatus.OPEN,
            resolutionNote: null,
            resolvedById: null,
            resolvedAt: null,
          },
          after: expect.objectContaining({
            status: ReportStatus.INVESTIGATING,
            resolutionNote: null,
            resolvedById: null,
          }),
          ipAddress: '10.0.0.1',
          userAgent: 'jest',
        }),
        expect.anything(),
      );
      expect(result).toEqual({ id: report.id });
    });

    it('resolves a report with the resolution note and moderator snapshot', async () => {
      const report = makeReport({
        targetType: ReportTargetType.REVIEW,
        targetId: 'review-1',
      });
      reportTxRepo.findOne.mockResolvedValue(report);
      jest.spyOn(service, 'getDetail').mockResolvedValue({ id: report.id } as any);

      const result = await service.updateStatus(
        report.id,
        {
          status: ReportStatus.RESOLVED,
          resolutionNote: 'Confirmed and the content was hidden.',
        },
        actor,
      );

      expect(reportTxRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ReportStatus.RESOLVED,
          resolutionNote: 'Confirmed and the content was hidden.',
          resolvedById: actor.id,
          resolvedAt: expect.any(Date),
        }),
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'report.status.update',
          metadata: {
            targetType: ReportTargetType.REVIEW,
            targetId: 'review-1',
            reason: ReportReason.SCAM,
          },
          after: expect.objectContaining({
            status: ReportStatus.RESOLVED,
            resolutionNote: 'Confirmed and the content was hidden.',
            resolvedById: actor.id,
            resolvedAt: expect.any(Date),
          }),
        }),
        expect.anything(),
      );
      expect(result).toEqual({ id: report.id });
    });
  });

  describe('list target summaries', () => {
    const makeQueryBuilder = (rows: unknown[], total: number) => {
      const qb = {
        leftJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([rows, total]),
      };
      return qb;
    };

    it('attaches the review summary to the report that points at it', async () => {
      const report = makeReport({
        id: 'review-report',
        targetType: ReportTargetType.REVIEW,
        targetId: 'review-1',
        reason: ReportReason.OFFENSIVE,
      });
      const review = {
        id: 'review-1',
        propertyId: 'property-1',
        rating: 4,
        comment: 'Review text',
        moderationStatus: ReviewModerationStatus.VISIBLE,
        property: { id: 'property-1', title: 'Bole Apartment' },
        user: { id: 'guest-1', name: 'Guest Name' },
      };
      reportRepository.createQueryBuilder.mockReturnValue(
        makeQueryBuilder([report], 1),
      );
      reviewRepository.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([review]),
      });

      const result = await service.list({ page: 1, limit: 20 });

      expect(result.total).toBe(1);
      expect(result.data[0].target).toEqual(
        expect.objectContaining({
          type: ReportTargetType.REVIEW,
          id: 'review-1',
          propertyTitle: 'Bole Apartment',
          authorName: 'Guest Name',
          moderationStatus: ReviewModerationStatus.VISIBLE,
        }),
      );
      expect(result.data[0].target?.id).toBe(report.targetId);
    });

    it('returns a null target when the listing summary cannot be loaded', async () => {
      const report = makeReport();
      reportRepository.createQueryBuilder.mockReturnValue(
        makeQueryBuilder([report], 1),
      );
      propertyRepository.find.mockResolvedValue([]);

      const result = await service.list({ page: 1, limit: 20 });

      expect(result.data[0].target).toBeNull();
    });
  });

  describe('getDetail', () => {
    it('marks a missing reported review as unavailable', async () => {
      reportRepository.findOne.mockResolvedValue(
        makeReport({
          targetType: ReportTargetType.REVIEW,
          targetId: 'missing-review',
        }),
      );
      reviewRepository.findOne.mockResolvedValue(null);

      const result = await service.getDetail('report-1');

      expect(result.target).toEqual({
        type: ReportTargetType.REVIEW,
        id: 'missing-review',
        missing: true,
      });
    });
  });
});
