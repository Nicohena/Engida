import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PropertyCategory } from './entities/property-category.entity';
import { Destination } from './entities/destination.entity';
import { Amenity } from '../amenities/entities/amenity.entity';
import { Property } from '../properties/entities/property.entity';
import {
  CreateAmenityDto,
  CreateCategoryDto,
  CreateDestinationDto,
  UpdateAmenityDto,
  UpdateCategoryDto,
  UpdateDestinationDto,
} from './dto/admin-catalog.dto';

@Injectable()
export class AdminCatalogService {
  constructor(
    @InjectRepository(PropertyCategory)
    private readonly categoryRepository: Repository<PropertyCategory>,
    @InjectRepository(Destination)
    private readonly destinationRepository: Repository<Destination>,
    @InjectRepository(Amenity)
    private readonly amenityRepository: Repository<Amenity>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
  ) {}

  // ==================== CATEGORIES ====================

  async listCategories() {
    return this.categoryRepository.find({
      order: { displayOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async createCategory(dto: CreateCategoryDto) {
    const existing = await this.categoryRepository.findOne({
      where: { slug: dto.slug.toLowerCase().trim() },
    });
    if (existing) {
      throw new ConflictException(`Category slug "${dto.slug}" already exists`);
    }

    const category = this.categoryRepository.create({
      ...dto,
      slug: dto.slug.toLowerCase().trim(),
    });
    return this.categoryRepository.save(category);
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }

    Object.assign(category, dto);
    return this.categoryRepository.save(category);
  }

  async deleteCategory(id: string) {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }
    await this.categoryRepository.remove(category);
    return { success: true, deletedId: id };
  }

  // ==================== DESTINATIONS ====================

  async listDestinations(onlyFeatured?: boolean) {
    const where: Record<string, unknown> = {};
    if (onlyFeatured !== undefined) {
      where.isFeatured = onlyFeatured;
    }
    return this.destinationRepository.find({
      where,
      order: { displayOrder: 'ASC', name: 'ASC' },
    });
  }

  async createDestination(dto: CreateDestinationDto) {
    const existing = await this.destinationRepository.findOne({
      where: { slug: dto.slug.toLowerCase().trim() },
    });
    if (existing) {
      throw new ConflictException(`Destination slug "${dto.slug}" already exists`);
    }

    const destination = this.destinationRepository.create({
      ...dto,
      slug: dto.slug.toLowerCase().trim(),
    });
    return this.destinationRepository.save(destination);
  }

  async updateDestination(id: string, dto: UpdateDestinationDto) {
    const destination = await this.destinationRepository.findOne({ where: { id } });
    if (!destination) {
      throw new NotFoundException(`Destination ${id} not found`);
    }

    Object.assign(destination, dto);
    return this.destinationRepository.save(destination);
  }

  async deleteDestination(id: string) {
    const destination = await this.destinationRepository.findOne({ where: { id } });
    if (!destination) {
      throw new NotFoundException(`Destination ${id} not found`);
    }
    await this.destinationRepository.remove(destination);
    return { success: true, deletedId: id };
  }

  // ==================== AMENITIES ====================

  async listAmenities() {
    return this.amenityRepository.find({
      order: { category: 'ASC', displayOrder: 'ASC', name: 'ASC' },
    });
  }

  async createAmenity(dto: CreateAmenityDto) {
    const existing = await this.amenityRepository.findOne({
      where: { name: dto.name.trim() },
    });
    if (existing) {
      throw new ConflictException(`Amenity "${dto.name}" already exists`);
    }

    const amenity = this.amenityRepository.create({
      ...dto,
      name: dto.name.trim(),
    });
    return this.amenityRepository.save(amenity);
  }

  async updateAmenity(id: string, dto: UpdateAmenityDto) {
    const amenity = await this.amenityRepository.findOne({ where: { id } });
    if (!amenity) {
      throw new NotFoundException(`Amenity ${id} not found`);
    }

    Object.assign(amenity, dto);
    return this.amenityRepository.save(amenity);
  }

  async deleteAmenity(id: string) {
    const amenity = await this.amenityRepository.findOne({ where: { id } });
    if (!amenity) {
      throw new NotFoundException(`Amenity ${id} not found`);
    }
    await this.amenityRepository.remove(amenity);
    return { success: true, deletedId: id };
  }
}
