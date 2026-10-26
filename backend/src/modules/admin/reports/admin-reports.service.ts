import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  Report,
  ReportStatus,
  ReportTargetType,
} from '../../reports/entities/report.entity';
import { Property } from '../../properties/entities/property.entity';
import {
  Review,
  ReviewModerationStatus,
} from '../../reviews/entities/review.entity';
import { User } from '../../../users/entities/user.entity';
import { AuditService } from '../../audit/audit.service';
import {
  QueryAdminReportsDto,
  UpdateReportStatusDto,
} from './dto/admin-reports.dto';

const ALLOWED_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  [ReportStatus.OPEN]: [
    ReportStatus.INVESTIGATING,
    ReportStatus.RESOLVED,
    ReportStatus.DISMISSED,
  ],
  [ReportStatus.INVESTIGATING]: [ReportStatus.RESOLVED, ReportStatus.DISMISSED],
  [ReportStatus.RESOLVED]: [],
  [ReportStatus.DISMISSED]: [],
};

@Injectable()
export class AdminReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async list(query: QueryAdminReportsDto) {
    const page = Math.max(query.page || 1, 1);
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const qb = this.reportRepository
      .createQueryBuilder('report')
      .leftJoin('report.reporter', 'reporter')
      .addSelect(['reporter.id', 'reporter.name', 'reporter.email'])
      .leftJoin('report.resolvedBy', 'resolvedBy')
      .addSelect(['resolvedBy.id', 'resolvedBy.name', 'resolvedBy.email'])
      .orderBy('report.createdAt', 'DESC');

    if (query.q?.trim()) {
      const term = `%${query.q.trim().toLowerCase()}%`;
      qb.andWhere(
        `(LOWER(COALESCE(report.reporterEmail, '')) LIKE :term
          OR LOWER(COALESCE(report.details, '')) LIKE :term
          OR LOWER(COALESCE(reporter.email, '')) LIKE :term)`,
        { term },
      );
    }
    if (query.status) {
      qb.andWhere('report.status = :status', { status: query.status });
    }
    if (query.targetType) {
      qb.andWhere('report.targetType = :targetType', {
        targetType: query.targetType,
      });
    }
    if (query.reason) {
      qb.andWhere('report.reason = :reason', { reason: query.reason });
    }
    if (query.targetId) {
      qb.andWhere('report.targetId = :targetId', { targetId: query.targetId });
    }

    const [reports, total] = await qb.skip(skip).take(limit).getManyAndCount();
    const targets = await this.loadTargetSummaries(reports);

    return {
      data: reports.map((report) => this.toReportView(report, targets.get(report.targetId))),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getDetail(id: string) {
    const report = await this.reportRepository.findOne({
      where: { id },
      relations: ['reporter', 'resolvedBy'],
    });

    if (!report) {
      throw new NotFoundException(`Report with ID "${id}" not found`);
    }

    const target = await this.loadTargetDetail(report);
    return this.toReportView(report, target);
  }

  async updateStatus(
    id: string,
    dto: UpdateReportStatusDto,
    actor: User,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const terminal =
      dto.status === ReportStatus.RESOLVED || dto.status === ReportStatus.DISMISSED;
    const note = dto.resolutionNote?.trim() || null;

    if (terminal && (!note || note.length < 5)) {
      throw new BadRequestException(
        'A resolution note of at least 5 characters is required when closing a report',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Report);
      const report = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!report) {
        throw new NotFoundException(`Report with ID "${id}" not found`);
      }

      if (report.status === dto.status) {
        throw new BadRequestException(`This report is already ${dto.status.toLowerCase()}`);
      }

      if (!ALLOWED_TRANSITIONS[report.status].includes(dto.status)) {
        throw new BadRequestException(
          `Cannot move a report from ${report.status} to ${dto.status}`,
        );
      }

      const before = {
        status: report.status,
        resolutionNote: report.resolutionNote,
        resolvedById: report.resolvedById,
        resolvedAt: report.resolvedAt,
      };

      report.status = dto.status;
      report.resolutionNote = terminal ? note : null;
      report.resolvedById = terminal ? actor.id : null;
      report.resolvedAt = terminal ? new Date() : null;
      const saved = await repository.save(report);

      await this.auditService.record(
        {
          actor,
          action: 'report.status.update',
          entityType: 'report',
          entityId: report.id,
          before,
          after: {
            status: saved.status,
            resolutionNote: saved.resolutionNote,
            resolvedById: saved.resolvedById,
            resolvedAt: saved.resolvedAt,
          },
          metadata: {
            targetType: report.targetType,
            targetId: report.targetId,
            reason: report.reason,
          },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
        manager,
      );
    });

    return this.getDetail(id);
  }

