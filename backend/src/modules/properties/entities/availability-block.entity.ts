import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { Property } from './property.entity';

@Entity('availability_blocks')
@Index('idx_availability_blocks_property_dates', ['propertyId', 'startDate', 'endDate'])
export class AvailabilityBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_availability_blocks_property_id')
  @Column({ type: 'uuid', name: 'property_id' })
  propertyId: string;

  @ManyToOne(() => Property, (property) => property.availabilityBlocks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({ type: 'date', name: 'start_date' })
  startDate: string;

  @Column({ type: 'date', name: 'end_date' })
  endDate: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  validateDateRange() {
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      if (end <= start) {
        throw new BadRequestException('End date must be strictly after start date');
      }
    }
  }
}
