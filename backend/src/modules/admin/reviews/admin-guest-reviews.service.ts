import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Review,
  ReviewModerationStatus,
} from '../../reviews/entities/review.entity';
import {
  Report,
  ReportStatus,
  ReportTargetType,
} from '../../reports/entities/report.entity';
import { User } from '../../../users/entities/user.entity';
import { Property } from '../../properties/entities/property.entity';
import { AuditService } from '../../audit/audit.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { QueryAdminGuestReviewsDto } from './dto/admin-guest-reviews.dto';

@Injectable()
export class AdminGuestReviewsService {
  private readonly logger = new Logger(AdminGuestReviewsService.name);

  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async list(query: QueryAdminGuestReviewsDto) {
    const page = Math.max(query.page || 1, 1);
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const qb = this.reviewRepository
      .createQueryBuilder('review')
      .innerJoin('review.property', 'property')
      .addSelect(['property.id', 'property.title', 'property.city', 'property.hostId'])
      .leftJoin('review.user', 'user')
      .addSelect(['user.id', 'user.name', 'user.email'])
      .orderBy('review.createdAt', 'DESC');

    if (query.q?.trim()) {
      const term = `%${query.q.trim().toLowerCase()}%`;
      qb.andWhere(
        `(LOWER(COALESCE(review.comment, '')) LIKE :term
          OR LOWER(user.name) LIKE :term
          OR LOWER(user.email) LIKE :term
          OR LOWER(property.title) LIKE :term)`,
        { term },
      );
    }

    if (query.status) {
      qb.andWhere('review.moderationStatus = :status', { status: query.status });
    }

    if (query.propertyId) {
      qb.andWhere('review.propertyId = :propertyId', {
        propertyId: query.propertyId,
      });
    }

    if (query.reported) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM "reports" report
          WHERE report."target_type" = 'REVIEW'
            AND report."target_id" = review.id
            AND report."status" IN ('OPEN', 'INVESTIGATING')
        )`,
      );
    }

    const [reviews, total] = await qb.skip(skip).take(limit).getManyAndCount();
    const counts = await this.getOpenReportCounts(reviews.map((review) => review.id));

    return {
      data: reviews.map((review) => this.toListItem(review, counts.get(review.id) || 0)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getDetail(id: string) {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: ['property', 'user', 'moderatedBy'],
    });

    if (!review) {
      throw new NotFoundException(`Review with ID "${id}" not found`);
    }

    const reports = await this.reportRepository.find({
      where: { targetType: ReportTargetType.REVIEW, targetId: id },
      order: { createdAt: 'DESC' },
    });

    return {
      ...this.toListItem(review, reports.filter((report) => this.isOpen(report.status)).length),
      comment: review.comment,
      moderationReason: review.moderationReason,
      moderatedAt: review.moderatedAt,
      moderatedBy: review.moderatedBy
        ? {
            id: review.moderatedBy.id,
            name: review.moderatedBy.name,
            email: review.moderatedBy.email,
          }
        : null,
      reports: reports.map((report) => ({
        id: report.id,
        reason: report.reason,
        details: report.details,
        status: report.status,
        reporterEmail: report.reporterEmail,
        resolutionNote: report.resolutionNote,
        createdAt: report.createdAt,
        resolvedAt: report.resolvedAt,
      })),
    };
  }

  async hide(
    id: string,
    reason: string,
    actor: User,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    return this.moderate(id, ReviewModerationStatus.HIDDEN, reason, actor, meta);
  }

  async restore(
    id: string,
    reason: string,
    actor: User,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    return this.moderate(id, ReviewModerationStatus.VISIBLE, reason, actor, meta);
  }

  private async moderate(
    id: string,
    nextStatus: ReviewModerationStatus,
    reason: string,
    actor: User,
    meta?: { ipAddress?: string; userAgent?: string },
  ) {
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      throw new BadRequestException('A reason of at least 5 characters is required');
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Review);
      const review = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!review) {
        throw new NotFoundException(`Review with ID "${id}" not found`);
      }

      const property = await manager
        .getRepository(Property)
        .findOne({ where: { id: review.propertyId } });
      if (property) {
        review.property = property;
      }

      if (review.moderationStatus === nextStatus) {
        throw new BadRequestException(
          nextStatus === ReviewModerationStatus.HIDDEN
            ? 'This review is already hidden'
            : 'This review is already visible',
        );
      }

      const before = {
        moderationStatus: review.moderationStatus,
        moderationReason: review.moderationReason,
      };

      review.moderationStatus = nextStatus;
      review.moderationReason = trimmed;
      review.moderatedById = actor.id;
      review.moderatedAt = new Date();
      const updated = await repository.save(review);

      await this.auditService.record(
        {
          actor,
          action:
            nextStatus === ReviewModerationStatus.HIDDEN
              ? 'review.hide'
              : 'review.restore',
          entityType: 'review',
          entityId: review.id,
          before,
          after: {
            moderationStatus: updated.moderationStatus,
            moderationReason: updated.moderationReason,
          },
          metadata: {
            reason: trimmed,
            propertyId: review.propertyId,
            propertyTitle: review.property?.title || null,
          },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
        manager,
      );

      return updated;
    });

    try {
      await this.notificationsService.createNotification({
        userId: saved.userId,
        type:
          nextStatus === ReviewModerationStatus.HIDDEN
            ? NotificationType.REVIEW_HIDDEN
            : NotificationType.REVIEW_RESTORED,
        title:
          nextStatus === ReviewModerationStatus.HIDDEN
            ? 'Your review was hidden'
            : 'Your review was restored',
        message:
          nextStatus === ReviewModerationStatus.HIDDEN
            ? `Your review was hidden after moderation. Reason: ${trimmed}`
            : 'Your review is visible again.',
        link: `/properties/${saved.propertyId}`,
        metadata: {
          reviewId: saved.id,
          propertyId: saved.propertyId,
          reason: trimmed,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Review ${saved.id} was moderated but the author notification failed: ${message}`,
      );
    }

    return this.getDetail(id);
  }

  private async getOpenReportCounts(reviewIds: string[]): Promise<Map<string, number>> {
    if (reviewIds.length === 0) return new Map();

    const rows = await this.reportRepository
      .createQueryBuilder('report')
      .select('report.targetId', 'targetId')
      .addSelect('COUNT(*)', 'count')
      .where('report.targetType = :targetType', {
        targetType: ReportTargetType.REVIEW,
      })
      .andWhere('report.targetId IN (:...reviewIds)', { reviewIds })
      .andWhere('report.status IN (:...statuses)', {
        statuses: [ReportStatus.OPEN, ReportStatus.INVESTIGATING],
      })
      .groupBy('report.targetId')
      .getRawMany<{ targetId: string; count: string }>();

    return new Map(rows.map((row) => [row.targetId, Number(row.count) || 0]));
  }

  private isOpen(status: ReportStatus): boolean {
    return status === ReportStatus.OPEN || status === ReportStatus.INVESTIGATING;
  }

  private toListItem(review: Review, openReportCount: number) {
    return {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      moderationStatus: review.moderationStatus,
      createdAt: review.createdAt,
      author: review.user
        ? {
            id: review.user.id,
            name: review.user.name,
            email: review.user.email,
          }
        : null,
      property: review.property
        ? {
            id: review.property.id,
            title: review.property.title,
            city: review.property.city,
            hostId: review.property.hostId,
          }
        : null,
      openReportCount,
    };
  }
}
