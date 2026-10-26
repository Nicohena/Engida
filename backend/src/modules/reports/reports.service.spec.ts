import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import {
  ReportReason,
  ReportStatus,
  ReportTargetType,
} from './entities/report.entity';
import { User, UserRole } from '../../users/entities/user.entity';

describe('ReportsService', () => {
  let service: ReportsService;
  let reportRepository: any;
  let propertyRepository: any;
  let reviewRepository: any;

  const reporter = {
    id: 'reporter-1',
    email: 'reporter@example.com',
    role: UserRole.USER,
  } as User;

  beforeEach(() => {
    reportRepository = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn((value) => ({ id: 'report-1', ...value })),
      save: jest.fn(async (value) => value),
    };
    propertyRepository = {
      findOne: jest.fn(),
    };
    reviewRepository = {
      findOne: jest.fn(),
    };

    service = new ReportsService(
      reportRepository,
      propertyRepository,
      reviewRepository,
    );
  });

  it('requires details for an OTHER report', async () => {
    await expect(
      service.create(
        {
          targetType: ReportTargetType.LISTING,
          targetId: 'property-1',
          reason: ReportReason.OTHER,
        },
        reporter,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(propertyRepository.findOne).not.toHaveBeenCalled();
  });

  it('returns not found when the listing does not exist', async () => {
    propertyRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create(
        {
          targetType: ReportTargetType.LISTING,
          targetId: 'missing-property',
          reason: ReportReason.SCAM,
        },
        reporter,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('blocks reporting your own listing', async () => {
    propertyRepository.findOne.mockResolvedValue({
      id: 'property-1',
      hostId: reporter.id,
      title: 'My own listing',
    });

    await expect(
      service.create(
        {
          targetType: ReportTargetType.LISTING,
          targetId: 'property-1',
          reason: ReportReason.SCAM,
        },
        reporter,
      ),
    ).rejects.toThrow('You cannot report your own listing');
  });

  it('returns not found when the review does not exist', async () => {
    reviewRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create(
        {
          targetType: ReportTargetType.REVIEW,
          targetId: 'missing-review',
          reason: ReportReason.OFFENSIVE,
        },
        reporter,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('blocks reporting your own review', async () => {
    reviewRepository.findOne.mockResolvedValue({
      id: 'review-1',
      userId: reporter.id,
    });

    await expect(
      service.create(
        {
          targetType: ReportTargetType.REVIEW,
          targetId: 'review-1',
          reason: ReportReason.OFFENSIVE,
        },
        reporter,
      ),
    ).rejects.toThrow('You cannot report your own review');
  });

  it('blocks duplicate open reports by the same reporter', async () => {
    propertyRepository.findOne.mockResolvedValue({
      id: 'property-1',
      hostId: 'another-host',
      title: 'Listing',
    });
    reportRepository.findOne.mockResolvedValue({
      id: 'existing-report',
      status: ReportStatus.OPEN,
    });

    await expect(
      service.create(
        {
          targetType: ReportTargetType.LISTING,
          targetId: 'property-1',
          reason: ReportReason.SCAM,
          details: '  Still happening  ',
        },
        reporter,
      ),
    ).rejects.toThrow(ConflictException);

    expect(reportRepository.save).not.toHaveBeenCalled();
  });

  it('creates an open report with a reporter snapshot', async () => {
    propertyRepository.findOne.mockResolvedValue({
      id: 'property-1',
      hostId: 'another-host',
      title: 'Listing',
    });
    reportRepository.findOne.mockResolvedValue(null);

    const result = await service.create(
      {
        targetType: ReportTargetType.LISTING,
        targetId: 'property-1',
        reason: ReportReason.MISREPRESENTATION,
        details: '  The photos are out of date.  ',
      },
      reporter,
    );

    expect(reportRepository.create).toHaveBeenCalledWith({
      targetType: ReportTargetType.LISTING,
      targetId: 'property-1',
      reporterId: reporter.id,
      reporterEmail: reporter.email,
      reason: ReportReason.MISREPRESENTATION,
      details: 'The photos are out of date.',
      status: ReportStatus.OPEN,
    });
    expect(result.status).toBe(ReportStatus.OPEN);
    expect(reportRepository.save).toHaveBeenCalledTimes(1);
  });

  it('lists only the reporter own reports with bounded pagination', async () => {
    reportRepository.findAndCount.mockResolvedValue([[], 0]);

    const result = await service.listMine(reporter.id, 0, 500);

    expect(reportRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { reporterId: reporter.id },
        skip: 0,
        take: 100,
      }),
    );
    expect(result.page).toBe(1);
    expect(result.limit).toBe(100);
  });
});
