import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Case } from './case.entity';
import { User } from '../../../../users/entities/user.entity';

export enum CaseMessageDirection {
  OUTBOUND = 'OUTBOUND',
  INBOUND = 'INBOUND',
}

export enum CaseMessageChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  SYSTEM = 'SYSTEM',
}

export enum CaseMessageDeliveryStatus {
  DELIVERED_IN_APP = 'DELIVERED_IN_APP',
  LOGGED = 'LOGGED',
  FAILED = 'FAILED',
}

@Entity('case_messages')
@Index('idx_case_messages_case_created', ['caseId', 'createdAt'])
@Index('idx_case_messages_idempotency', ['caseId', 'idempotencyKey'], {
  unique: true,
  where: '"idempotency_key" IS NOT NULL',
})
export class CaseMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'case_id' })
  caseId: string;

  @ManyToOne(() => Case, (supportCase) => supportCase.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'case_id' })
  case: Case;

  @Column({
    type: 'enum',
    enum: CaseMessageDirection,
    enumName: 'case_message_direction_enum',
  })
  direction: CaseMessageDirection;

  @Column({
    type: 'enum',
    enum: CaseMessageChannel,
    enumName: 'case_message_channel_enum',
    default: CaseMessageChannel.IN_APP,
  })
  channel: CaseMessageChannel;

  @Column({ type: 'varchar', length: 255, name: 'author_name' })
  authorName: string;

  @Column({ type: 'varchar', length: 255, name: 'author_email', nullable: true })
  authorEmail: string | null;

  @Column({ type: 'text' })
  body: string;

  @Column({
    type: 'enum',
    enum: CaseMessageDeliveryStatus,
    enumName: 'case_message_delivery_enum',
    name: 'delivery_status',
    default: CaseMessageDeliveryStatus.LOGGED,
  })
  deliveryStatus: CaseMessageDeliveryStatus;

  @Column({ type: 'uuid', name: 'created_by_id', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @Column({ type: 'varchar', length: 255, name: 'idempotency_key', nullable: true })
  idempotencyKey: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
