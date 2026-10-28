import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Refund } from './refund.entity';
import { User } from '../../../users/entities/user.entity';

@Entity('refund_events')
export class RefundEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'refund_id' })
  refundId: string;

  @ManyToOne(() => Refund, (refund) => refund.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'refund_id' })
  refund: Refund;

  @Column({ type: 'varchar', length: 50, name: 'event_type' })
  eventType: string;

  @Column({ type: 'varchar', length: 32, nullable: true, name: 'from_status' })
  fromStatus: string | null;

  @Column({ type: 'varchar', length: 32, name: 'to_status' })
  toStatus: string;

  @Column({ type: 'uuid', nullable: true, name: 'actor_id' })
  actorId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'provider_reference' })
  providerReference: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
