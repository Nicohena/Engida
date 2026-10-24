import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { QueryNotificationsDto } from './dto/query-notifications.dto';

export interface CreateNotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
  idempotencyKey?: string | null;
}

export interface PaginatedNotifications {
  data: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  /**
   * Idempotent notification creation.
   * If an idempotencyKey is supplied and a notification already exists for that user,
   * the existing notification is returned to prevent duplicate alerts.
   */
  async createNotification(
    options: CreateNotificationOptions,
  ): Promise<Notification | null> {
    const { userId, type, title, message, link, metadata, idempotencyKey } =
      options;

    if (idempotencyKey) {
      const existing = await this.notificationRepository.findOne({
        where: { userId, idempotencyKey },
      });
      if (existing) {
        this.logger.debug(
          `Notification with idempotencyKey "${idempotencyKey}" already exists for user ${userId}. Skipping duplicate.`,
        );
        return existing;
      }
    }

    try {
      const notification = this.notificationRepository.create({
        userId,
        type,
        title,
        message,
        link: link || null,
        metadata: metadata || null,
        idempotencyKey: idempotencyKey || null,
        isRead: false,
      });

      const saved = await this.notificationRepository.save(notification);
      this.logger.log(
        `Notification created [${type}] for user ${userId}: "${title}"`,
      );
      return saved;
    } catch (error: unknown) {
      const dbError = error as { code?: string; message?: string };
      // Handle concurrent insert race condition on unique index
      if (
        idempotencyKey &&
        (dbError?.code === '23505' ||
          dbError?.message?.includes('duplicate') ||
          dbError?.message?.includes('unique'))
      ) {
        this.logger.debug(
          `Concurrent insert caught for idempotencyKey "${idempotencyKey}". Returning existing.`,
        );
        return this.notificationRepository.findOne({
          where: { userId, idempotencyKey },
        });
      }
      this.logger.error(
        `Failed to create notification for user ${userId}: ${dbError?.message}`,
      );
      throw error;
    }
  }

  /**
   * Returns paginated notifications scoped strictly to the authenticated user.
   */
  async getUserNotifications(
    userId: string,
    query?: QueryNotificationsDto,
  ): Promise<PaginatedNotifications> {
    const page = Math.max(query?.page || 1, 1);
    const limit = Math.min(query?.limit || 20, 100);
    const skip = (page - 1) * limit;

    const qb = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.user_id = :userId', { userId })
      .orderBy('notification.created_at', 'DESC');

    if (query?.unreadOnly) {
      qb.andWhere('notification.is_read = false');
    }

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    const unreadCount = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });

    return {
      data,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Fast unread count query for header badges.
   */
  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const unreadCount = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });
    return { unreadCount };
  }

  /**
   * Marks a single notification as read, enforcing strict ownership.
   */
  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification with ID "${notificationId}" not found`,
      );
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this notification',
      );
    }

    if (!notification.isRead) {
      notification.isRead = true;
      await this.notificationRepository.save(notification);
    }

    return notification;
  }

  /**
   * Marks all unread notifications as read for the authenticated user.
   */
  async markAllAsRead(userId: string): Promise<{ affected: number }> {
    const result = await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
    return { affected: result.affected || 0 };
  }
}
