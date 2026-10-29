import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../../../users/entities/user.entity';

export enum SettingCategory {
  GENERAL = 'GENERAL',
  BOOKINGS = 'BOOKINGS',
  FINANCE = 'FINANCE',
  LOCALIZATION = 'LOCALIZATION',
  NOTIFICATIONS = 'NOTIFICATIONS',
  SECURITY = 'SECURITY',
}

export enum SettingType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
}

@Entity('system_settings')
export class SystemSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 120, unique: true })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Index()
  @Column({
    type: 'varchar',
    length: 40,
    default: SettingCategory.GENERAL,
  })
  category: SettingCategory;

  @Column({
    type: 'varchar',
    length: 20,
    default: SettingType.STRING,
  })
  type: SettingType;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_public' })
  isPublic: boolean;

  @Column({ type: 'uuid', nullable: true, name: 'updated_by_id' })
  updatedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updated_by_id' })
  updatedBy: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
