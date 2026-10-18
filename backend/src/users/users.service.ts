import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
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
    passwordHash: string;
    role?: UserRole;
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
      passwordHash: data.passwordHash,
      role: data.role || UserRole.USER,
    });

    const savedUser = await this.userRepository.save(user);
    delete (savedUser as Partial<User>).passwordHash;
    return savedUser;
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
