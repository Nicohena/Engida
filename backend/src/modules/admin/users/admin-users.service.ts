import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Not, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  AdminRole,
  User,
  UserRole,
} from '../../../users/entities/user.entity';
import { HostProfile } from '../../../users/entities/host-profile.entity';
import { Property } from '../../properties/entities/property.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { Review } from '../../reviews/entities/review.entity';
import { RefreshToken } from '../../../auth/entities/refresh-token.entity';
import { AuditService } from '../../audit/audit.service';
import { getAdminPermissions, hasPermission, Permission } from '../rbac/permissions';
import {
  CreateAdminUserDto,
  QueryAdminUsersDto,
  UpdateAdminRoleDto,
  UpdateUserStatusDto,
} from './dto/admin-users.dto';

export interface AdminUserView {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  adminRole: AdminRole | null;
  isActive: boolean;
  avatar: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
  hostProfile: {
    id: string;
    displayName: string | null;
    verificationStatus: string;
    phone: string | null;
  } | null;
}

export interface PaginatedAdminUsers {
  data: AdminUserView[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async list(query: QueryAdminUsersDto): Promise<PaginatedAdminUsers> {
    const page = Math.max(query.page || 1, 1);
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.hostProfile', 'hostProfile')
      .select([
        'user.id',
        'user.name',
        'user.email',
        'user.role',
        'user.adminRole',
        'user.isActive',
        'user.avatar',
        'user.phone',
        'user.createdAt',
        'user.updatedAt',
        'hostProfile.id',
        'hostProfile.displayName',
        'hostProfile.verificationStatus',
        'hostProfile.phone',
      ]);

    if (query.q?.trim()) {
      const term = `%${query.q.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(user.name) LIKE :term OR LOWER(user.email) LIKE :term OR LOWER(user.phone) LIKE :term)',
        { term },
      );
    }

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    if (query.adminRole) {
      qb.andWhere('user.adminRole = :adminRole', { adminRole: query.adminRole });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive: query.isActive });
    }

    const sort = query.sort || 'createdAt';
    const order = (query.order || 'desc').toUpperCase() as 'ASC' | 'DESC';
    qb.orderBy(`user.${sort}`, order);

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      data: data.map((user) => this.toView(user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getDetail(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['hostProfile'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    const [properties, bookingsAsGuest, bookingsAsHost, reviews] = await Promise.all([
      this.propertyRepository.count({ where: { hostId: id } }),
      this.bookingRepository.count({ where: { guestId: id } }),
      this.bookingRepository
        .createQueryBuilder('booking')
        .innerJoin('booking.property', 'property')
        .where('property.host_id = :id', { id })
        .getCount(),
      this.reviewRepository.count({ where: { userId: id } }),
    ]);

    return {
      ...this.toView(user),
      permissions: getAdminPermissions(user),
      counts: {
        properties,
        bookingsAsGuest,
        bookingsAsHost,
        reviews,
      },
    };
  }

  async updateStatus(
    id: string,
    dto: UpdateUserStatusDto,
    actor: User,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AdminUserView> {
    const reason = dto.reason?.trim();
    if (!reason || reason.length < 5) {
      throw new BadRequestException('A reason of at least 5 characters is required');
    }

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(User);
      const user = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new NotFoundException(`User with ID "${id}" not found`);
      }

      if (user.id === actor.id && !dto.isActive) {
        throw new ForbiddenException('You cannot suspend your own administrator account');
      }

      if (
        user.role === UserRole.ADMIN &&
        !hasPermission(actor, Permission.ADMINS_MANAGE)
      ) {
        throw new ForbiddenException(
          'Only Super Admins can change administrator account status',
        );
      }

      if (!dto.isActive) {
        await this.assertNotLastSuperAdmin(user, manager);
      }

      const before = { isActive: user.isActive };
      user.isActive = dto.isActive;
      const saved = await repository.save(user);

      if (!dto.isActive) {
        await manager.getRepository(RefreshToken).update(
          { userId: user.id, isRevoked: false },
          { isRevoked: true },
        );
      }

      await this.auditService.record(
        {
          actor,
          action: dto.isActive ? 'user.reactivate' : 'user.suspend',
          entityType: 'user',
          entityId: user.id,
          before,
          after: { isActive: saved.isActive },
          metadata: { reason },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
        manager,
      );

      saved.hostProfile =
        (await manager
          .getRepository(HostProfile)
          .findOne({ where: { userId: user.id } })) || undefined;

      return this.toView(saved);
    });
  }

  async updateAdminRole(
    id: string,
    dto: UpdateAdminRoleDto,
    actor: User,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AdminUserView> {
    const reason = dto.reason?.trim();
    if (!reason || reason.length < 5) {
      throw new BadRequestException('A reason of at least 5 characters is required');
    }

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(User);
      const user = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new NotFoundException(`User with ID "${id}" not found`);
      }

      if (!dto.adminRole && user.id === actor.id) {
        throw new ForbiddenException('You cannot remove your own administrator role');
      }

      const wasSuperAdmin =
        user.role === UserRole.ADMIN &&
        (!user.adminRole || user.adminRole === AdminRole.SUPER_ADMIN);
      if (wasSuperAdmin && dto.adminRole !== AdminRole.SUPER_ADMIN) {
        await this.assertNotLastSuperAdmin(user, manager);
      }

      const before = { role: user.role, adminRole: user.adminRole };
      user.role = dto.adminRole ? UserRole.ADMIN : UserRole.USER;
      user.adminRole = dto.adminRole;
      const saved = await repository.save(user);

      // Role changes take effect on the next request because JwtStrategy reloads
      // the account. Revoking refresh tokens is still the safer default.
      await manager.getRepository(RefreshToken).update(
        { userId: user.id, isRevoked: false },
        { isRevoked: true },
      );

      await this.auditService.record(
        {
          actor,
          action: 'user.admin_role.update',
          entityType: 'user',
          entityId: user.id,
          before,
          after: { role: saved.role, adminRole: saved.adminRole },
          metadata: { reason },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
        manager,
      );

      saved.hostProfile =
        (await manager
          .getRepository(HostProfile)
          .findOne({ where: { userId: user.id } })) || undefined;

      return this.toView(saved);
    });
  }

  async createAdmin(
    dto: CreateAdminUserDto,
    actor: User,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AdminUserView> {
    const email = dto.email.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(User);
      const existing = await repository.findOne({ where: { email } });
      if (existing) {
        throw new ConflictException('An account with this email already exists');
      }

      const user = repository.create({
        name: dto.name.trim(),
        email,
        passwordHash,
        role: UserRole.ADMIN,
        adminRole: dto.adminRole,
      });
      const saved = await repository.save(user);

      await this.auditService.record(
        {
          actor,
          action: 'admin.create',
          entityType: 'user',
          entityId: saved.id,
          after: {
            name: saved.name,
            email: saved.email,
            adminRole: saved.adminRole,
          },
          metadata: { reason: 'Administrator account created' },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
        },
        manager,
      );

      return this.toView(saved);
    });
  }

  private async assertNotLastSuperAdmin(
    target: User,
    manager: EntityManager,
  ): Promise<void> {
    const isSuperAdmin =
      target.role === UserRole.ADMIN &&
      (!target.adminRole || target.adminRole === AdminRole.SUPER_ADMIN);
    if (!isSuperAdmin) {
      return;
    }

    const remaining = await manager.getRepository(User).count({
      where: [
        {
          id: Not(target.id),
          role: UserRole.ADMIN,
          adminRole: AdminRole.SUPER_ADMIN,
          isActive: true,
        },
        {
          id: Not(target.id),
          role: UserRole.ADMIN,
          adminRole: IsNull(),
          isActive: true,
        },
      ],
    });

    if (remaining < 1) {
      throw new BadRequestException(
        'At least one active Super Admin must remain. Promote another administrator first.',
      );
    }
  }

  private toView(user: User): AdminUserView {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      adminRole: user.adminRole,
      isActive: user.isActive,
      avatar: user.avatar,
      phone: user.phone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      hostProfile: user.hostProfile
        ? {
            id: user.hostProfile.id,
            displayName: user.hostProfile.displayName,
            verificationStatus: user.hostProfile.verificationStatus,
            phone: user.hostProfile.phone,
          }
        : null,
    };
  }
}
