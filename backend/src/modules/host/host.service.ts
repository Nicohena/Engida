import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  Property,
  ListingStatus,
  ListingType,
} from '../properties/entities/property.entity';
import { AvailabilityBlock } from '../properties/entities/availability-block.entity';
import { Amenity } from '../amenities/entities/amenity.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { HostProfile } from '../../users/entities/host-profile.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { UpdateHostProfileDto } from './dto/update-host-profile.dto';
import { CreateHostListingDto } from './dto/create-host-listing.dto';
import { UpdateHostListingDto } from './dto/update-host-listing.dto';
import { QueryHostListingsDto, QueryHostReservationsDto } from './dto/query-host.dto';

// ─────────────────────────────────────────────
// Allowed status transitions for listings
// ─────────────────────────────────────────────
const ALLOWED_TRANSITIONS: Record<ListingStatus, ListingStatus[]> = {
  [ListingStatus.DRAFT]: [ListingStatus.PUBLISHED],
  [ListingStatus.PUBLISHED]: [ListingStatus.PAUSED, ListingStatus.ARCHIVED],
  [ListingStatus.PAUSED]: [ListingStatus.PUBLISHED, ListingStatus.ARCHIVED],
  [ListingStatus.ARCHIVED]: [],
  [ListingStatus.SOLD]: [],
};

// Minimum fields required before a listing can be published
function validatePublishReadiness(property: Property): string[] {
  const missing: string[] = [];
  if (!property.title?.trim()) missing.push('title');
  if (!property.description?.trim()) missing.push('description');
  if (!property.propertyType) missing.push('propertyType');
  if (!property.listingType) missing.push('listingType');
  if (!property.city?.trim()) missing.push('city');
  if (!property.address?.trim()) missing.push('address');
  if (!property.coverImage) missing.push('coverImage');

  if (property.listingType === ListingType.RENTAL) {
    if (!property.pricePerNight || Number(property.pricePerNight) <= 0) {
      missing.push('pricePerNight (must be > 0 for rental listings)');
    }
  } else if (property.listingType === ListingType.SALE) {
    if (!property.salePrice || Number(property.salePrice) <= 0) {
      missing.push('salePrice (must be > 0 for sale listings)');
    }
  }

  return missing;
}

@Injectable()
export class HostService {
  private readonly logger = new Logger(HostService.name);

  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(AvailabilityBlock)
    private readonly availabilityBlockRepository: Repository<AvailabilityBlock>,
    @InjectRepository(Amenity)
    private readonly amenityRepository: Repository<Amenity>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(HostProfile)
    private readonly hostProfileRepository: Repository<HostProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ─────────────────────────────────────────
  // 1. HOST PROFILE
  // ─────────────────────────────────────────

