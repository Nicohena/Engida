import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AmenityCategory {
  ESSENTIALS = 'ESSENTIALS',
  KITCHEN = 'KITCHEN',
  SAFETY = 'SAFETY',
  OUTDOOR = 'OUTDOOR',
  WELLNESS = 'WELLNESS',
  SERVICES = 'SERVICES',
}

@Entity('amenities')
@Index('idx_amenities_category', ['category'])
@Index('idx_amenities_is_active', ['isActive'])
export class Amenity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  nameAmharic: string | null;

  @Column({
    type: 'enum',
    enum: AmenityCategory,
    default: AmenityCategory.ESSENTIALS,
  })
  category: AmenityCategory;

  @Column({ type: 'varchar', length: 100, nullable: true })
  icon: string | null;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
