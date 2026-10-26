import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationType } from './entities/notification.entity';

const USER_ID = 'user-uuid-1';
const OTHER_USER_ID = 'user-uuid-2';
const NOTIFICATION_ID = 'notif-uuid-1';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repository: jest.Mocked<Repository<Notification>>;

  const mockNotification: Notification = {
    id: NOTIFICATION_ID,
    userId: USER_ID,
    type: NotificationType.BOOKING_REQUESTED,
    title: 'New Booking Request',
    message: 'A guest requested a booking',
    link: '/host/reservations',
    isRead: false,
    metadata: { bookingId: 'b-1' },
    idempotencyKey: 'booking_b-1_REQUESTED',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockNotification], 1]),
  };

  beforeEach(async () => {
    const mockRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    repository = module.get(getRepositoryToken(Notification));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create and save a new notification', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockNotification);
      repository.save.mockResolvedValue(mockNotification);

      const result = await service.createNotification({
        userId: USER_ID,
        type: NotificationType.BOOKING_REQUESTED,
        title: 'New Booking Request',
        message: 'A guest requested a booking',
        link: '/host/reservations',
        idempotencyKey: 'booking_b-1_REQUESTED',
      });

      expect(result).toEqual(mockNotification);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          type: NotificationType.BOOKING_REQUESTED,
          isRead: false,
        }),
      );
      expect(repository.save).toHaveBeenCalled();
    });

    it('should return existing notification if idempotencyKey already exists', async () => {
      repository.findOne.mockResolvedValue(mockNotification);

      const result = await service.createNotification({
        userId: USER_ID,
        type: NotificationType.BOOKING_REQUESTED,
        title: 'Duplicate',
        message: 'Duplicate',
        idempotencyKey: 'booking_b-1_REQUESTED',
      });

      expect(result).toEqual(mockNotification);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should recover from concurrent insert unique constraint error', async () => {
      repository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockNotification);
      repository.create.mockReturnValue(mockNotification);
      repository.save.mockRejectedValue({ code: '23505', message: 'duplicate key error' });

      const result = await service.createNotification({
        userId: USER_ID,
        type: NotificationType.BOOKING_REQUESTED,
        title: 'Concurrent',
        message: 'Concurrent',
        idempotencyKey: 'booking_b-1_REQUESTED',
      });

      expect(result).toEqual(mockNotification);
      expect(repository.findOne).toHaveBeenCalledTimes(2);
    });
  });

  describe('getUserNotifications', () => {
    it('should query notifications with pagination and return unread count', async () => {
      repository.count.mockResolvedValue(1);

      const result = await service.getUserNotifications(USER_ID, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual([mockNotification]);
      expect(result.total).toBe(1);
      expect(result.unreadCount).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'notification.userId = :userId',
        { userId: USER_ID },
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should add unreadOnly filter if requested', async () => {
      repository.count.mockResolvedValue(1);

      await service.getUserNotifications(USER_ID, {
        unreadOnly: true,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'notification.isRead = false',
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for user', async () => {
      repository.count.mockResolvedValue(5);

      const result = await service.getUnreadCount(USER_ID);

      expect(result).toEqual({ unreadCount: 5 });
      expect(repository.count).toHaveBeenCalledWith({
        where: { userId: USER_ID, isRead: false },
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read when requested by owner', async () => {
      const unread = { ...mockNotification, isRead: false };
      repository.findOne.mockResolvedValue(unread);
      repository.save.mockResolvedValue({ ...unread, isRead: true });

      const result = await service.markAsRead(NOTIFICATION_ID, USER_ID);

      expect(result.isRead).toBe(true);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isRead: true }),
      );
    });

    it('should throw NotFoundException if notification does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.markAsRead('non-existent', USER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own notification', async () => {
      repository.findOne.mockResolvedValue(mockNotification);

      await expect(
        service.markAsRead(NOTIFICATION_ID, OTHER_USER_ID),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('should update all unread notifications for user', async () => {
      repository.update.mockResolvedValue({ affected: 3, raw: [], generatedMaps: [] });

      const result = await service.markAllAsRead(USER_ID);

      expect(result).toEqual({ affected: 3 });
      expect(repository.update).toHaveBeenCalledWith(
        { userId: USER_ID, isRead: false },
        { isRead: true },
      );
    });
  });
});
