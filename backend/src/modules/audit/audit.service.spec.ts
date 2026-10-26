import { AuditService, redactForAudit } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';
import { UserRole } from '../../users/entities/user.entity';

describe('AuditService', () => {
  const actor = {
    id: 'admin-1',
    email: 'admin@engida.test',
    role: UserRole.ADMIN,
    adminRole: 'SUPER_ADMIN',
  };

  it('redacts sensitive values recursively without changing dates', () => {
    const date = new Date('2026-01-02T03:04:05.000Z');
    const result = redactForAudit({
      email: 'person@example.com',
      password: 'secret',
      nested: {
        refreshToken: 'token-value',
        apiKey: 'key',
        safe: 'visible',
      },
      list: [{ authorization: 'Bearer token' }, { value: 2 }],
      date,
    });

    expect(result).toEqual({
      email: 'person@example.com',
      password: '[REDACTED]',
      nested: {
        refreshToken: '[REDACTED]',
        apiKey: '[REDACTED]',
        safe: 'visible',
      },
      list: [{ authorization: '[REDACTED]' }, { value: 2 }],
      date: '2026-01-02T03:04:05.000Z',
    });
  });

  it('creates an append-only audit entry with actor and request context', async () => {
    const repository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'audit-1', ...value })),
    } as any;
    const service = new AuditService(repository);

    const saved = await service.record({
      actor,
      action: 'user.suspend',
      entityType: 'user',
      entityId: 'user-1',
      before: { isActive: true, password: 'do-not-store' },
      after: { isActive: false },
      metadata: { reason: 'Trust review', accessToken: 'do-not-store' },
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        actorEmail: 'admin@engida.test',
        actorRole: 'SUPER_ADMIN',
        action: 'user.suspend',
        entityType: 'user',
        entityId: 'user-1',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      }),
    );
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(saved.id).toBe('audit-1');
    expect(saved.beforeState).toEqual({
      isActive: true,
      password: '[REDACTED]',
    });
    expect(saved.afterState).toEqual({ isActive: false });
    expect(saved.metadata).toEqual({
      reason: 'Trust review',
      accessToken: '[REDACTED]',
    });
  });

  it('uses the transaction manager repository when provided', async () => {
    const managerRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'audit-tx', ...value })),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(managerRepository),
    };
    const repository = {
      create: jest.fn(),
      save: jest.fn(),
    } as any;
    const service = new AuditService(repository);

    const saved = await service.record(
      {
        actorId: 'system',
        actorEmail: 'system@engida.test',
        actorRole: 'SYSTEM',
        action: 'listing.hide',
        entityType: 'property',
        entityId: 'property-1',
      },
      manager as any,
    );

    expect(manager.getRepository).toHaveBeenCalledWith(AuditLog);
    expect(repository.save).not.toHaveBeenCalled();
    expect(saved.id).toBe('audit-tx');
  });

  it('propagates persistence failures so audited writes can roll back', async () => {
    const repository = {
      create: jest.fn((value) => value),
      save: jest.fn().mockRejectedValue(new Error('database unavailable')),
    } as any;
    const service = new AuditService(repository);

    await expect(
      service.record({
        action: 'user.suspend',
        entityType: 'user',
        entityId: 'user-1',
      }),
    ).rejects.toThrow('database unavailable');
  });
});
