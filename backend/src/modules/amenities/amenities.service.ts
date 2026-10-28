import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Amenity } from './entities/amenity.entity';

@Injectable()
export class AmenitiesService {
  constructor(
    @InjectRepository(Amenity)
    private readonly amenityRepository: Repository<Amenity>,
  ) {}

  async findAll(): Promise<Amenity[]> {
    return this.amenityRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findByIds(ids: string[]): Promise<Amenity[]> {
    return this.amenityRepository.findByIds(ids);
  }

  async findOrCreate(name: string, icon?: string): Promise<Amenity> {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      throw new Error('Amenity name cannot be empty');
    }
    const all = await this.amenityRepository.find();
    const existing = all.find(
      (a) => a.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) {
      return existing;
    }
    const amenity = this.amenityRepository.create({
      name: trimmed,
      icon: icon || null,
    });
    return this.amenityRepository.save(amenity);
  }
}
