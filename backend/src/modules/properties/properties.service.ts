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
import { UserRole } from '../../users/entities/user.entity';
import { HostVerificationStatus } from '../../users/entities/host-profile.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { HostService } from '../host/host.service';
import { ListingModerationService } from './listing-moderation.service';

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
    private readonly hostService: HostService,
    private readonly listingModerationService: ListingModerationService,
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
      .leftJoin('property.host', 'host')
      .leftJoin('host.hostProfile', 'hostProfile')
      .leftJoinAndSelect('property.amenities', 'amenities')
      .leftJoinAndSelect('property.rooms', 'rooms')
      .where('property.isAvailable = :available', { available: true });

    // Public discovery must never reveal drafts, paused, archived, or sold listings, listings hidden by admin, or listings from unverified/revoked hosts.
    qb.andWhere('property.status = :publishedStatus', { publishedStatus: ListingStatus.PUBLISHED });
    qb.andWhere('property.adminHidden = false');
    qb.andWhere('hostProfile.verificationStatus = :verifiedStatus', { verifiedStatus: HostVerificationStatus.VERIFIED });

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
    qb.addSelect(['host.id', 'host.name', 'hostProfile.id', 'hostProfile.displayName']);

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
    return this.loadPropertyDetail(id, false);
  }

  async findPublicOne(id: string): Promise<Property> {
    return this.loadPropertyDetail(id, true);
  }

  private async loadPropertyDetail(id: string, publicOnly: boolean): Promise<Property> {
    const qb = this.propertyRepository
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.amenities', 'amenity')
      .leftJoinAndSelect('property.rooms', 'room')
      .leftJoin('property.reviews', 'review')
      .leftJoinAndSelect('property.availabilityBlocks', 'availabilityBlock')
      .leftJoin('review.user', 'reviewUser')
      .leftJoin('property.host', 'host')
      .leftJoin('host.hostProfile', 'hostProfile')
      .addSelect([
        'review.id',
        'review.propertyId',
        'review.rating',
        'review.comment',
        'review.createdAt',
      ])
      .addSelect(['reviewUser.id', 'reviewUser.name'])
      .addSelect(['host.id', 'host.name', 'hostProfile.id', 'hostProfile.displayName', 'hostProfile.bio', 'hostProfile.phone'])
      .where('property.id = :id', { id });

    if (publicOnly) {
      qb.andWhere('property.status = :publishedStatus', { publishedStatus: ListingStatus.PUBLISHED })
        .andWhere('property.isAvailable = :available', { available: true })
        .andWhere('property.adminHidden = false')
        .andWhere('hostProfile.verificationStatus = :verifiedStatus', { verifiedStatus: HostVerificationStatus.VERIFIED });
    }

    const property = await qb.getOne();

    if (!property) {
      throw new NotFoundException(`Property with ID "${id}" not found`);
    }

    return property;
  }

  async findRelated(id: string, limit = 4): Promise<Property[]> {
    const property = await this.loadPropertyDetail(id, true);
    if (!property) {
      throw new NotFoundException(`Property with ID "${id}" not found`);
    }

    const qb = this.propertyRepository
      .createQueryBuilder('property')
      .leftJoin('property.host', 'host')
      .leftJoin('host.hostProfile', 'hostProfile')
      .addSelect(['host.id', 'host.name', 'hostProfile.id', 'hostProfile.displayName'])
      .leftJoinAndSelect('property.amenities', 'amenity')
      .where('property.id != :id', { id })
      .andWhere('property.status = :status', { status: ListingStatus.PUBLISHED })
      .andWhere('property.isAvailable = :available', { available: true })
      .andWhere('property.adminHidden = false')
      .andWhere('hostProfile.verificationStatus = :verifiedStatus', { verifiedStatus: HostVerificationStatus.VERIFIED })
      .orderBy('property.createdAt', 'DESC')
      .take(limit);

    return qb.getMany();
  }

  async create(createPropertyDto: CreatePropertyDto, hostId: string): Promise<Property> {
    const { amenityIds, ...propertyData } = createPropertyDto;

    const property = this.propertyRepository.create({
      ...propertyData,
      hostId,
      status: ListingStatus.DRAFT,
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
  ): Promise<any> {
    return this.hostService.updateListing(id, updatePropertyDto, userId, userRole);
  }

  async remove(id: string, userId: string, userRole: UserRole): Promise<void> {
    const property = await this.propertyRepository.findOne({ where: { id } });

    if (!property) {
      throw new NotFoundException(`Property with ID "${id}" not found`);
    }

    if (property.hostId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only delete your own properties');
    }

    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Hosts cannot permanently delete listings. Archive the listing instead.');
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
   * Upload and update the cover image for a property.
   * For PUBLISHED / PAUSED listings, stages the cover image in moderation review.
   * For DRAFT listings, updates directly.
   */
  async uploadCoverImage(
    propertyId: string,
    file: Express.Multer.File,
    userId: string,
    userRole: UserRole,
  ): Promise<any> {
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

    // Published or paused listings must stage cover image changes in moderation review
    if (property.status === ListingStatus.PUBLISHED || property.status === ListingStatus.PAUSED) {
      const pendingReview = await this.listingModerationService.findPendingReview(propertyId);
      const previousProposedCover = pendingReview?.proposedChanges?.coverImage;

      const moderationResult = await this.listingModerationService.processListingUpdate(
        propertyId,
        { coverImage: uploadResult.secureUrl },
        userId,
        userRole,
      );

      if (previousProposedCover && previousProposedCover !== uploadResult.secureUrl) {
        await this.listingModerationService.cleanOrphanImages(propertyId, [previousProposedCover]);
      }

      this.logger.log(`Staged cover image update for published property "${propertyId}"`);
      const currentProperty = await this.findOne(propertyId);
      return Object.assign(currentProperty, {
        activeReview: moderationResult.review,
        moderationMessage: moderationResult.message,
        isPendingReview: moderationResult.isPendingReview,
      });
    }

    // For DRAFT listings: direct update
    const previousCover = property.coverImage;
    property.coverImage = uploadResult.secureUrl;
    await this.propertyRepository.save(property);
    if (previousCover && previousCover !== property.coverImage && !property.images?.includes(previousCover)) {
      await this.cloudinaryService.deletePropertyImages(propertyId, [previousCover]);
    }
    this.logger.log(`Updated cover image for draft property "${propertyId}"`);

    return this.findOne(propertyId);
  }

  /**
   * Upload multiple gallery images and append to existing property images.
   * For PUBLISHED / PAUSED listings, stages proposed gallery in moderation review.
   * For DRAFT listings, updates directly.
   */
  async uploadGalleryImages(
    propertyId: string,
    files: Express.Multer.File[],
    userId: string,
    userRole: UserRole,
  ): Promise<any> {
    const property = await this.propertyRepository.findOne({ where: { id: propertyId } });

    if (!property) {
      throw new NotFoundException(`Property with ID "${propertyId}" not found`);
    }

    if (property.hostId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own properties');
    }

    // Determine current effective gallery (if published, check pending review proposal first)
    let currentImages = property.images || [];
    let pendingReview = null;
    if (property.status === ListingStatus.PUBLISHED || property.status === ListingStatus.PAUSED) {
      pendingReview = await this.listingModerationService.findPendingReview(propertyId);
      if (Array.isArray(pendingReview?.proposedChanges?.images)) {
        currentImages = pendingReview.proposedChanges.images;
      }
    }

    if (currentImages.length + files.length > 20) {
      throw new BadRequestException('A property can have a maximum of 20 gallery images');
    }

    const uploadResults = await this.cloudinaryService.uploadImages(
      files,
      `engida/properties/${propertyId}`,
    );

    const newUrls = uploadResults.map((res) => res.secureUrl);
    const updatedImages = [...currentImages, ...newUrls];

    // Published or paused listings must stage gallery image changes in moderation review
    if (property.status === ListingStatus.PUBLISHED || property.status === ListingStatus.PAUSED) {
      const moderationResult = await this.listingModerationService.processListingUpdate(
        propertyId,
        { images: updatedImages },
        userId,
        userRole,
      );

      this.logger.log(`Staged ${newUrls.length} gallery images for published property "${propertyId}"`);
      const currentProperty = await this.findOne(propertyId);
      return Object.assign(currentProperty, {
        activeReview: moderationResult.review,
        moderationMessage: moderationResult.message,
        isPendingReview: moderationResult.isPendingReview,
      });
    }

    // For DRAFT listings: direct update
    property.images = updatedImages;
    await this.propertyRepository.save(property);
    this.logger.log(`Added ${newUrls.length} gallery images to draft property "${propertyId}"`);

    return this.findOne(propertyId);
  }

  /**
   * Remove a single image from a property gallery.
   * For PUBLISHED / PAUSED listings, stages gallery image removal in moderation review.
   * For DRAFT listings, removes directly.
   */
  async removeGalleryImage(
    propertyId: string,
    imageUrl: string,
    userId: string,
    userRole: UserRole,
  ): Promise<any> {
    const property = await this.propertyRepository.findOne({ where: { id: propertyId } });

    if (!property) {
      throw new NotFoundException(`Property with ID "${propertyId}" not found`);
    }

    if (property.hostId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own properties');
    }

    // Published or paused listings must stage gallery image removal in moderation review
    if (property.status === ListingStatus.PUBLISHED || property.status === ListingStatus.PAUSED) {
      const pendingReview = await this.listingModerationService.findPendingReview(propertyId);
      const currentImages = Array.isArray(pendingReview?.proposedChanges?.images)
        ? pendingReview.proposedChanges.images
        : (property.images || []);

      if (!currentImages.includes(imageUrl)) {
        throw new NotFoundException('Image URL not found in property gallery');
      }

      const updatedImages = currentImages.filter((url) => url !== imageUrl);
      const moderationResult = await this.listingModerationService.processListingUpdate(
        propertyId,
        { images: updatedImages },
        userId,
        userRole,
      );

      // Clean up only if it was a staged-only image (never delete if retained by live listing or another proposal)
      await this.listingModerationService.cleanOrphanImages(propertyId, [imageUrl]);

      this.logger.log(`Staged removal of gallery image for published property "${propertyId}"`);
      const currentProperty = await this.findOne(propertyId);
      return Object.assign(currentProperty, {
        activeReview: moderationResult.review,
        moderationMessage: moderationResult.message,
        isPendingReview: moderationResult.isPendingReview,
      });
    }

    // For DRAFT listings: direct removal
    const currentImages = property.images || [];
    if (!currentImages.includes(imageUrl)) {
      throw new NotFoundException('Image URL not found in property gallery');
    }

    property.images = currentImages.filter((url) => url !== imageUrl);
    await this.propertyRepository.save(property);
    if (property.coverImage !== imageUrl) {
      await this.cloudinaryService.deletePropertyImages(propertyId, [imageUrl]);
    }
    this.logger.log(`Removed gallery image from draft property "${propertyId}"`);

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
