import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, AuthProvider } from './entities/user.entity';
import { HostProfile, HostVerificationStatus } from './entities/host-profile.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(HostProfile)
    private readonly hostProfileRepository: Repository<HostProfile>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        role: true,
        isActive: true,
        authProvider: true,
        providerId: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
      relations: ['hostProfile'],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id, isActive: true },
      relations: ['hostProfile'],
    });
  }

  async createUser(data: {
    name: string;
    email: string;
    passwordHash?: string | null;
    role?: UserRole;
    authProvider?: AuthProvider;
    providerId?: string | null;
    avatar?: string | null;
  }): Promise<User> {
    const normalizedEmail = data.email.toLowerCase().trim();
    const existing = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const user = this.userRepository.create({
      name: data.name.trim(),
      email: normalizedEmail,
      passwordHash: data.passwordHash ?? null,
      role: data.role || UserRole.USER,
      authProvider: data.authProvider || AuthProvider.LOCAL,
      providerId: data.providerId ?? null,
      avatar: data.avatar ?? null,
    });

    const savedUser = await this.userRepository.save(user);
    delete (savedUser as Partial<User>).passwordHash;
    return savedUser;
  }

  /**
   * Look up an account by the identity it was linked to (Google `sub` claim).
   */
  async findByProvider(
    provider: AuthProvider,
    providerId: string,
  ): Promise<User | null> {
    return this.userRepository.findOne({
      where: { authProvider: provider, providerId },
      relations: ['hostProfile'],
    });
  }

  /**
   * Link an existing account to an external identity (e.g. Google).
   * Password-only accounts keep working, so this is a non-destructive upgrade.
   */
  async linkProvider(
    userId: string,
    provider: AuthProvider,
    providerId: string,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['hostProfile'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    user.authProvider = provider;
    user.providerId = providerId;

    return this.userRepository.save(user);
  }

  /**
   * Update display fields that are safe to refresh from an external identity
   * provider (currently used to enrich accounts created through Google Sign-In).
   */
  async updateProfileFields(
    userId: string,
    fields: { name?: string; avatar?: string | null },
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['hostProfile'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    if (fields.name !== undefined) user.name = fields.name.trim();
    if (fields.avatar !== undefined) user.avatar = fields.avatar;

    return this.userRepository.save(user);
  }

  async findHostProfile(userId: string): Promise<HostProfile | null> {
    return this.hostProfileRepository.findOne({
      where: { userId },
    });
  }

  async createOrUpdateHostProfile(
    userId: string,
    data: {
      displayName?: string;
      bio?: string;
      phone?: string;
      verificationStatus?: HostVerificationStatus;
    },
  ): Promise<HostProfile> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    let profile = await this.hostProfileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      profile = this.hostProfileRepository.create({
        userId,
        ...data,
      });
    } else {
      Object.assign(profile, data);
    }

    return this.hostProfileRepository.save(profile);
  }
}
