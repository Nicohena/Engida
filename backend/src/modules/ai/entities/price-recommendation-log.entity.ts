import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum HostRecommendationAction {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  MODIFIED = 'MODIFIED',
  REJECTED = 'REJECTED',
}

@Entity('price_recommendation_logs')
@Index('idx_rec_logs_property_id', ['propertyId'])
@Index('idx_rec_logs_host_id', ['hostId'])
@Index('idx_rec_logs_city', ['city'])
@Index('idx_rec_logs_created_at', ['createdAt'])
export class PriceRecommendationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true, name: 'property_id' })
  propertyId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'host_id' })
  hostId: string | null;

  @Column({ type: 'varchar', length: 20, name: 'listing_type', default: 'RENTAL' })
  listingType: string;

  @Column({ type: 'varchar', length: 50, name: 'property_type' })
  propertyType: string;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'sub_city' })
  subCity: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  neighborhood: string | null;

  @Column({ type: 'jsonb', name: 'input_features', default: {} })
  inputFeatures: Record<string, any>;

  @Column({ type: 'decimal', precision: 14, scale: 2, name: 'recommended_price' })
  recommendedPrice: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, name: 'price_range_min' })
  priceRangeMin: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, name: 'price_range_max' })
  priceRangeMax: number;

  @Column({ type: 'decimal', precision: 4, scale: 3 })
  confidence: number;

  @Column({ type: 'varchar', length: 20, name: 'confidence_level', default: 'MEDIUM' })
  confidenceLevel: string;

  @Column({ type: 'text', nullable: true, name: 'confidence_explanation' })
  confidenceExplanation: string | null;

  @Column({ type: 'varchar', length: 60, name: 'valuation_source', default: 'market_calibrated_hedonic' })
  valuationSource: string;

  @Column({ type: 'jsonb', nullable: true, name: 'comparable_evidence' })
  comparableEvidence: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true, name: 'seasonal_adjustment' })
  seasonalAdjustment: Record<string, any> | null;

  @Column({
    type: 'enum',
    enum: HostRecommendationAction,
    default: HostRecommendationAction.PENDING,
    name: 'host_action',
  })
  hostAction: HostRecommendationAction;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true, name: 'chosen_price' })
  chosenPrice: number | null;

  @Column({ type: 'text', nullable: true, name: 'feedback_reason' })
  feedbackReason: string | null;

  @Column({ type: 'boolean', default: false, name: 'was_booked' })
  wasBooked: boolean;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true, name: 'actual_booking_price' })
  actualBookingPrice: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'feedback_at' })
  feedbackAt: Date | null;
}