  /**
   * Get or auto-create the HostProfile for the authenticated user.
   */
  async getOrCreateHostProfile(userId: string): Promise<HostProfile> {
    let profile = await this.hostProfileRepository.findOne({ where: { userId } });
    if (!profile) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');
      profile = this.hostProfileRepository.create({ userId });
      profile = await this.hostProfileRepository.save(profile);
      this.logger.log(`Auto-created HostProfile for user ${userId}`);
    }
    return profile;
  }

  /**
   * Update host profile fields (displayName, bio, phone only).
   * verificationStatus cannot be changed by the host.
   */
  async updateHostProfile(userId: string, dto: UpdateHostProfileDto): Promise<HostProfile> {
    const profile = await this.getOrCreateHostProfile(userId);
    // Only allow safe fields - never assign verificationStatus from user input
    if (dto.displayName !== undefined) profile.displayName = dto.displayName;
    if (dto.bio !== undefined) profile.bio = dto.bio;
    if (dto.phone !== undefined) profile.phone = dto.phone;
    return this.hostProfileRepository.save(profile);
  }

  // ─────────────────────────────────────────
  // 2. MY LISTINGS (paginated, filtered)
  // ─────────────────────────────────────────

  async getMyListings(
    hostId: string,
    query: QueryHostListingsDto,
  ): Promise<{
    data: Partial<Property>[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const qb: SelectQueryBuilder<Property> = this.propertyRepository
      .createQueryBuilder('property')
      .where('property.host_id = :hostId', { hostId })
      .orderBy('property.created_at', 'DESC');

    if (query.listingType) {
      qb.andWhere('property.listing_type = :listingType', { listingType: query.listingType });
    }
    if (query.status) {
      qb.andWhere('property.status = :status', { status: query.status });
    }
    if (query.city) {
      qb.andWhere('LOWER(property.city) = LOWER(:city)', { city: query.city });
    }
    if (query.subCity) {
      qb.andWhere('LOWER(property.sub_city) = LOWER(:subCity)', { subCity: query.subCity });
    }
    if (query.search) {
      qb.andWhere(
        '(LOWER(property.title) LIKE LOWER(:search) OR LOWER(property.description) LIKE LOWER(:search))',
        { search: `%${query.search}%` },
      );
    }

    const [rawData, total] = await qb.skip(skip).take(limit).getManyAndCount();

    // Return only the fields the host needs for their dashboard list
    const data = rawData.map((p) => ({
      id: p.id,
      title: p.title,
      coverImage: p.coverImage,
      listingType: p.listingType,
      status: p.status,
      pricePerNight: p.pricePerNight,
      salePrice: p.salePrice,
      city: p.city,
      subCity: p.subCity,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      isAvailable: p.isAvailable,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─────────────────────────────────────────
  // 3. CREATE LISTING
  // ─────────────────────────────────────────

  async createListing(hostId: string, dto: CreateHostListingDto): Promise<Property> {
    // Validate pricing rules
    this.validateListingPricing(dto.listingType, dto.pricePerNight, dto.salePrice, true);

    const { amenityIds, ...propertyData } = dto;

    const property = this.propertyRepository.create({
      ...propertyData,
      hostId,
      // New listings always start as DRAFT - never expose status in creation DTO
      status: ListingStatus.DRAFT,
    });

    if (amenityIds && amenityIds.length > 0) {
      const amenities = await this.amenityRepository.findByIds(amenityIds);
      property.amenities = amenities;
    }

    const saved = await this.propertyRepository.save(property);
    this.logger.log(`Host ${hostId} created listing "${saved.title}" [DRAFT]`);
    return this.findOwnedListingOrThrow(saved.id, hostId);
  }

  // ─────────────────────────────────────────
  // 4. GET LISTING DETAIL (owner only)
  // ─────────────────────────────────────────

  async getListingDetail(listingId: string, userId: string, userRole: UserRole): Promise<Property> {
    const property = await this.propertyRepository
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.amenities', 'amenity')
      .leftJoinAndSelect('property.rooms', 'room')
      .leftJoinAndSelect('property.availabilityBlocks', 'availabilityBlock')
      .where('property.id = :id', { id: listingId })
      .getOne();

    if (!property) {
      throw new NotFoundException(`Listing with ID "${listingId}" not found`);
    }

    if (property.hostId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have access to this listing');
    }

    return property;
  }

  // ─────────────────────────────────────────
  // 5. UPDATE LISTING (owner only)
  // ─────────────────────────────────────────

  async updateListing(
    listingId: string,
    dto: UpdateHostListingDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Property> {
    const property = await this.propertyRepository.findOne({ where: { id: listingId } });

    if (!property) {
      throw new NotFoundException(`Listing with ID "${listingId}" not found`);
    }
    if (property.hostId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own listings');
    }

    // listingType cannot be changed after creation
    const { amenityIds, ...updateData } = dto;
    Object.assign(property, updateData);

    if (amenityIds !== undefined) {
      const amenities = await this.amenityRepository.findByIds(amenityIds);
      property.amenities = amenities;
    }

    await this.propertyRepository.save(property);
    return this.findOwnedListingOrThrow(listingId, userId, userRole);
  }

  // ─────────────────────────────────────────
  // 6. STATUS WORKFLOW
  // ─────────────────────────────────────────

  async publishListing(listingId: string, userId: string, userRole: UserRole): Promise<Property> {
    const property = await this.getAndAuthorize(listingId, userId, userRole);

    this.assertTransition(property.status, ListingStatus.PUBLISHED);

    // Validate readiness before publishing
    const missing = validatePublishReadiness(property);
    if (missing.length > 0) {
      throw new BadRequestException(
        `Cannot publish listing - missing required fields: ${missing.join(', ')}`,
      );
    }

    property.status = ListingStatus.PUBLISHED;
    await this.propertyRepository.save(property);
    this.logger.log(`Listing ${listingId} published by host ${userId}`);
    return property;
  }

  async pauseListing(listingId: string, userId: string, userRole: UserRole): Promise<Property> {
    const property = await this.getAndAuthorize(listingId, userId, userRole);
    this.assertTransition(property.status, ListingStatus.PAUSED);
    property.status = ListingStatus.PAUSED;
    await this.propertyRepository.save(property);
    return property;
  }

  async archiveListing(listingId: string, userId: string, userRole: UserRole): Promise<Property> {
    const property = await this.getAndAuthorize(listingId, userId, userRole);
    this.assertTransition(property.status, ListingStatus.ARCHIVED);
    property.status = ListingStatus.ARCHIVED;
    await this.propertyRepository.save(property);
    return property;
  }

  async markSold(listingId: string, userId: string, userRole: UserRole): Promise<Property> {
    const property = await this.getAndAuthorize(listingId, userId, userRole);

    if (property.listingType !== ListingType.SALE) {
      throw new BadRequestException('Only SALE listings can be marked as sold');
    }
    if (property.status === ListingStatus.SOLD) {
      throw new BadRequestException('Listing is already marked as sold');
    }

    property.status = ListingStatus.SOLD;
    await this.propertyRepository.save(property);
    return property;
  }

  // ─────────────────────────────────────────
  // 7. AVAILABILITY API
  // ─────────────────────────────────────────

  async getAvailability(listingId: string, userId: string, userRole: UserRole): Promise<AvailabilityBlock[]> {
    await this.getAndAuthorize(listingId, userId, userRole);
    return this.availabilityBlockRepository.find({
      where: { propertyId: listingId },
      order: { startDate: 'ASC' },
    });
  }

  async addAvailabilityBlock(
    listingId: string,
    startDate: string,
    endDate: string,
    reason: string | null,
    userId: string,
    userRole: UserRole,
  ): Promise<AvailabilityBlock> {
    const property = await this.getAndAuthorize(listingId, userId, userRole);

    if (property.listingType !== ListingType.RENTAL) {
      throw new BadRequestException(
        'Availability blocks can only be added to RENTAL listings',
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      throw new BadRequestException('End date must be strictly after start date');
    }

    const block = this.availabilityBlockRepository.create({
      propertyId: listingId,
      startDate,
      endDate,
      reason: reason || null,
    });

    return this.availabilityBlockRepository.save(block);
  }

  async removeAvailabilityBlock(
    listingId: string,
    blockId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    await this.getAndAuthorize(listingId, userId, userRole);

    const block = await this.availabilityBlockRepository.findOne({
      where: { id: blockId, propertyId: listingId },
    });

    if (!block) {
      throw new NotFoundException(`Availability block "${blockId}" not found`);
    }

    await this.availabilityBlockRepository.remove(block);
  }

  // ─────────────────────────────────────────
  // 8. HOST RESERVATIONS
  // ─────────────────────────────────────────

  async getHostReservations(
    hostId: string,
    query: QueryHostReservationsDto,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const qb = this.bookingRepository
      .createQueryBuilder('booking')
      .innerJoin('booking.property', 'property')
      .addSelect([
        'property.id',
        'property.title',
        'property.coverImage',
        'property.city',
        'property.listingType',
      ])
      .leftJoin('booking.guest', 'guest')
      .addSelect(['guest.id', 'guest.name', 'guest.email'])
      .where('property.host_id = :hostId', { hostId })
      .orderBy('booking.created_at', 'DESC');

    if (query.status) {
      qb.andWhere('booking.status = :status', { status: query.status });
    }
    if (query.fromDate) {
      qb.andWhere('booking.check_in_date >= :fromDate', { fromDate: query.fromDate });
    }
    if (query.toDate) {
      qb.andWhere('booking.check_out_date <= :toDate', { toDate: query.toDate });
    }

    const [bookings, total] = await qb.skip(skip).take(limit).getManyAndCount();

    // Return safe fields - never expose guest password or sensitive data
    const data = bookings.map((b) => ({
      id: b.id,
      property: {
        id: (b as any).property?.id,
        title: (b as any).property?.title,
        coverImage: (b as any).property?.coverImage,
        city: (b as any).property?.city,
        listingType: (b as any).property?.listingType,
      },
      guest: {
        id: (b as any).guest?.id,
        name: (b as any).guest?.name,
        email: (b as any).guest?.email,
      },
      checkInDate: b.checkInDate,
      checkOutDate: b.checkOutDate,
      totalPrice: b.totalPrice,
      status: b.status,
      createdAt: b.createdAt,
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─────────────────────────────────────────
  // 9. RESERVATION ACTIONS
  // ─────────────────────────────────────────

  async confirmReservation(bookingId: string, hostId: string): Promise<Booking> {
    return this.changeReservationStatus(bookingId, hostId, BookingStatus.CONFIRMED);
  }

  async completeReservation(bookingId: string, hostId: string): Promise<Booking> {
    return this.changeReservationStatus(bookingId, hostId, BookingStatus.COMPLETED);
  }

  async cancelReservation(bookingId: string, hostId: string): Promise<Booking> {
    return this.changeReservationStatus(bookingId, hostId, BookingStatus.CANCELLED);
  }

  private async changeReservationStatus(
    bookingId: string,
    hostId: string,
    newStatus: BookingStatus,
  ): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['property'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking "${bookingId}" not found`);
    }

    // Ownership check: host must own the property
    if ((booking as any).property?.hostId !== hostId) {
      throw new ForbiddenException('You can only manage reservations for your own properties');
    }

    // Validate status transition
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
      [BookingStatus.CONFIRMED]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
      [BookingStatus.CANCELLED]: [],
      [BookingStatus.COMPLETED]: [],
    };

    if (!validTransitions[booking.status]?.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition booking from "${booking.status}" to "${newStatus}"`,
      );
    }

    booking.status = newStatus;
    const saved = await this.bookingRepository.save(booking);
    this.logger.log(`Host ${hostId} changed booking ${bookingId} status to ${newStatus}`);
    return saved;
  }

  // ─────────────────────────────────────────
  // 10. DASHBOARD SUMMARY
  // ─────────────────────────────────────────

  async getDashboardSummary(hostId: string): Promise<Record<string, number>> {
    // Listing counts
    const listingCounts = await this.propertyRepository
      .createQueryBuilder('property')
      .select('property.status', 'status')
      .addSelect('property.listing_type', 'listingType')
      .addSelect('COUNT(*)', 'count')
      .where('property.host_id = :hostId', { hostId })
      .groupBy('property.status')
      .addGroupBy('property.listing_type')
      .getRawMany<{ status: string; listingType: string; count: string }>();

    const totalListings = listingCounts.reduce((sum, r) => sum + parseInt(r.count, 10), 0);
    const publishedListings = listingCounts
      .filter((r) => r.status === ListingStatus.PUBLISHED)
      .reduce((sum, r) => sum + parseInt(r.count, 10), 0);
    const draftListings = listingCounts
      .filter((r) => r.status === ListingStatus.DRAFT)
      .reduce((sum, r) => sum + parseInt(r.count, 10), 0);
    const pausedListings = listingCounts
      .filter((r) => r.status === ListingStatus.PAUSED)
      .reduce((sum, r) => sum + parseInt(r.count, 10), 0);
    const saleListings = listingCounts
      .filter((r) => r.listingType === ListingType.SALE)
      .reduce((sum, r) => sum + parseInt(r.count, 10), 0);
    const rentalListings = listingCounts
      .filter((r) => r.listingType === ListingType.RENTAL)
      .reduce((sum, r) => sum + parseInt(r.count, 10), 0);

    // Reservation counts
    const reservationCounts = await this.bookingRepository
      .createQueryBuilder('booking')
      .innerJoin('booking.property', 'property')
      .select('booking.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('property.host_id = :hostId', { hostId })
      .groupBy('booking.status')
      .getRawMany<{ status: string; count: string }>();

    const pendingReservations = reservationCounts
      .filter((r) => r.status === BookingStatus.PENDING)
      .reduce((sum, r) => sum + parseInt(r.count, 10), 0);
    const confirmedReservations = reservationCounts
      .filter((r) => r.status === BookingStatus.CONFIRMED)
      .reduce((sum, r) => sum + parseInt(r.count, 10), 0);
    const completedReservations = reservationCounts
      .filter((r) => r.status === BookingStatus.COMPLETED)
      .reduce((sum, r) => sum + parseInt(r.count, 10), 0);

    // Upcoming: confirmed bookings with check-in >= today
    const today = new Date().toISOString().split('T')[0];
    const upcomingReservations = await this.bookingRepository
      .createQueryBuilder('booking')
      .innerJoin('booking.property', 'property')
      .where('property.host_id = :hostId', { hostId })
      .andWhere('booking.status = :status', { status: BookingStatus.CONFIRMED })
      .andWhere('booking.check_in_date >= :today', { today })
      .getCount();

    // Booking revenue totals (note: not actual payouts, just booking totals)
    const revenueResult = await this.bookingRepository
      .createQueryBuilder('booking')
      .innerJoin('booking.property', 'property')
      .select('COALESCE(SUM(CAST(booking.total_price AS DECIMAL)), 0)', 'total')
      .where('property.host_id = :hostId', { hostId })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
      })
      .getRawOne<{ total: string }>();

    const totalBookingValue = parseFloat(revenueResult?.total ?? '0');

    return {
      totalListings,
      publishedListings,
      draftListings,
      pausedListings,
      saleListings,
      rentalListings,
      pendingReservations,
      confirmedReservations,
      completedReservations,
      upcomingReservations,
      // Clearly labeled as booking totals, NOT actual paid/settled revenue
      totalBookingValue,
    };
  }

  // ─────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────

  /**
   * Load a property and verify the caller is its owner (or admin).
   */
  private async getAndAuthorize(
    listingId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Property> {
    const property = await this.propertyRepository.findOne({ where: { id: listingId } });
    if (!property) {
      throw new NotFoundException(`Listing with ID "${listingId}" not found`);
    }
    if (property.hostId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to manage this listing');
    }
    return property;
  }

  /**
   * Load listing with full relations, asserting ownership.
   */
  private async findOwnedListingOrThrow(
    listingId: string,
    userId: string,
    userRole: UserRole = UserRole.USER,
  ): Promise<Property> {
    const property = await this.propertyRepository
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.amenities', 'amenity')
      .leftJoinAndSelect('property.rooms', 'room')
      .leftJoinAndSelect('property.availabilityBlocks', 'block')
      .where('property.id = :id', { id: listingId })
      .getOne();

    if (!property) throw new NotFoundException(`Listing "${listingId}" not found`);
    if (property.hostId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied');
    }
    return property;
  }

  /**
   * Enforce a valid status transition.
   */
  private assertTransition(current: ListingStatus, next: ListingStatus): void {
    const allowed = ALLOWED_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Cannot transition listing from "${current}" to "${next}"`,
      );
    }
  }

  /**
   * Enforce pricing rules for rental vs. sale listings.
   */
  private validateListingPricing(
    listingType: ListingType,
    pricePerNight?: number,
    salePrice?: number,
    isCreation = false,
  ): void {
    if (listingType === ListingType.RENTAL) {
      if (isCreation && (pricePerNight === undefined || Number(pricePerNight) <= 0)) {
        // For creation, rental price is strongly encouraged but not hard-blocked (listing starts DRAFT)
        // We allow creation without price so host can fill it in before publishing
      }
      // But sale price should not be set for rentals
    }

    if (listingType === ListingType.SALE) {
      // For sale listings, rental-style availability blocks are not relevant
      // Price validation happens at publish time
    }
  }
}
