import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum FaqCategory {
  BOOKING = 'BOOKING',
  PAYMENTS = 'PAYMENTS',
  HOSTING = 'HOSTING',
  SAFETY = 'SAFETY',
  GENERAL = 'GENERAL',
}

@Entity('faq_items')
@Index('idx_faq_items_category', ['category'])
@Index('idx_faq_items_is_published', ['isPublished'])
export class FaqItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: FaqCategory,
    default: FaqCategory.GENERAL,
  })
  category: FaqCategory;

  @Column({ type: 'varchar', length: 300 })
  question: string;

  @Column({ type: 'varchar', length: 350, nullable: true })
  questionAmharic: string | null;

  @Column({ type: 'text' })
  answer: string;

  @Column({ type: 'text', nullable: true })
  answerAmharic: string | null;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @Column({ type: 'boolean', default: true })
  isPublished: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
