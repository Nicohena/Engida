import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export enum ProviderEventStatus {
  RECEIVED = 'RECEIVED',
  PROCESSED = 'PROCESSED',
  IGNORED = 'IGNORED',
  FAILED = 'FAILED',
}

@Entity('provider_events')
@Unique('uq_provider_events_provider_event', ['provider', 'providerEventId'])
export class ProviderEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'varchar', length: 120, name: 'provider_event_id' })
  providerEventId: string;

  @Column({ type: 'varchar', length: 100, name: 'event_type' })
  eventType: string;

  @Column({ type: 'boolean', default: false, name: 'signature_verified' })
  signatureVerified: boolean;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any> | null;

  @CreateDateColumn({ name: 'received_at' })
  receivedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'processed_at' })
  processedAt: Date | null;

  @Index()
  @Column({ type: 'varchar', length: 32, default: ProviderEventStatus.RECEIVED })
  status: ProviderEventStatus;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'int', default: 0, name: 'replay_count' })
  replayCount: number;
}
