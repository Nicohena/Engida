import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { HostProfile } from './host-profile.entity';
import { Property } from '../../modules/properties/entities/property.entity';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

/**
 * Granular admin roles. `UserRole.ADMIN` remains the coarse account flag so
 * existing guards and database values keep working; `adminRole` decides what an
 * administrator is actually allowed to do.
 */
export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  BOOKING_MANAGER = 'BOOKING_MANAGER',
  SUPPORT_AGENT = 'SUPPORT_AGENT',
  PROPERTY_MODERATOR = 'PROPERTY_MODERATOR',
  FINANCE_MANAGER = 'FINANCE_MANAGER',
}

/**
 * Where the user's credentials come from.
 * LOCAL  = email + password (default)
 * GOOGLE = Google Sign-In (OpenID Connect)
 */
export enum AuthProvider {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, select: false, nullable: true, name: 'password_hash' })
  passwordHash: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: AuthProvider.LOCAL,
    name: 'auth_provider',
  })
  authProvider: AuthProvider;

  /**
   * Identifier returned by the identity provider (Google `sub` claim).
   * NULL for accounts that only use email/password.
   */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'provider_id' })
  providerId: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  /**
   * Set only for administrator accounts. Null means a regular user.
   * Legacy admins were backfilled to SUPER_ADMIN by migration.
   */
  @Column({
    type: 'enum',
    enum: AdminRole,
    nullable: true,
    name: 'admin_role',
  })
  adminRole: AdminRole | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true, name: 'office_location' })
  officeLocation: string | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshToken[];

  @OneToOne(() => HostProfile, (hostProfile) => hostProfile.user)
  hostProfile?: HostProfile;

  @OneToMany(() => Property, (property) => property.host)
  properties?: Property[];
}
