import { AdminDashboardService } from './admin-dashboard.service';
import { AdminRole, User, UserRole } from '../../../users/entities/user.entity';

function makeAdmin(adminRole: AdminRole): User {
  return {
    id: 'admin-1',
    name: 'Admin',
    email: 'admin@engida.test',
    role: UserRole.ADMIN,
    adminRole,
    isActive: true,
  } as User;
}

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;
  let auditService: { list: jest.Mock };

  beforeEach(() => {
    const countRepository = () => ({ count: jest.fn().mockResolvedValue(0) });
    auditService = {
      list: jest.fn().mockResolvedValue({
        data: [{ id: 'audit-1', action: 'user.suspend' }],
        total: 1,
        page: 1,
        limit: 8,
        totalPages: 1,
      }),
    };

    service = new AdminDashboardService(
      countRepository() as any,
      countRepository() as any,
      countRepository() as any,
      countRepository() as any,
      countRepository() as any,
      countRepository() as any,
      countRepository() as any,
      countRepository() as any,
      auditService as any,
    );
  });

  it('returns recent audit entries to roles with audit access', async () => {
    const result = await service.getSummary(makeAdmin(AdminRole.SUPER_ADMIN));

    expect(auditService.list).toHaveBeenCalledWith({ page: 1, limit: 8 });
    expect(result.recentAudit).toEqual([
      { id: 'audit-1', action: 'user.suspend' },
    ]);
  });

  it('does not query or return audit entries to roles without audit access', async () => {
    const result = await service.getSummary(makeAdmin(AdminRole.SUPPORT_AGENT));

    expect(auditService.list).not.toHaveBeenCalled();
    expect(result.recentAudit).toEqual([]);
  });
});
