import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../users/entities/user.entity';

export enum ReportTargetType {
  LISTING = 'LISTING',
  REVIEW = 'REVIEW',
}

export enum ReportReason {
  SCAM = 'SCAM',
  MISREPRESENTATION = 'MISREPRESENTATION',
  SAFETY = 'SAFETY',
  OFFENSIVE = 'OFFENSIVE',
  SPAM = 'SPAM',
  OTHER = 'OTHER',
}

export enum ReportStatus {
  OPEN = 'OPEN',
  INVESTIGATING = 'INVESTIGATING',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

@Entity('reports')
@Index('idx_reports_status_created', ['status', 'createdAt'])
@Index('idx_reports_target', ['targetType', 'targetId'])
@Index('idx_reports_reporter_created', ['reporterId', 'createdAt'])
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ReportTargetType,
    enumName: 'reports_target_type_enum',
    name: 'target_type',
  })
  targetType: ReportTargetType;

  @Column({ type: 'uuid', name: 'target_id' })
  targetId: string;

  @Column({ type: 'uuid', nullable: true, name: 'reporter_id' })
  reporterId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reporter_id' })
  reporter: User | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'reporter_email' })
  reporterEmail: string | null;

  @Column({
    type: 'enum',
    enum: ReportReason,
    enumName: 'reports_reason_enum',
  })
  reason: ReportReason;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    enumName: 'reports_status_enum',
    default: ReportStatus.OPEN,
  })
  status: ReportStatus;

  @Column({ type: 'text', nullable: true, name: 'resolution_note' })
  resolutionNote: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'resolved_by_id' })
  resolvedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolved_by_id' })
  resolvedBy: User | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'resolved_at' })
  resolvedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
