import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../../users/entities/user.entity';

/**
 * Append-only record of privileged actions. Nothing in the application may
 * update or delete an audit row.
 */
@Entity('audit_logs')
@Index('idx_audit_logs_actor_created', ['actorId', 'createdAt'])
@Index('idx_audit_logs_entity', ['entityType', 'entityId'])
@Index('idx_audit_logs_action_created', ['action', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true, name: 'actor_id' })
  actorId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'actor_email' })
  actorEmail: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'actor_role' })
  actorRole: string | null;

  @Column({ type: 'varchar', length: 120 })
  action: string;

  @Column({ type: 'varchar', length: 80, name: 'entity_type' })
  entityType: string;

  @Column({ type: 'varchar', length: 120, nullable: true, name: 'entity_id' })
  entityId: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'before_state' })
  beforeState: unknown | null;

  @Column({ type: 'jsonb', nullable: true, name: 'after_state' })
  afterState: unknown | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'ip_address' })
  ipAddress: string | null;

  @Column({ type: 'text', nullable: true, name: 'user_agent' })
  userAgent: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
