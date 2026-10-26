import { ExecutionContext } from '@nestjs/common';
import { AdminRole, User, UserRole } from '../../../users/entities/user.entity';
import { SuperAdminBypassGuard } from './super-admin-bypass.guard';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    name: 'Admin',
    email: 'admin@engida.test',
    role: UserRole.ADMIN,
    adminRole: AdminRole.SUPPORT_AGENT,
    isActive: true,
    ...overrides,
  } as User;
}

function contextFor(user?: User): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('SuperAdminBypassGuard', () => {
  const guard = new SuperAdminBypassGuard();

  it('keeps the legacy admin override for Super Admins', () => {
    const user = makeUser({ adminRole: AdminRole.SUPER_ADMIN });

    expect(guard.canActivate(contextFor(user))).toBe(true);
    expect(user.role).toBe(UserRole.ADMIN);
  });

  it('keeps the legacy admin override for unmigrated admins without an adminRole', () => {
    const user = makeUser({ adminRole: null });

    expect(guard.canActivate(contextFor(user))).toBe(true);
    expect(user.role).toBe(UserRole.ADMIN);
  });

  it('downgrades granular admin roles so host/property overrides do not apply', () => {
    const user = makeUser({ adminRole: AdminRole.SUPPORT_AGENT });

    expect(guard.canActivate(contextFor(user))).toBe(true);
    expect(user.role).toBe(UserRole.USER);
  });

  it('leaves regular users unchanged', () => {
    const user = makeUser({ role: UserRole.USER, adminRole: null });

    expect(guard.canActivate(contextFor(user))).toBe(true);
    expect(user.role).toBe(UserRole.USER);
  });

  it('does not fail when authentication has not populated a user', () => {
    expect(guard.canActivate(contextFor(undefined))).toBe(true);
  });
});
