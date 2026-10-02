import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Property, ListingStatus } from './entities/property.entity';
import { Room } from './entities/room.entity';
import { Amenity } from '../amenities/entities/amenity.entity';
import { AvailabilityBlock } from './entities/availability-block.entity';
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
    @InjectRepository(AvailabilityBlock)
    private readonly availabilityBlockRepository: Repository<AvailabilityBlock>,
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

    // Status filter - default to PUBLISHED for public searches
    if (query.status) {
      qb.andWhere('property.status = :status', { status: query.status });
    } else {
      qb.andWhere('property.status = :publishedStatus', { publishedStatus: ListingStatus.PUBLISHED });
    }

    // Listing type filter (RENTAL or SALE)
    if (query.listingType) {
      qb.andWhere('property.listingType = :listingType', { listingType: query.listingType });
    }

    // Location filters
    if (query.city) {
      qb.andWhere('LOWER(property.city) = LOWER(:city)', { city: query.city });
    }

    if (query.subCity) {
      qb.andWhere('LOWER(property.subCity) = LOWER(:subCity)', { subCity: query.subCity });
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
        '(LOWER(property.title) LIKE LOWER(:search) OR LOWER(property.description) LIKE LOWER(:search) OR LOWER(property.address) LIKE LOWER(:search) OR LOWER(property.subCity) LIKE LOWER(:search))',
        { search: `%${query.search}%` },
      );
    }

    // Sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'DESC';
    const allowedSortFields = ['pricePerNight', 'salePrice', 'createdAt', 'bedrooms', 'maxGuests', 'city', 'subCity'];
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
      .leftJoinAndSelect('property.availabilityBlocks', 'availabilityBlock')
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
      .andWhere('property.status = :status', { status: ListingStatus.PUBLISHED })
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
      relations: ['amenities', 'rooms', 'availabilityBlocks'],
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

    const uploadResult = await this.cloudinaryService.uploadImage(
      file,
      `engida/properties/${propertyId}`,
    );

    property.coverImage = uploadResult.secureUrl;
    await this.propertyRepository.save(property);
    this.logger.log(`Updated cover image for property "${propertyId}"`);

    return this.findOne(propertyId);
  }

  /**
   * Upload multiple gallery images and append to existing property images
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

    const currentImages = property.images || [];
    if (currentImages.length + files.length > 20) {
      throw new BadRequestException('A property can have a maximum of 20 gallery images');
    }

    const uploadResults = await this.cloudinaryService.uploadImages(
      files,
      `engida/properties/${propertyId}`,
    );

    const newUrls = uploadResults.map((res) => res.secureUrl);
    property.images = [...currentImages, ...newUrls];
    await this.propertyRepository.save(property);
    this.logger.log(`Added ${newUrls.length} gallery images to property "${propertyId}"`);

    return this.findOne(propertyId);
  }

  /**
   * Remove a single image from a property gallery
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
    if (!currentImages.includes(imageUrl)) {
      throw new NotFoundException('Image URL not found in property gallery');
    }

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

  /**
   * Add an availability block to a property
   */
  async addAvailabilityBlock(
    propertyId: string,
    startDate: string,
    endDate: string,
    reason: string | null,
    userId: string,
    userRole: UserRole,
  ): Promise<AvailabilityBlock> {
    const property = await this.propertyRepository.findOne({ where: { id: propertyId } });

    if (!property) {
      throw new NotFoundException(`Property with ID "${propertyId}" not found`);
    }

    if (property.hostId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only manage availability for your own properties');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      throw new BadRequestException('End date must be strictly after start date');
    }

    const block = this.availabilityBlockRepository.create({
      propertyId,
      startDate,
      endDate,
      reason,
    });

    return this.availabilityBlockRepository.save(block);
  }

  /**
   * Remove an availability block from a property
   */
  async removeAvailabilityBlock(
    propertyId: string,
    blockId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    const property = await this.propertyRepository.findOne({ where: { id: propertyId } });

    if (!property) {
      throw new NotFoundException(`Property with ID "${propertyId}" not found`);
    }

    if (property.hostId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only manage availability for your own properties');
    }

    const block = await this.availabilityBlockRepository.findOne({
      where: { id: blockId, propertyId },
    });

    if (!block) {
      throw new NotFoundException(`Availability block with ID "${blockId}" not found`);
    }

    await this.availabilityBlockRepository.remove(block);
  }

  /**
   * Get all availability blocks for a property
   */
  async getAvailabilityBlocks(propertyId: string): Promise<AvailabilityBlock[]> {
    const property = await this.propertyRepository.findOne({ where: { id: propertyId } });

    if (!property) {
      throw new NotFoundException(`Property with ID "${propertyId}" not found`);
    }

    return this.availabilityBlockRepository.find({
      where: { propertyId },
      order: { startDate: 'ASC' },
    });
  }
}
