import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../../users/entities/user.entity';
import { Booking } from '../../../bookings/entities/booking.entity';
import { Property } from '../../../properties/entities/property.entity';
import { Report } from '../../../reports/entities/report.entity';
import { CaseMessage } from './case-message.entity';
import { CaseNote } from './case-note.entity';
import { CaseAttachment } from './case-attachment.entity';
import { CaseEvent } from './case-event.entity';

export enum CaseType {
  COMPLAINT = 'COMPLAINT',
  DISPUTE = 'DISPUTE',
  SAFETY = 'SAFETY',
  SUPPORT = 'SUPPORT',
  CANCELLATION = 'CANCELLATION',
}

export enum CaseCategory {
  BOOKING = 'BOOKING',
  LISTING = 'LISTING',
  ACCOUNT = 'ACCOUNT',
  REVIEW = 'REVIEW',
  PAYMENT = 'PAYMENT',
  OTHER = 'OTHER',
}

export enum CasePriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum CaseSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum CaseStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_ON_REQUESTER = 'WAITING_ON_REQUESTER',
  WAITING_ON_INTERNAL = 'WAITING_ON_INTERNAL',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum CompensationStatus {
  NONE = 'NONE',
  PROPOSED = 'PROPOSED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * Unified operations case for complaints, disputes, safety concerns and
 * support tickets. Case messages are support correspondence; internal notes
 * are never shown to the requester.
 */
@Entity('cases')
@Index('idx_cases_status_created', ['status', 'createdAt'])
@Index('idx_cases_assignee_status', ['assigneeId', 'status'])
@Index('idx_cases_booking', ['bookingId'])
@Index('idx_cases_due', ['resolutionDueAt'])
export class Case {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  number: string;

  @Column({
    type: 'enum',
    enum: CaseType,
    enumName: 'case_type_enum',
  })
  type: CaseType;

  @Column({
    type: 'enum',
    enum: CaseCategory,
    enumName: 'case_category_enum',
    default: CaseCategory.OTHER,
  })
  category: CaseCategory;

  @Column({
    type: 'enum',
    enum: CasePriority,
    enumName: 'case_priority_enum',
    default: CasePriority.NORMAL,
  })
  priority: CasePriority;

  @Column({
    type: 'enum',
    enum: CaseSeverity,
    enumName: 'case_severity_enum',
    default: CaseSeverity.MEDIUM,
  })
  severity: CaseSeverity;

  @Column({
    type: 'enum',
    enum: CaseStatus,
    enumName: 'case_status_enum',
    default: CaseStatus.OPEN,
  })
  status: CaseStatus;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'uuid', name: 'requester_user_id', nullable: true })
  requesterUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'requester_user_id' })
  requesterUser: User | null;

  @Column({ type: 'varchar', length: 255, name: 'requester_name' })
  requesterName: string;

  @Column({ type: 'varchar', length: 255, name: 'requester_email', nullable: true })
  requesterEmail: string | null;

  @Column({ type: 'uuid', name: 'assignee_id', nullable: true })
  assigneeId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignee_id' })
  assignee: User | null;

  @Column({ type: 'uuid', name: 'booking_id', nullable: true })
  bookingId: string | null;

  @ManyToOne(() => Booking, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking | null;

  @Column({ type: 'uuid', name: 'property_id', nullable: true })
  propertyId: string | null;

  @ManyToOne(() => Property, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'property_id' })
  property: Property | null;

  @Column({ type: 'uuid', name: 'report_id', nullable: true })
  reportId: string | null;

  @ManyToOne(() => Report, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'report_id' })
  report: Report | null;

  @Column({ type: 'jsonb', nullable: true })
  context: Record<string, unknown> | null;

  @Column({ type: 'timestamptz', name: 'first_response_due_at' })
  firstResponseDueAt: Date;

  @Column({ type: 'timestamptz', name: 'resolution_due_at' })
  resolutionDueAt: Date;

  @Column({ type: 'timestamptz', name: 'first_responded_at', nullable: true })
  firstRespondedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'resolved_at', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'closed_at', nullable: true })
  closedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'first_response_breached_at', nullable: true })
  firstResponseBreachedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'resolution_breached_at', nullable: true })
  resolutionBreachedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'escalated_at', nullable: true })
  escalatedAt: Date | null;

  @Column({ type: 'text', name: 'escalation_reason', nullable: true })
  escalationReason: string | null;

  @Column({ type: 'timestamptz', name: 'last_message_at', nullable: true })
  lastMessageAt: Date | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'compensation_amount',
    nullable: true,
  })
  compensationAmount: string | null;

  @Column({
    type: 'varchar',
    length: 10,
    name: 'compensation_currency',
    default: 'ETB',
  })
  compensationCurrency: string;

  @Column({
    type: 'enum',
    enum: CompensationStatus,
    enumName: 'case_compensation_status_enum',
    name: 'compensation_status',
    default: CompensationStatus.NONE,
  })
  compensationStatus: CompensationStatus;

  @Column({ type: 'text', name: 'compensation_note', nullable: true })
  compensationNote: string | null;

  @Column({ type: 'uuid', name: 'compensation_proposed_by_id', nullable: true })
  compensationProposedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'compensation_proposed_by_id' })
  compensationProposedBy: User | null;

  @Column({ type: 'uuid', name: 'compensation_decided_by_id', nullable: true })
  compensationDecidedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'compensation_decided_by_id' })
  compensationDecidedBy: User | null;

  @Column({ type: 'timestamptz', name: 'compensation_decided_at', nullable: true })
  compensationDecidedAt: Date | null;

  @Column({ type: 'uuid', name: 'created_by_id', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @Column({ type: 'varchar', length: 255, name: 'idempotency_key', nullable: true })
  idempotencyKey: string | null;

  @OneToMany(() => CaseMessage, (message) => message.case)
  messages?: CaseMessage[];

  @OneToMany(() => CaseNote, (note) => note.case)
  notes?: CaseNote[];

  @OneToMany(() => CaseAttachment, (attachment) => attachment.case)
  attachments?: CaseAttachment[];

  @OneToMany(() => CaseEvent, (event) => event.case)
  events?: CaseEvent[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
