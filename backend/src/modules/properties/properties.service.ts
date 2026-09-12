import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Property } from './entities/property.entity';
import { Room } from './entities/room.entity';
import { Amenity } from '../amenities/entities/amenity.entity';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UserRole } from '../../users/entities/user.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(Amenity)
    private readonly amenityRepository: Repository<Amenity>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async findAll(query: QueryPropertyDto): Promise<{
    data: Property[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 12;
    const skip = (page - 1) * limit;

    const qb: SelectQueryBuilder<Property> = this.propertyRepository
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.host', 'host')
      .leftJoinAndSelect('property.amenities', 'amenities')
      .leftJoinAndSelect('property.rooms', 'rooms')
      .where('property.isAvailable = :available', { available: true });

    // Filters
    if (query.city) {
      qb.andWhere('LOWER(property.city) = LOWER(:city)', { city: query.city });
    }

    if (query.propertyType) {
      qb.andWhere('property.propertyType = :type', { type: query.propertyType });
    }

    if (query.minPrice !== undefined) {
      qb.andWhere('property.pricePerNight >= :minPrice', { minPrice: query.minPrice });
    }

    if (query.maxPrice !== undefined) {
      qb.andWhere('property.pricePerNight <= :maxPrice', { maxPrice: query.maxPrice });
    }

    if (query.bedrooms !== undefined) {
      qb.andWhere('property.bedrooms >= :bedrooms', { bedrooms: query.bedrooms });
    }

    if (query.guests !== undefined) {
      qb.andWhere('property.maxGuests >= :guests', { guests: query.guests });
    }

    if (query.search) {
      qb.andWhere(
        '(LOWER(property.title) LIKE LOWER(:search) OR LOWER(property.description) LIKE LOWER(:search) OR LOWER(property.address) LIKE LOWER(:search))',
        { search: `%${query.search}%` },
      );
    }

    // Sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'DESC';
    const allowedSortFields = ['pricePerNight', 'createdAt', 'bedrooms', 'maxGuests', 'city'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    qb.orderBy(`property.${safeSortBy}`, sortOrder === 'ASC' ? 'ASC' : 'DESC');

    // Select host fields without password
    qb.addSelect(['host.id', 'host.name', 'host.email']);

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Property> {
    const property = await this.propertyRepository
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.amenities', 'amenity')
      .leftJoinAndSelect('property.rooms', 'room')
      .leftJoinAndSelect('property.reviews', 'review')
      .leftJoinAndSelect('review.user', 'reviewUser')
      .leftJoin('property.host', 'host')
      .addSelect([
        'host.id',
        'host.name',
        'host.email',
        'host.phone',
        'host.title',
        'host.bio',
        'host.avatar',
        'host.officeLocation',
      ])
      .where('property.id = :id', { id })
      .getOne();

    if (!property) {
      throw new NotFoundException(`Property with ID "${id}" not found`);
    }

    return property;
  }

  async findRelated(id: string, limit = 4): Promise<Property[]> {
    const property = await this.propertyRepository.findOne({ where: { id } });
    if (!property) {
      throw new NotFoundException(`Property with ID "${id}" not found`);
    }

    const qb = this.propertyRepository
      .createQueryBuilder('property')
      .leftJoin('property.host', 'host')
      .addSelect(['host.id', 'host.name'])
      .leftJoinAndSelect('property.amenities', 'amenity')
      .where('property.id != :id', { id })
      .orderBy('property.createdAt', 'DESC')
      .take(limit);

    return qb.getMany();
  }

  async create(createPropertyDto: CreatePropertyDto, hostId: string): Promise<Property> {
    const { amenityIds, ...propertyData } = createPropertyDto;

    const property = this.propertyRepository.create({
      ...propertyData,
      hostId,
    });

    if (amenityIds && amenityIds.length > 0) {
      const amenities = await this.amenityRepository.findByIds(amenityIds);
      property.amenities = amenities;
    }

    const saved = await this.propertyRepository.save(property);
    this.logger.log(`Property "${saved.title}" created by host ${hostId}`);
    return this.findOne(saved.id);
  }

  async update(
    id: string,
    updatePropertyDto: UpdatePropertyDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Property> {
    const property = await this.propertyRepository.findOne({ where: { id } });

    if (!property) {
      throw new NotFoundException(`Property with ID "${id}" not found`);
    }

    if (property.hostId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own properties');
    }

    const { amenityIds, ...updateData } = updatePropertyDto;

    Object.assign(property, updateData);

    if (amenityIds !== undefined) {
      const amenities = await this.amenityRepository.findByIds(amenityIds);
      property.amenities = amenities;
    }

    await this.propertyRepository.save(property);
    return this.findOne(id);
  }

  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    const property = await this.propertyRepository.findOne({ where: { id } });

    if (!property) {
      throw new NotFoundException(`Property with ID "${id}" not found`);
    }

    if (property.hostId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only delete your own properties');
    }

    await this.propertyRepository.remove(property);
    this.logger.log(`Property "${id}" removed by user ${userId}`);
  }

  async addRoom(propertyId: string, createRoomDto: CreateRoomDto, userId: string, userRole: UserRole): Promise<Room> {
    const property = await this.propertyRepository.findOne({ where: { id: propertyId } });

    if (!property) {
      throw new NotFoundException(`Property with ID "${propertyId}" not found`);
    }

    if (property.hostId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only add rooms to your own properties');
    }

    const room = this.roomRepository.create({
      ...createRoomDto,
      propertyId,
    });

    return this.roomRepository.save(room);
  }

  async findMyProperties(hostId: string): Promise<Property[]> {
    return this.propertyRepository.find({
      where: { hostId },
      relations: ['amenities', 'rooms'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Upload and update the cover image for a property
   */
  async uploadCoverImage(
    propertyId: string,
    file: Express.Multer.File,
    userId: string,
    userRole: UserRole,
  ): Promise<Property> {
    const property = await this.propertyRepository.findOne({ where: { id: propertyId } });

    if (!property) {
      throw new NotFoundException(`Property with ID "${propertyId}" not found`);
    }

    if (property.hostId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own properties');
    }

    // Upload to Cloudinary under property folder
    const uploadResult = await this.cloudinaryService.uploadImage(
      file,
      `engida/properties/${propertyId}/cover`,
    );

    // If there was an existing cover image from Cloudinary, optionally cleanup
    if (property.coverImage) {
      const oldPublicId = this.cloudinaryService.extractPublicId(property.coverImage);
      if (oldPublicId) {
        this.cloudinaryService.deleteImage(oldPublicId).catch((err) => {
          this.logger.warn(`Failed to clean up old cover image ${oldPublicId}: ${err.message}`);
        });
      }
    }

    property.coverImage = uploadResult.secureUrl;
    await this.propertyRepository.save(property);
    this.logger.log(`Updated cover image for property "${propertyId}"`);

    return this.findOne(propertyId);
  }

  /**
   * Upload multiple images to property gallery
   */
  async uploadGalleryImages(
    propertyId: string,
    files: Express.Multer.File[],
    userId: string,
    userRole: UserRole,
  ): Promise<Property> {
    const property = await this.propertyRepository.findOne({ where: { id: propertyId } });

    if (!property) {
      throw new NotFoundException(`Property with ID "${propertyId}" not found`);
    }

    if (property.hostId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own properties');
    }

    const uploadResults = await this.cloudinaryService.uploadImages(
      files,
      `engida/properties/${propertyId}/gallery`,
    );

    const newImageUrls = uploadResults.map((result) => result.secureUrl);
    property.images = [...(property.images || []), ...newImageUrls];

    await this.propertyRepository.save(property);
    this.logger.log(`Added ${newImageUrls.length} gallery images to property "${propertyId}"`);

    return this.findOne(propertyId);
  }

  /**
   * Remove a specific image URL from property gallery
   */
  async removeGalleryImage(
    propertyId: string,
    imageUrl: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Property> {
    const property = await this.propertyRepository.findOne({ where: { id: propertyId } });

    if (!property) {
      throw new NotFoundException(`Property with ID "${propertyId}" not found`);
    }

    if (property.hostId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own properties');
    }

    const currentImages = property.images || [];
    const imageIndex = currentImages.indexOf(imageUrl);

    if (imageIndex === -1) {
      throw new NotFoundException('Image URL not found in property gallery');
    }

    // Try deleting from Cloudinary if it's hosted there
    const publicId = this.cloudinaryService.extractPublicId(imageUrl);
    if (publicId) {
      this.cloudinaryService.deleteImage(publicId).catch((err) => {
        this.logger.warn(`Failed to delete gallery image asset ${publicId}: ${err.message}`);
      });
    }

    property.images = currentImages.filter((url) => url !== imageUrl);
    await this.propertyRepository.save(property);
    this.logger.log(`Removed gallery image from property "${propertyId}"`);

    return this.findOne(propertyId);
  }
}

