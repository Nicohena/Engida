import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Property } from '../../properties/entities/property.entity';
import { User } from '../../../users/entities/user.entity';

export enum ReviewModerationStatus {
  VISIBLE = 'VISIBLE',
  HIDDEN = 'HIDDEN',
}

@Entity('reviews')
@Index('idx_reviews_property_user_unique', ['propertyId', 'userId'], { unique: true })
@Index('idx_reviews_moderation_status', ['moderationStatus'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'property_id' })
  propertyId: string;

  @ManyToOne(() => Property, (property) => property.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({
    type: 'enum',
    enum: ReviewModerationStatus,
    enumName: 'reviews_moderation_status_enum',
    default: ReviewModerationStatus.VISIBLE,
    name: 'moderation_status',
  })
  moderationStatus: ReviewModerationStatus;

  @Column({ type: 'text', nullable: true, name: 'moderation_reason' })
  moderationReason: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'moderated_by_id' })
  moderatedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'moderated_by_id' })
  moderatedBy: User | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'moderated_at' })
  moderatedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
