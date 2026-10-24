import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  VersionColumn,
} from 'typeorm';
import { Property } from './property.entity';
import { User } from '../../../users/entities/user.entity';

export enum ReviewSubmissionType {
  INITIAL_PUBLISH = 'INITIAL_PUBLISH',
  IMPORTANT_EDIT = 'IMPORTANT_EDIT',
}

export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

@Entity('listing_reviews')
@Index('idx_listing_reviews_property_id', ['propertyId'])
@Index('idx_listing_reviews_status', ['status'])
@Index('idx_listing_reviews_submission_type', ['submissionType'])
@Index('idx_listing_reviews_submitted_by', ['submittedByHostId'])
export class ListingReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'property_id' })
  propertyId: string;

  @ManyToOne(() => Property, (property) => property.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({
    type: 'enum',
    enum: ReviewSubmissionType,
    name: 'submission_type',
  })
  submissionType: ReviewSubmissionType;

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.PENDING,
    name: 'status',
  })
  status: ReviewStatus;

  /**
   * For IMPORTANT_EDIT reviews: stores proposed field values.
   * For INITIAL_PUBLISH reviews: can store an optional snapshot or submission notes.
   */
  @Column({ type: 'jsonb', nullable: true, name: 'proposed_changes' })
  proposedChanges: Record<string, any> | null;

  @Column({ type: 'uuid', name: 'submitted_by_host_id' })
  submittedByHostId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'submitted_by_host_id' })
  submittedByHost: User;

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt: Date;

  @Column({ type: 'uuid', nullable: true, name: 'reviewed_by_admin_id' })
  reviewedByAdminId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by_admin_id' })
  reviewedByAdmin: User | null;

  @Column({ type: 'timestamp with time zone', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason: string | null;

  /**
   * Optimistic concurrency version column to prevent race conditions on review decisions.
   */
  @VersionColumn({ default: 1 })
  version: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