  private async loadTargetSummaries(reports: Report[]) {
    const listingIds = [
      ...new Set(
        reports
          .filter((report) => report.targetType === ReportTargetType.LISTING)
          .map((report) => report.targetId),
      ),
    ];
    const reviewIds = [
      ...new Set(
        reports
          .filter((report) => report.targetType === ReportTargetType.REVIEW)
          .map((report) => report.targetId),
      ),
    ];

    const [properties, reviews] = await Promise.all([
      listingIds.length
        ? this.propertyRepository.find({
            where: { id: In(listingIds) },
            select: ['id', 'title', 'city', 'status', 'adminHidden', 'hostId'],
          })
        : Promise.resolve([]),
      reviewIds.length
        ? this.reviewRepository
            .createQueryBuilder('review')
            .innerJoin('review.property', 'property')
            .addSelect(['property.id', 'property.title'])
            .leftJoin('review.user', 'user')
            .addSelect(['user.id', 'user.name'])
            .where('review.id IN (:...reviewIds)', { reviewIds })
            .getMany()
        : Promise.resolve([]),
    ]);

    const map = new Map<string, Record<string, unknown>>();
    for (const property of properties) {
      map.set(property.id, {
        type: ReportTargetType.LISTING,
        id: property.id,
        title: property.title,
        city: property.city,
        status: property.status,
        adminHidden: property.adminHidden,
        hostId: property.hostId,
      });
    }
    for (const review of reviews) {
      map.set(review.id, {
        type: ReportTargetType.REVIEW,
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        moderationStatus: review.moderationStatus,
        propertyId: review.property?.id || review.propertyId,
        propertyTitle: review.property?.title || null,
        authorName: review.user?.name || null,
      });
    }

    return map;
  }

  private async loadTargetDetail(report: Report): Promise<Record<string, unknown>> {
    if (report.targetType === ReportTargetType.LISTING) {
      const property = await this.propertyRepository.findOne({
        where: { id: report.targetId },
        relations: ['host'],
      });
      if (!property) {
        return { type: ReportTargetType.LISTING, id: report.targetId, missing: true };
      }
      return {
        type: ReportTargetType.LISTING,
        id: property.id,
        title: property.title,
        city: property.city,
        address: property.address,
        status: property.status,
        adminHidden: property.adminHidden,
        adminHiddenReason: property.adminHiddenReason,
        hostId: property.hostId,
        host: property.host
          ? {
              id: property.host.id,
              name: property.host.name,
              email: property.host.email,
            }
          : null,
      };
    }

    const review = await this.reviewRepository.findOne({
      where: { id: report.targetId },
      relations: ['property', 'user', 'moderatedBy'],
    });
    if (!review) {
      return { type: ReportTargetType.REVIEW, id: report.targetId, missing: true };
    }
    return {
      type: ReportTargetType.REVIEW,
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      moderationStatus: review.moderationStatus as ReviewModerationStatus,
      moderationReason: review.moderationReason,
      propertyId: review.propertyId,
      propertyTitle: review.property?.title || null,
      author: review.user
        ? {
            id: review.user.id,
            name: review.user.name,
            email: review.user.email,
          }
        : null,
    };
  }

  private toReportView(report: Report, target?: Record<string, unknown>) {
    return {
      id: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      details: report.details,
      status: report.status,
      resolutionNote: report.resolutionNote,
      reporter: report.reporter
        ? {
            id: report.reporter.id,
            name: report.reporter.name,
            email: report.reporter.email,
          }
        : {
            id: report.reporterId,
            name: null,
            email: report.reporterEmail,
          },
      resolvedBy: report.resolvedBy
        ? {
            id: report.resolvedBy.id,
            name: report.resolvedBy.name,
            email: report.resolvedBy.email,
          }
        : null,
      resolvedAt: report.resolvedAt,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      target: target || null,
    };
  }
}
