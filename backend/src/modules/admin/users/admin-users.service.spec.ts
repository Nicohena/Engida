jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$mocked-hash'),
}));

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AdminRole, User, UserRole } from '../../../users/entities/user.entity';
import { HostProfile } from '../../../users/entities/host-profile.entity';
import { RefreshToken } from '../../../auth/entities/refresh-token.entity';
import { AdminUsersService } from './admin-users.service';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'user@engida.test',
    passwordHash: 'hash',
    role: UserRole.USER,
    adminRole: null,
    isActive: true,
    phone: null,
    title: null,
    bio: null,
    avatar: null,
    officeLocation: null,
    authProvider: 'LOCAL' as any,
    providerId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as User;
}

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let userTxRepo: any;
  let refreshTxRepo: any;
  let hostProfileTxRepo: any;
  let auditService: { record: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  const actor = makeUser({
    id: 'actor-admin',
    name: 'Acting Admin',
    email: 'actor@engida.test',
    role: UserRole.ADMIN,
    adminRole: AdminRole.SUPER_ADMIN,
  });

  beforeEach(() => {
    userTxRepo = {
      findOne: jest.fn(),
      save: jest.fn(async (user) => user),
      count: jest.fn(),
      create: jest.fn((value) => ({ id: 'new-admin', ...value })),
    };
    refreshTxRepo = { update: jest.fn() };
    hostProfileTxRepo = { findOne: jest.fn().mockResolvedValue(null) };
    auditService = { record: jest.fn() };

    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === User) return userTxRepo;
        if (entity === RefreshToken) return refreshTxRepo;
        if (entity === HostProfile) return hostProfileTxRepo;
        return {};
      }),
    };
    dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };

    service = new AdminUsersService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      dataSource as any,
      auditService as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateStatus', () => {
    it('requires a meaningful reason before opening a transaction', async () => {
      await expect(
        service.updateStatus('user-1', { isActive: false, reason: 'no' }, actor),
      ).rejects.toThrow(BadRequestException);

      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('blocks an administrator from suspending their own account', async () => {
      userTxRepo.findOne.mockResolvedValue(actor);

      await expect(
        service.updateStatus(
          actor.id,
          { isActive: false, reason: 'Trying to suspend myself' },
          actor,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(userTxRepo.save).not.toHaveBeenCalled();
      expect(auditService.record).not.toHaveBeenCalled();
    });

    it('blocks support agents from suspending administrator accounts', async () => {
      const supportActor = makeUser({
        id: 'support-admin',
        role: UserRole.ADMIN,
        adminRole: AdminRole.SUPPORT_AGENT,
      });
      const target = makeUser({
        id: 'moderator-target',
        role: UserRole.ADMIN,
        adminRole: AdminRole.PROPERTY_MODERATOR,
      });
      userTxRepo.findOne.mockResolvedValue(target);

      await expect(
        service.updateStatus(
          target.id,
          { isActive: false, reason: 'Support trying to suspend an admin' },
          supportActor,
        ),
      ).rejects.toThrow(
        'Only Super Admins can change administrator account status',
      );

      expect(userTxRepo.save).not.toHaveBeenCalled();
    });

    it('blocks suspension when no other active Super Admin remains', async () => {
      const target = makeUser({
        id: 'other-super',
        role: UserRole.ADMIN,
        adminRole: AdminRole.SUPER_ADMIN,
      });
      userTxRepo.findOne.mockResolvedValue(target);
      userTxRepo.count.mockResolvedValue(0);

      await expect(
        service.updateStatus(
          target.id,
          { isActive: false, reason: 'Suspending the last admin' },
          actor,
        ),
      ).rejects.toThrow('At least one active Super Admin must remain');

      expect(userTxRepo.save).not.toHaveBeenCalled();
    });

    it('treats a legacy administrator without an adminRole as a Super Admin for last-admin protection', async () => {
      const target = makeUser({
        id: 'legacy-super',
        role: UserRole.ADMIN,
        adminRole: null,
      });
      userTxRepo.findOne.mockResolvedValue(target);
      userTxRepo.count.mockResolvedValue(0);

      await expect(
        service.updateStatus(
          target.id,
          { isActive: false, reason: 'Suspending the legacy admin' },
          actor,
        ),
      ).rejects.toThrow('At least one active Super Admin must remain');

      expect(userTxRepo.save).not.toHaveBeenCalled();
    });

    it('suspends an account, revokes refresh tokens and records an audit entry', async () => {
      const target = makeUser({
        id: 'target-user',
        isActive: true,
      });
      userTxRepo.findOne.mockResolvedValue(target);
      userTxRepo.count.mockResolvedValue(0);

      const result = await service.updateStatus(
        target.id,
        { isActive: false, reason: 'Confirmed policy violation' },
        actor,
        { ipAddress: '10.0.0.1', userAgent: 'jest' },
      );

      expect(userTxRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: target.id, isActive: false }),
      );
      expect(refreshTxRepo.update).toHaveBeenCalledWith(
        { userId: target.id, isRevoked: false },
        { isRevoked: true },
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user.suspend',
          entityId: target.id,
          before: { isActive: true },
          after: { isActive: false },
          metadata: { reason: 'Confirmed policy violation' },
          ipAddress: '10.0.0.1',
          userAgent: 'jest',
        }),
        expect.anything(),
      );
      expect(result.isActive).toBe(false);
    });

    it('reactivates an account without revoking its tokens', async () => {
      const target = makeUser({ id: 'target-user', isActive: false });
      userTxRepo.findOne.mockResolvedValue(target);

      const result = await service.updateStatus(
        target.id,
        { isActive: true, reason: 'Appeal accepted' },
        actor,
      );

      expect(refreshTxRepo.update).not.toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user.reactivate',
          after: { isActive: true },
        }),
        expect.anything(),
      );
      expect(result.isActive).toBe(true);
    });
  });

  describe('updateAdminRole', () => {
    it('blocks an administrator from removing their own admin role', async () => {
      userTxRepo.findOne.mockResolvedValue(actor);

      await expect(
        service.updateAdminRole(
          actor.id,
          { adminRole: null, reason: 'Removing my own access' },
          actor,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(userTxRepo.save).not.toHaveBeenCalled();
    });

    it('allows a Super Admin to change their own role while retaining admin access', async () => {
      userTxRepo.findOne.mockResolvedValue(actor);
      userTxRepo.count.mockResolvedValue(1);

      const result = await service.updateAdminRole(
        actor.id,
        {
          adminRole: AdminRole.PROPERTY_MODERATOR,
          reason: 'Moving to the moderation team',
        },
        actor,
      );

      expect(userTxRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.ADMIN,
          adminRole: AdminRole.PROPERTY_MODERATOR,
        }),
      );
      expect(result.role).toBe(UserRole.ADMIN);
      expect(result.adminRole).toBe(AdminRole.PROPERTY_MODERATOR);
    });

    it('demotes another administrator to a regular user and revokes sessions', async () => {
      const target = makeUser({
        id: 'target-admin',
        role: UserRole.ADMIN,
        adminRole: AdminRole.SUPPORT_AGENT,
      });
      userTxRepo.findOne.mockResolvedValue(target);

      const result = await service.updateAdminRole(
        target.id,
        { adminRole: null, reason: 'Admin access no longer required' },
        actor,
      );

      expect(refreshTxRepo.update).toHaveBeenCalledWith(
        { userId: target.id, isRevoked: false },
        { isRevoked: true },
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user.admin_role.update',
          before: { role: UserRole.ADMIN, adminRole: AdminRole.SUPPORT_AGENT },
          after: { role: UserRole.USER, adminRole: null },
        }),
        expect.anything(),
      );
      expect(result.role).toBe(UserRole.USER);
      expect(result.adminRole).toBeNull();
    });

    it('blocks demoting the last active Super Admin', async () => {
      const target = makeUser({
        id: 'last-super',
        role: UserRole.ADMIN,
        adminRole: AdminRole.SUPER_ADMIN,
      });
      userTxRepo.findOne.mockResolvedValue(target);
      userTxRepo.count.mockResolvedValue(0);

      await expect(
        service.updateAdminRole(
          target.id,
          {
            adminRole: AdminRole.SUPPORT_AGENT,
            reason: 'Trying to remove the last super admin',
          },
          actor,
        ),
      ).rejects.toThrow('At least one active Super Admin must remain');

      expect(userTxRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('createAdmin', () => {
    it('rejects an existing email before creating an account', async () => {
      userTxRepo.findOne.mockResolvedValue(makeUser({ id: 'existing' }));

      await expect(
        service.createAdmin(
          {
            name: 'New Admin',
            email: 'ADMIN@ENGIDA.TEST',
            password: 'ValidPassword123',
            adminRole: AdminRole.SUPPORT_AGENT,
          },
          actor,
        ),
      ).rejects.toThrow(ConflictException);

      expect(userTxRepo.save).not.toHaveBeenCalled();
      expect(auditService.record).not.toHaveBeenCalled();
    });

    it('creates an admin with a hashed password and writes the audit entry', async () => {
      userTxRepo.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$mocked-hash');

      const result = await service.createAdmin(
        {
          name: '  New Admin  ',
          email: 'ADMIN@ENGIDA.TEST',
          password: 'ValidPassword123',
          adminRole: AdminRole.SUPPORT_AGENT,
        },
        actor,
        { ipAddress: '10.0.0.2', userAgent: 'jest' },
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('ValidPassword123', 12);
      expect(userTxRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Admin',
          email: 'admin@engida.test',
          passwordHash: '$2b$12$mocked-hash',
          role: UserRole.ADMIN,
          adminRole: AdminRole.SUPPORT_AGENT,
        }),
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.create',
          entityId: 'new-admin',
          after: {
            name: 'New Admin',
            email: 'admin@engida.test',
            adminRole: AdminRole.SUPPORT_AGENT,
          },
          ipAddress: '10.0.0.2',
          userAgent: 'jest',
        }),
        expect.anything(),
      );
      expect(result.email).toBe('admin@engida.test');
      expect(result).not.toHaveProperty('passwordHash');
    });
  });
});
