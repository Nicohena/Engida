import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminGuestReviewsService } from './admin-guest-reviews.service';
import {
  Review,
  ReviewModerationStatus,
} from '../../reviews/entities/review.entity';
import { Property } from '../../properties/entities/property.entity';
import {
  ReportReason,
  ReportStatus,
} from '../../reports/entities/report.entity';
import { NotificationType } from '../../notifications/entities/notification.entity';
import { AdminRole, User, UserRole } from '../../../users/entities/user.entity';

function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: 'review-1',
    propertyId: 'property-1',
    userId: 'guest-1',
    rating: 4,
    comment: 'A useful review',
    moderationStatus: ReviewModerationStatus.VISIBLE,
    moderationReason: null,
    moderatedById: null,
    moderatedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as Review;
}

describe('AdminGuestReviewsService', () => {
  let service: AdminGuestReviewsService;
  let reviewRepository: any;
  let reportRepository: any;
  let reviewTxRepo: any;
  let propertyTxRepo: any;
  let auditService: { record: jest.Mock };
  let notificationsService: { createNotification: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  const actor = {
    id: 'admin-1',
    name: 'Moderator',
    email: 'moderator@engida.test',
    role: UserRole.ADMIN,
    adminRole: AdminRole.PROPERTY_MODERATOR,
  } as User;

  const property = {
    id: 'property-1',
    title: 'Bole Apartment',
    hostId: 'host-1',
  } as Property;

  beforeEach(() => {
    reviewRepository = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    reportRepository = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(),
    };
    reviewTxRepo = {
      findOne: jest.fn(),
      save: jest.fn(async (review) => review),
    };
    propertyTxRepo = {
      findOne: jest.fn().mockResolvedValue(property),
    };
    auditService = { record: jest.fn() };
    notificationsService = {
      createNotification: jest.fn().mockResolvedValue(undefined),
    };

    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === Review) return reviewTxRepo;
        if (entity === Property) return propertyTxRepo;
        return {};
      }),
    };
    dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };

    service = new AdminGuestReviewsService(
      reviewRepository,
      reportRepository,
      dataSource as any,
      auditService as any,
      notificationsService as any,
    );
  });

  describe('moderation input', () => {
    it('requires a meaningful reason', async () => {
      await expect(
        service.hide('review-1', 'no', actor),
      ).rejects.toThrow(BadRequestException);

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('returns not found when the review does not exist', async () => {
      reviewTxRepo.findOne.mockResolvedValue(null);

      await expect(
        service.hide('missing', 'Policy violation', actor),
      ).rejects.toThrow(NotFoundException);

      expect(reviewTxRepo.save).not.toHaveBeenCalled();
    });

    it('rejects hiding a review that is already hidden', async () => {
      reviewTxRepo.findOne.mockResolvedValue(
        makeReview({ moderationStatus: ReviewModerationStatus.HIDDEN }),
      );

      await expect(
        service.hide('review-1', 'Policy violation', actor),
      ).rejects.toThrow('This review is already hidden');

      expect(reviewTxRepo.save).not.toHaveBeenCalled();
      expect(auditService.record).not.toHaveBeenCalled();
    });
  });

  describe('hide and restore', () => {
    it('hides a review, audits the change and notifies the author', async () => {
      const review = makeReview();
      reviewTxRepo.findOne.mockResolvedValue(review);
      jest.spyOn(service, 'getDetail').mockResolvedValue({
        id: review.id,
        moderationStatus: ReviewModerationStatus.HIDDEN,
      } as any);

      const result = await service.hide(
        review.id,
        '  Contains personal information.  ',
        actor,
        { ipAddress: '10.0.0.1', userAgent: 'jest' },
      );

      expect(reviewTxRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          moderationStatus: ReviewModerationStatus.HIDDEN,
          moderationReason: 'Contains personal information.',
          moderatedById: actor.id,
          moderatedAt: expect.any(Date),
        }),
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'review.hide',
          entityId: review.id,
          before: {
            moderationStatus: ReviewModerationStatus.VISIBLE,
            moderationReason: null,
          },
          after: {
            moderationStatus: ReviewModerationStatus.HIDDEN,
            moderationReason: 'Contains personal information.',
          },
          metadata: {
            reason: 'Contains personal information.',
            propertyId: property.id,
            propertyTitle: property.title,
          },
          ipAddress: '10.0.0.1',
          userAgent: 'jest',
        }),
        expect.anything(),
      );
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: review.userId,
          type: NotificationType.REVIEW_HIDDEN,
          link: `/properties/${property.id}`,
          metadata: expect.objectContaining({
            reviewId: review.id,
            propertyId: property.id,
            reason: 'Contains personal information.',
          }),
        }),
      );
      expect(result).toEqual({
        id: review.id,
        moderationStatus: ReviewModerationStatus.HIDDEN,
      });
    });

    it('restores a review and notifies the author', async () => {
      const review = makeReview({
        moderationStatus: ReviewModerationStatus.HIDDEN,
        moderationReason: 'Old reason',
      });
      reviewTxRepo.findOne.mockResolvedValue(review);
      jest.spyOn(service, 'getDetail').mockResolvedValue({
        id: review.id,
        moderationStatus: ReviewModerationStatus.VISIBLE,
      } as any);

      await service.restore(review.id, 'Appeal accepted.', actor);

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'review.restore',
          after: {
            moderationStatus: ReviewModerationStatus.VISIBLE,
            moderationReason: 'Appeal accepted.',
          },
        }),
        expect.anything(),
      );
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.REVIEW_RESTORED,
          userId: review.userId,
        }),
      );
    });

    it('keeps the moderation result when notification delivery fails', async () => {
      const review = makeReview();
      reviewTxRepo.findOne.mockResolvedValue(review);
      jest.spyOn(service, 'getDetail').mockResolvedValue({
        id: review.id,
        moderationStatus: ReviewModerationStatus.HIDDEN,
      } as any);
      notificationsService.createNotification.mockRejectedValue(
        new Error('notification service unavailable'),
      );

      const result = await service.hide(review.id, 'Policy violation', actor);

      expect(result.moderationStatus).toBe(ReviewModerationStatus.HIDDEN);
      expect(auditService.record).toHaveBeenCalled();
    });

    it('propagates audit failures so the moderation write can roll back', async () => {
      const review = makeReview();
      reviewTxRepo.findOne.mockResolvedValue(review);
      auditService.record.mockRejectedValue(new Error('audit unavailable'));

      await expect(
        service.hide(review.id, 'Policy violation', actor),
      ).rejects.toThrow('audit unavailable');

      expect(notificationsService.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('getDetail', () => {
    it('returns not found for a missing review', async () => {
      reviewRepository.findOne.mockResolvedValue(null);

      await expect(service.getDetail('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('includes moderation context and linked reports', async () => {
      const review = makeReview({
        moderationStatus: ReviewModerationStatus.HIDDEN,
        moderationReason: 'Policy violation',
        moderatedById: actor.id,
        moderatedAt: new Date('2026-01-02T00:00:00.000Z'),
        user: { id: 'guest-1', name: 'Guest', email: 'guest@example.com' },
        property,
        moderatedBy: actor,
      } as any);
      reviewRepository.findOne.mockResolvedValue(review);
      reportRepository.find.mockResolvedValue([
        {
          id: 'report-1',
          reason: ReportReason.OFFENSIVE,
          details: 'Report details',
          status: ReportStatus.OPEN,
          reporterEmail: 'reporter@example.com',
          resolutionNote: null,
          createdAt: new Date('2026-01-03T00:00:00.000Z'),
          resolvedAt: null,
        },
      ]);

      const result = await service.getDetail(review.id);

      expect(result.moderationStatus).toBe(ReviewModerationStatus.HIDDEN);
      expect(result.moderationReason).toBe('Policy violation');
      expect(result.openReportCount).toBe(1);
      expect(result.reports).toEqual([
        expect.objectContaining({
          id: 'report-1',
          reason: ReportReason.OFFENSIVE,
          status: ReportStatus.OPEN,
        }),
      ]);
      expect(result.author).toEqual({
        id: 'guest-1',
        name: 'Guest',
        email: 'guest@example.com',
      });
    });
  });
});
