import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, In } from 'typeorm';
import {
  Property,
  ListingStatus,
  ListingType,
} from '../properties/entities/property.entity';
import { AvailabilityBlock } from '../properties/entities/availability-block.entity';
import { Room } from '../properties/entities/room.entity';
import { Amenity } from '../amenities/entities/amenity.entity';
import {
  Booking,
  BookingStatus,
  PaymentStatus,
  PaymentMethod,
} from '../bookings/entities/booking.entity';
import { HostProfile, HostVerificationStatus } from '../../users/entities/host-profile.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { ListingReview, ReviewStatus, ReviewSubmissionType } from '../properties/entities/listing-review.entity';
import { ListingModerationService } from '../properties/listing-moderation.service';
import { CreateHostProfileDto } from './dto/create-host-profile.dto';
import { UpdateHostProfileDto } from './dto/update-host-profile.dto';
import { QueryHostVerificationsDto } from './dto/admin-host-verification.dto';
import { CreateHostListingDto } from './dto/create-host-listing.dto';
import { CreateRoomDto } from '../properties/dto/create-room.dto';
import { UpdateHostRoomDto } from './dto/update-host-room.dto';
import { UpdateHostListingDto } from './dto/update-host-listing.dto';
import { QueryHostListingsDto, QueryHostReservationsDto } from './dto/query-host.dto';
import {
  QueryHostEarningsSummaryDto,
  QueryHostTransactionsDto,
} from './dto/query-host-earnings.dto';
import {
  HostEarningsSummaryResponse,
  MonthlyEarningItem,
  HostTransactionItem,
  HostTransactionsResponse,
} from './dto/host-earnings-response.dto';
import { Review } from '../reviews/entities/review.entity';
import { ReviewModerationStatus } from '../reviews/entities/review.entity';
import {
  QueryHostReviewsDto,
  QueryHostReviewsSummaryDto,
} from './dto/query-host-reviews.dto';
import {
  HostReviewItem,
  HostReviewsPage,
  PropertyReviewSummary,
  HostReviewsSummaryResponse,
} from './dto/host-reviews-response.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { AuditService, AuditRequestContext } from '../audit/audit.service';
import { HostReservationResponse, HostReservationsPage } from './dto/host-reservation-response.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { sanitizeListingUpdatePayload } from '../properties/constants/moderation.constants';

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
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
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
    @InjectRepository(ListingReview)
    private readonly reviewRepository: Repository<ListingReview>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly listingModerationService: ListingModerationService,
    private readonly auditService: AuditService,
    @Optional()
    private readonly notificationsService?: NotificationsService,
    @Optional()
    @InjectRepository(Review)
    private readonly guestReviewRepository?: Repository<Review>,
  ) {}

  // ─────────────────────────────────────────
  // 1. HOST PROFILE
  // ─────────────────────────────────────────

  /**
   * Get the HostProfile for the authenticated user.
   */
  async getHostProfile(userId: string): Promise<HostProfile> {
    const profile = await this.hostProfileRepository.findOne({
      where: { userId },
      relations: ['user'],
    });
    if (!profile) {
      throw new NotFoundException('Host profile not found. User is not a host.');
    }

    // If verification status is REJECTED, retrieve explanation from latest notification
    if (profile.verificationStatus === HostVerificationStatus.REJECTED && this.notificationsService) {
      const latestNotification = await this.notificationsService.getLatestNotification(
        userId,
        NotificationType.LISTING_REJECTED,
      );
      if (latestNotification?.metadata?.rejectionReason) {
        (profile as any).rejectionReason = String(latestNotification.metadata.rejectionReason);
      }
    }

    return profile;
  }

  /**
   * Create a HostProfile for an authenticated user (Become a Host)
   */
  async createHostProfile(userId: string, dto: CreateHostProfileDto): Promise<HostProfile> {
    const existing = await this.hostProfileRepository.findOne({ where: { userId } });
    if (existing) {
      throw new ConflictException('User already has a host profile.');
    }

    const newProfile = this.hostProfileRepository.create({
      userId,
      displayName: dto.displayName,
      bio: dto.bio || null,
      phone: dto.phone || null,
      verificationStatus: HostVerificationStatus.UNVERIFIED,
    });

    const saved = await this.hostProfileRepository.save(newProfile);
    this.logger.log(`Host profile created for user ${userId}`);
    return saved;
  }

  /**
   * Update host profile fields (displayName, bio, phone, avatar).
   * verificationStatus cannot be changed by the host.
   */
  async updateHostProfile(userId: string, dto: UpdateHostProfileDto): Promise<HostProfile> {
    const profile = await this.getHostProfile(userId);
    // Only allow safe fields - never assign verificationStatus from user input
    if (profile) {
      if (dto.displayName !== undefined) profile.displayName = dto.displayName;
      if (dto.bio !== undefined) profile.bio = dto.bio;
      if (dto.phone !== undefined) profile.phone = dto.phone;

      // Update user avatar if provided
      if (dto.avatar !== undefined) {
        await this.userRepository.update(userId, { avatar: dto.avatar || null });
      }

      // Payout & Banking
      if (dto.payoutProvider !== undefined) profile.payoutProvider = dto.payoutProvider;
      if (dto.payoutAccountName !== undefined) profile.payoutAccountName = dto.payoutAccountName;
      if (dto.payoutAccountNumber !== undefined) profile.payoutAccountNumber = dto.payoutAccountNumber;
      if (dto.payoutPhone !== undefined) profile.payoutPhone = dto.payoutPhone;
      if (dto.payoutBankBranch !== undefined) profile.payoutBankBranch = dto.payoutBankBranch;
      if (dto.payoutSwiftBic !== undefined) profile.payoutSwiftBic = dto.payoutSwiftBic;
      if (dto.payoutEmail !== undefined) profile.payoutEmail = dto.payoutEmail;
      if (dto.payoutCurrency !== undefined) profile.payoutCurrency = dto.payoutCurrency;

      await this.hostProfileRepository.save(profile);
      return this.getHostProfile(userId);
    }
    throw new NotFoundException('Host profile not found.');
  }

  /**
   * Request identity verification for the host profile.
   * Transitions status from UNVERIFIED or REJECTED to PENDING.
   * Security: Hosts CANNOT set status to VERIFIED or approve themselves.
   */
  async requestVerification(userId: string): Promise<HostProfile> {
    const profile = await this.getHostProfile(userId);
    if (!profile) {
      throw new NotFoundException('Host profile not found.');
    }

    if (profile.verificationStatus === HostVerificationStatus.VERIFIED) {
      throw new BadRequestException('Your host profile is already verified.');
    }

    if (profile.verificationStatus === HostVerificationStatus.PENDING) {
      throw new BadRequestException('Verification request is already pending administrative review.');
    }

    // Require essential identity fields before submitting for verification
    if (!profile.displayName?.trim()) {
      throw new BadRequestException('Please set your host display name before requesting verification.');
    }
    if (!profile.phone?.trim()) {
      throw new BadRequestException('Please provide a valid contact phone number before requesting verification.');
    }

    profile.verificationStatus = HostVerificationStatus.PENDING;
    await this.hostProfileRepository.save(profile);
    this.logger.log(`Host ${userId} requested identity verification (status -> PENDING)`);

    return this.getHostProfile(userId);
  }

  // ─────────────────────────────────────────
  // 1B. ADMIN HOST VERIFICATION WORKFLOW
  // ─────────────────────────────────────────

  /**
   * List host identity verification requests (admin only).
   */
  async getHostVerifications(query?: QueryHostVerificationsDto): Promise<{
    data: HostProfile[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(query?.page || 1, 1);
    const limit = Math.min(query?.limit || 20, 100);
    const skip = (page - 1) * limit;
    const status = query?.status || HostVerificationStatus.PENDING;

    const qb = this.hostProfileRepository
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user')
      .where('profile.verification_status = :status', { status });

    if (query?.search?.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(profile.display_name) LIKE :term OR LOWER(profile.phone) LIKE :term OR LOWER(user.name) LIKE :term OR LOWER(user.email) LIKE :term)',
        { term },
      );
    }

    qb.orderBy('profile.updated_at', 'DESC');

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Admin approves a pending host verification request.
   * Decisions are strictly restricted to profiles in PENDING status.
   */
  async approveHostVerification(
    profileId: string,
    admin: User,
    auditContext?: AuditRequestContext,
  ): Promise<HostProfile> {
    const profile = await this.hostProfileRepository.findOne({
      where: { id: profileId },
      relations: ['user'],
    });

    if (!profile) {
      throw new NotFoundException(`Host profile with ID "${profileId}" not found.`);
    }

    if (profile.verificationStatus !== HostVerificationStatus.PENDING) {
      throw new BadRequestException(
        `Only host profiles in PENDING status can be approved. Current status: ${profile.verificationStatus}`,
      );
    }

    profile.verificationStatus = HostVerificationStatus.VERIFIED;
    const saved = await this.hostProfileRepository.save(profile);
    this.logger.log(`Host verification approved for profile ${profileId} by admin ${admin.id}`);

    await this.auditService.record({
      actor: admin,
      action: 'host.verification.approve',
      entityType: 'host_profile',
      entityId: profile.id,
      before: { verificationStatus: HostVerificationStatus.PENDING },
      after: { verificationStatus: saved.verificationStatus },
      metadata: { userId: profile.userId },
      ipAddress: auditContext?.ipAddress ?? null,
      userAgent: auditContext?.userAgent ?? null,
    });

    if (this.notificationsService) {
      try {
        await this.notificationsService.createNotification({
          userId: profile.userId,
          type: NotificationType.LISTING_APPROVED,
          title: 'Host Verification Approved',
          message:
            'Congratulations! Your host profile identity has been verified by the ENGIDA compliance team. Your published listings now feature the Verified Host trust badge.',
          link: '/host/profile',
          metadata: {
            profileId: profile.id,
            verificationStatus: HostVerificationStatus.VERIFIED,
            reviewedByAdminId: admin.id,
          },
          idempotencyKey: `host-verification-approved-${profile.id}-${Date.now()}`,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Host verification ${profile.id} was approved but the notification failed: ${message}`,
        );
      }
    }

    return saved;
  }

  /**
   * Admin rejects a pending host verification request with required explanation.
   * Decisions are strictly restricted to profiles in PENDING status.
   */
  async rejectHostVerification(
    profileId: string,
    explanation: string,
    admin: User,
    auditContext?: AuditRequestContext,
  ): Promise<HostProfile> {
    const trimmed = explanation?.trim();
    if (!trimmed || trimmed.length < 5) {
      throw new BadRequestException('A valid rejection explanation (at least 5 characters) is required.');
    }
    if (trimmed.length > 500) {
      throw new BadRequestException('Rejection explanation cannot exceed 500 characters.');
    }

    const profile = await this.hostProfileRepository.findOne({
      where: { id: profileId },
      relations: ['user'],
    });

    if (!profile) {
      throw new NotFoundException(`Host profile with ID "${profileId}" not found.`);
    }

    if (profile.verificationStatus !== HostVerificationStatus.PENDING) {
      throw new BadRequestException(
        `Only host profiles in PENDING status can be rejected. Current status: ${profile.verificationStatus}`,
      );
    }

    profile.verificationStatus = HostVerificationStatus.REJECTED;
    const saved = await this.hostProfileRepository.save(profile);
    this.logger.log(
      `Host verification rejected for profile ${profileId} by admin ${admin.id}: "${trimmed}"`,
    );

    await this.auditService.record({
      actor: admin,
      action: 'host.verification.reject',
      entityType: 'host_profile',
      entityId: profile.id,
      before: { verificationStatus: HostVerificationStatus.PENDING },
      after: { verificationStatus: saved.verificationStatus },
      metadata: { userId: profile.userId, reason: trimmed },
      ipAddress: auditContext?.ipAddress ?? null,
      userAgent: auditContext?.userAgent ?? null,
    });

    if (this.notificationsService) {
      try {
        await this.notificationsService.createNotification({
          userId: profile.userId,
          type: NotificationType.LISTING_REJECTED,
          title: 'Host Verification Not Approved',
          message: `Your host verification request was not approved. Feedback: ${trimmed}`,
          link: '/host/profile',
          metadata: {
            profileId: profile.id,
            verificationStatus: HostVerificationStatus.REJECTED,
            rejectionReason: trimmed,
            reviewedByAdminId: admin.id,
          },
          idempotencyKey: `host-verification-rejected-${profile.id}-${Date.now()}`,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Host verification ${profile.id} was rejected but the notification failed: ${message}`,
        );
      }
    }

    (saved as any).rejectionReason = trimmed;
    return saved;
  }

  // ─────────────────────────────────────────
  // 2. MY LISTINGS (paginated, filtered)
  // ─────────────────────────────────────────

  async getMyListings(
    hostId: string,
    query: QueryHostListingsDto,
    userRole: UserRole = UserRole.USER,
  ): Promise<{
    data: Partial<Property>[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    await this.assertHostProfile(hostId, userRole);
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

    const propertyIds = rawData.map((p) => p.id);
    const reviews = propertyIds.length > 0
      ? await this.reviewRepository.find({
          where: { propertyId: In(propertyIds) },
          order: { createdAt: 'DESC' },
        })
      : [];

    const activeMap = new Map<string, ListingReview>();
    const latestRejectedMap = new Map<string, ListingReview>();
    for (const r of reviews) {
      if (r.status === ReviewStatus.PENDING && !activeMap.has(r.propertyId)) {
        activeMap.set(r.propertyId, r);
      }
      if (r.status === ReviewStatus.REJECTED && !latestRejectedMap.has(r.propertyId)) {
        latestRejectedMap.set(r.propertyId, r);
      }
    }

    // Return fields the host needs for their dashboard list including review & moderation status
    const data = rawData.map((p) => {
      const activeReview = activeMap.get(p.id) || null;
      const latestRejected = latestRejectedMap.get(p.id) || null;
      return {
        id: p.id,
        title: p.title,
        coverImage: p.coverImage,
        listingType: p.listingType,
        status: p.status,
        adminHidden: p.adminHidden,
        adminHiddenReason: p.adminHiddenReason,
        hasPendingReview: Boolean(activeReview),
        pendingReviewType: activeReview?.submissionType || null,
        rejectionReason: !activeReview && latestRejected ? latestRejected.rejectionReason : null,
        pricePerNight: p.pricePerNight,
        salePrice: p.salePrice,
        city: p.city,
        subCity: p.subCity,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        isAvailable: p.isAvailable,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─────────────────────────────────────────
  // 3. CREATE LISTING
  // ─────────────────────────────────────────

  async createListing(
    hostId: string,
    dto: CreateHostListingDto,
    userRole: UserRole = UserRole.USER,
  ): Promise<Property> {
    await this.assertHostProfile(hostId, userRole);

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
    await this.assertHostProfile(userId, userRole);
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

    const reviews = await this.reviewRepository.find({
      where: { propertyId: listingId },
      order: { createdAt: 'DESC' },
    });
    const pendingReview = reviews.find((r) => r.status === ReviewStatus.PENDING) || null;
    const latestReview = reviews[0] || null;

    return Object.assign(property, {
      activeReview: pendingReview || latestReview,
      reviewHistory: reviews,
    });
  }

  // ─────────────────────────────────────────
  // 5. UPDATE LISTING (owner only)
  // ─────────────────────────────────────────

  async updateListing(
    listingId: string,
    dto: UpdateHostListingDto,
    userId: string,
    userRole: UserRole,
  ): Promise<any> {
    await this.assertHostProfile(userId, userRole);
    const property = await this.propertyRepository.findOne({
      where: { id: listingId },
      relations: ['amenities'],
    });

    if (!property) {
      throw new NotFoundException(`Listing with ID "${listingId}" not found`);
    }
    if (property.hostId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own listings');
    }

    // Sanitize incoming payload to prevent mass-assignment of protected/server-controlled fields
    const sanitizedDto = sanitizeListingUpdatePayload(dto);

    // For PUBLISHED / PAUSED listings, important edits require moderation review
    if (property.status === ListingStatus.PUBLISHED || property.status === ListingStatus.PAUSED) {
      const result = await this.listingModerationService.processListingUpdate(
        listingId,
        sanitizedDto,
        userId,
        userRole,
      );
      const owned = await this.findOwnedListingOrThrow(listingId, userId, userRole);
      return Object.assign(owned, {
        activeReview: result.review,
        moderationMessage: result.message,
        isPendingReview: result.isPendingReview,
      });
    }

    // For DRAFT listings, updates are directly saved
    const previousImages = new Set([property.coverImage, ...(property.images || [])]
      .filter((url): url is string => Boolean(url)));

    // listingType cannot be changed after creation
    const { amenityIds, ...updateData } = sanitizedDto;
    Object.assign(property, updateData);

    if (amenityIds !== undefined) {
      const amenities = await this.amenityRepository.findByIds(amenityIds);
      property.amenities = amenities;
    }

    await this.propertyRepository.save(property);

    const retainedImages = new Set([property.coverImage, ...(property.images || [])]
      .filter((url): url is string => Boolean(url)));
    const detachedImages = [...previousImages].filter((url) => !retainedImages.has(url));
    if (detachedImages.length > 0) {
      await this.cloudinaryService.deletePropertyImages(listingId, detachedImages);
    }
    return this.findOwnedListingOrThrow(listingId, userId, userRole);
  }

  async addListingRoom(
    listingId: string,
    dto: CreateRoomDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Room> {
    await this.assertHostProfile(userId, userRole);
    const property = await this.getAndAuthorize(listingId, userId, userRole);
    if (property.listingType !== ListingType.RENTAL) {
      throw new BadRequestException('Rooms can only be added to rental listings');
    }

    const roomNumber = dto.roomNumber.trim();
    const existingRoom = await this.roomRepository.findOne({ where: { propertyId: listingId, roomNumber } });
    if (existingRoom) throw new ConflictException('A room with this number already exists for the listing');

    const room = this.roomRepository.create({
      ...dto,
      title: dto.title.trim(),
      roomNumber,
      capacity: dto.capacity ?? 1,
      propertyId: listingId,
      isAvailable: true,
    });
    return this.roomRepository.save(room);
  }

  async updateListingRoom(
    listingId: string,
    roomId: string,
    dto: UpdateHostRoomDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Room> {
    await this.assertHostProfile(userId, userRole);
    await this.getAndAuthorize(listingId, userId, userRole);
    const room = await this.roomRepository.findOne({ where: { id: roomId, propertyId: listingId } });
    if (!room) throw new NotFoundException(`Room "${roomId}" not found`);

    if (dto.roomNumber !== undefined) {
      const roomNumber = dto.roomNumber.trim();
      const duplicate = await this.roomRepository.findOne({ where: { propertyId: listingId, roomNumber } });
      if (duplicate && duplicate.id !== room.id) {
        throw new ConflictException('A room with this number already exists for the listing');
      }
      room.roomNumber = roomNumber;
    }
    if (dto.title !== undefined) room.title = dto.title.trim();
    if (dto.capacity !== undefined) room.capacity = dto.capacity;
    if (dto.pricePerNight !== undefined) room.pricePerNight = dto.pricePerNight;
    if (dto.isAvailable !== undefined) room.isAvailable = dto.isAvailable;
    return this.roomRepository.save(room);
  }

  async removeListingRoom(
    listingId: string,
    roomId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    await this.assertHostProfile(userId, userRole);
    await this.getAndAuthorize(listingId, userId, userRole);
    const room = await this.roomRepository.findOne({ where: { id: roomId, propertyId: listingId } });
    if (!room) throw new NotFoundException(`Room "${roomId}" not found`);

    const bookingCount = await this.bookingRepository.count({ where: { roomId } });
    if (bookingCount > 0) {
      throw new ConflictException('This room has reservation history. Mark it unavailable instead of deleting it.');
    }
    await this.roomRepository.remove(room);
  }

  // ─────────────────────────────────────────
  // 6. STATUS WORKFLOW
  // ─────────────────────────────────────────

  async publishListing(listingId: string, userId: string, userRole: UserRole): Promise<any> {
    const property = await this.getAndAuthorize(listingId, userId, userRole);

    if (property.adminHidden) {
      throw new ForbiddenException(
        `Cannot publish listing while under administrative hold: ${property.adminHiddenReason || 'Contact support'}`,
      );
    }

    // If listing was previously approved and merely paused, unpausing is allowed without new review
    if (property.status === ListingStatus.PAUSED) {
      const hostProfile = await this.hostProfileRepository.findOne({ where: { userId: property.hostId } });
      if (!hostProfile || hostProfile.verificationStatus !== HostVerificationStatus.VERIFIED) {
        throw new BadRequestException(
          `Cannot resume listing "${listingId}": Host verification status is "${
            hostProfile?.verificationStatus || 'UNVERIFIED'
          }". Your host profile must be VERIFIED before listings can be published publicly.`,
        );
      }

      this.assertTransition(property.status, ListingStatus.PUBLISHED);
      property.status = ListingStatus.PUBLISHED;
      await this.propertyRepository.save(property);
      this.logger.log(`Listing ${listingId} unpaused by host ${userId}`);
      return property;
    }

    // For new listings (DRAFT), entering publication requires manual admin review
    return this.submitListingForReview(listingId, userId, userRole);
  }

  async submitListingForReview(
    listingId: string,
    userId: string,
    userRole: UserRole,
    notes?: string,
  ) {
    await this.assertHostProfile(userId, userRole);
    const hostProfile = await this.hostProfileRepository.findOne({ where: { userId } });
    const result = await this.listingModerationService.submitForReview(listingId, userId, userRole, notes);
    if (hostProfile && hostProfile.verificationStatus !== HostVerificationStatus.VERIFIED) {
      result.message = `Listing submitted for moderation review. Note: Your host profile is currently ${hostProfile.verificationStatus}. Your host identity must be verified before the listing can be published publicly.`;
    }
    return result;
  }

  async withdrawListingReview(
    listingId: string,
    userId: string,
    userRole: UserRole,
  ) {
    await this.assertHostProfile(userId, userRole);
    return this.listingModerationService.withdrawReview(listingId, userId, userRole);
  }

  async getListingReviews(
    listingId: string,
    userId: string,
    userRole: UserRole,
  ) {
    await this.assertHostProfile(userId, userRole);
    return this.listingModerationService.getHostListingReviews(listingId, userId, userRole);
  }

  async pauseListing(listingId: string, userId: string, userRole: UserRole): Promise<Property> {
    const property = await this.getAndAuthorize(listingId, userId, userRole);
    if (property.adminHidden) {
      throw new ForbiddenException(
        'Cannot modify the status of a listing that has been temporarily hidden by an administrator',
      );
    }
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
    await this.assertHostProfile(userId, userRole);
    const start = new Date(startDate);
    const end = new Date(endDate);

    const today = new Date().toISOString().slice(0, 10);
    if (startDate.slice(0, 10) < today) {
      throw new BadRequestException('Availability blocks cannot start in the past');
    }
    if (end <= start) {
      throw new BadRequestException('End date must be strictly after start date');
    }

    return this.availabilityBlockRepository.manager.transaction(async (manager) => {
      const propertyRepository = manager.getRepository(Property);
      const blockRepository = manager.getRepository(AvailabilityBlock);
      const bookingRepository = manager.getRepository(Booking);

      const property = await propertyRepository.findOne({
        where: { id: listingId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!property) throw new NotFoundException(`Listing with ID "${listingId}" not found`);
      if (property.hostId !== userId && userRole !== UserRole.ADMIN) {
        throw new ForbiddenException('You do not have permission to manage this listing');
      }
      if (property.listingType !== ListingType.RENTAL) {
        throw new BadRequestException('Availability blocks can only be added to RENTAL listings');
      }

      const overlappingBlock = await blockRepository
        .createQueryBuilder('block')
        .where('block.property_id = :listingId', { listingId })
        .andWhere('(block.start_date < :endDate AND block.end_date > :startDate)', {
          startDate,
          endDate,
        })
        .getCount();
      if (overlappingBlock > 0) {
        throw new ConflictException('These dates overlap an existing availability block');
      }

      const overlappingReservation = await bookingRepository
        .createQueryBuilder('booking')
        .where('booking.property_id = :listingId', { listingId })
        .andWhere('booking.status IN (:...statuses)', {
          statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
        })
        .andWhere('(booking.check_in_date < :endDate AND booking.check_out_date > :startDate)', {
          startDate,
          endDate,
        })
        .getCount();
      if (overlappingReservation > 0) {
        throw new ConflictException(
          'These dates overlap a pending or confirmed reservation and cannot be blocked',
        );
      }

      const block = blockRepository.create({
        propertyId: listingId,
        startDate,
        endDate,
        reason: reason || null,
      });
      return blockRepository.save(block);
    });
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
    userRole: UserRole = UserRole.USER,
  ): Promise<HostReservationsPage> {
    await this.assertHostProfile(hostId, userRole);
    if (query.fromDate && query.toDate && query.toDate < query.fromDate) {
      throw new BadRequestException('Check-out through date must be on or after check-in from date');
    }
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
      .leftJoin('booking.room', 'room')
      .addSelect(['room.id', 'room.title', 'room.roomNumber'])
      .where('property.hostId = :hostId', { hostId })
      .orderBy('booking.createdAt', 'DESC');

    if (query.status) {
      qb.andWhere('booking.status = :status', { status: query.status });
    }
    if (query.propertyId) {
      qb.andWhere('property.id = :propertyId', { propertyId: query.propertyId });
    }
    if (query.fromDate) {
      qb.andWhere('booking.checkInDate >= :fromDate', { fromDate: query.fromDate });
    }
    if (query.toDate) {
      qb.andWhere('booking.checkOutDate <= :toDate', { toDate: query.toDate });
    }

    const [bookings, total] = await qb.skip(skip).take(limit).getManyAndCount();

    // Return safe fields - never expose guest password or sensitive data
    const data: HostReservationResponse[] = bookings.map((booking) => ({
      id: booking.id,
      property: {
        id: booking.property?.id || '',
        title: booking.property?.title || 'Unknown Property',
        coverImage: booking.property?.coverImage || null,
        city: booking.property?.city || '',
        listingType: booking.property?.listingType || ListingType.RENTAL,
      },
      guest: {
        id: booking.guest?.id || '',
        name: booking.guest?.name || 'Guest',
        email: booking.guest?.email || '',
      },
      room: booking.room ? {
        id: booking.room.id,
        title: booking.room.title,
        roomNumber: booking.room.roomNumber,
      } : null,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      guestCount: booking.guestCount,
      totalPrice: Number(booking.totalPrice),
      status: booking.status,
      paymentMethod: booking.paymentMethod,
      paymentStatus: booking.paymentStatus,
      paymentReference: booking.paymentReference,
      paymentCurrency: booking.paymentCurrency,
      paidAt: booking.paidAt,
      createdAt: booking.createdAt,
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
    await this.assertHostProfile(hostId, UserRole.USER);
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['property'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking "${bookingId}" not found`);
    }

    // Ownership check: host must own the property
    if (!booking.property || booking.property.hostId !== hostId) {
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

    if (newStatus === BookingStatus.COMPLETED) {
      const today = new Date().toISOString().slice(0, 10);
      if (booking.checkOutDate > today) {
        throw new BadRequestException('A reservation can only be completed on or after its check-out date');
      }
    }

    const updateResult = await this.bookingRepository.update(
      { id: bookingId, status: booking.status },
      { status: newStatus },
    );
    if (updateResult.affected !== 1) {
      throw new ConflictException('This reservation changed while you were acting. Reload it and try again.');
    }
    booking.status = newStatus;

    if (this.notificationsService) {
      try {
        const propTitle = booking.property?.title || 'your property';
        if (newStatus === BookingStatus.CONFIRMED) {
          await this.notificationsService.createNotification({
            userId: hostId,
            type: NotificationType.BOOKING_CONFIRMED,
            title: 'Reservation Confirmed',
            message: `Reservation #${booking.id.slice(0, 8)} for "${propTitle}" has been confirmed.`,
            link: '/host/reservations',
            metadata: { bookingId: booking.id, propertyId: booking.property?.id },
            idempotencyKey: `booking_${booking.id}_CONFIRMED`,
          });
        } else if (newStatus === BookingStatus.CANCELLED) {
          await this.notificationsService.createNotification({
            userId: hostId,
            type: NotificationType.BOOKING_CANCELLED,
            title: 'Reservation Cancelled',
            message: `Reservation #${booking.id.slice(0, 8)} for "${propTitle}" has been cancelled.`,
            link: '/host/reservations',
            metadata: { bookingId: booking.id, propertyId: booking.property?.id },
            idempotencyKey: `booking_${booking.id}_CANCELLED`,
          });
        } else if (newStatus === BookingStatus.COMPLETED) {
          await this.notificationsService.createNotification({
            userId: hostId,
            type: NotificationType.BOOKING_COMPLETED,
            title: 'Stay Completed',
            message: `Stay for reservation #${booking.id.slice(0, 8)} at "${propTitle}" has concluded.`,
            link: '/host/reservations',
            metadata: { bookingId: booking.id, propertyId: booking.property?.id },
            idempotencyKey: `booking_${booking.id}_COMPLETED`,
          });
        }
      } catch (err: unknown) {
        this.logger.warn(`Failed to dispatch reservation notification: ${err}`);
      }
    }

    this.logger.log(`Host ${hostId} changed booking ${bookingId} status to ${newStatus}`);
    return booking;
  }

  // ─────────────────────────────────────────
  // 10. DASHBOARD SUMMARY
  // ─────────────────────────────────────────

  async getDashboardSummary(
    hostId: string,
    userRole: UserRole = UserRole.USER,
  ): Promise<Record<string, number>> {
    await this.assertHostProfile(hostId, userRole);
    // Listing counts
    const listingCounts = await this.propertyRepository
      .createQueryBuilder('property')
      .select('property.status', 'status')
      .addSelect('property.listingType', 'listingType')
      .addSelect('COUNT(*)', 'count')
      .where('property.hostId = :hostId', { hostId })
      .groupBy('property.status')
      .addGroupBy('property.listingType')
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
      .where('property.hostId = :hostId', { hostId })
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
      .where('property.hostId = :hostId', { hostId })
      .andWhere('booking.status = :status', { status: BookingStatus.CONFIRMED })
      .andWhere('booking.checkInDate >= :today', { today })
      .getCount();

    // Booking revenue totals (note: not actual payouts, just booking totals)
    const revenueResult = await this.bookingRepository
      .createQueryBuilder('booking')
      .innerJoin('booking.property', 'property')
      .select('COALESCE(SUM(CAST(booking.totalPrice AS DECIMAL)), 0)', 'total')
      .where('property.hostId = :hostId', { hostId })
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
  // 11. HOST EARNINGS & FINANCIAL REPORTING
  // ─────────────────────────────────────────

  /**
   * Aggregates real stored financial metrics for properties owned by the authenticated host.
   * Clearly distinguishes gross booking value from confirmed paid funds and on-arrival commitments.
   */
  async getEarningsSummary(
    hostId: string,
    query?: QueryHostEarningsSummaryDto,
    userRole: UserRole = UserRole.USER,
  ): Promise<HostEarningsSummaryResponse> {
    await this.assertHostProfile(hostId, userRole);

    const qb = this.bookingRepository
      .createQueryBuilder('booking')
      .innerJoin('booking.property', 'property')
      .where('property.hostId = :hostId', { hostId });

    if (query?.propertyId) {
      qb.andWhere('property.id = :propertyId', { propertyId: query.propertyId });
    }
    if (query?.startDate) {
      qb.andWhere('booking.createdAt >= :startDate', { startDate: new Date(query.startDate) });
    }
    if (query?.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('booking.createdAt <= :endDate', { endDate: end });
    }

    const bookings = await qb
      .select([
        'booking.id',
        'booking.totalPrice',
        'booking.status',
        'booking.paymentStatus',
        'booking.paymentMethod',
        'booking.paymentCurrency',
        'booking.createdAt',
      ])
      .orderBy('booking.createdAt', 'DESC')
      .getMany();

    const currency = bookings[0]?.paymentCurrency || 'ETB';

    let totalBookingsCount = bookings.length;
    let totalBookingValue = 0;
    let confirmedPaidAmount = 0;
    let confirmedPaidCount = 0;
    let onArrivalAmount = 0;
    let onArrivalCount = 0;
    let pendingPaymentAmount = 0;
    let pendingPaymentCount = 0;
    let refundedAmount = 0;
    let refundedCount = 0;
    let cancelledCount = 0;
    let cancelledBookingValue = 0;

    const monthlyMap = new Map<string, MonthlyEarningItem>();
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    for (const b of bookings) {
      const price = Number(b.totalPrice) || 0;
      const d = new Date(b.createdAt);
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;

      if (!monthlyMap.has(yearMonth)) {
        monthlyMap.set(yearMonth, {
          yearMonth,
          label,
          bookingCount: 0,
          totalBookingValue: 0,
          confirmedPaidAmount: 0,
          confirmedPaidCount: 0,
          onArrivalAmount: 0,
          onArrivalCount: 0,
          refundedAmount: 0,
          refundedCount: 0,
          cancelledCount: 0,
        });
      }
      const monthItem = monthlyMap.get(yearMonth)!;
      monthItem.bookingCount += 1;

      // Active or completed reservations contribute to gross booking value
      if (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.COMPLETED) {
        totalBookingValue += price;
        monthItem.totalBookingValue += price;
      }

      if (b.paymentStatus === PaymentStatus.PAID) {
        confirmedPaidAmount += price;
        confirmedPaidCount += 1;
        monthItem.confirmedPaidAmount += price;
        monthItem.confirmedPaidCount += 1;
      } else if (b.paymentStatus === PaymentStatus.ON_ARRIVAL) {
        onArrivalAmount += price;
        onArrivalCount += 1;
        monthItem.onArrivalAmount += price;
        monthItem.onArrivalCount += 1;
      } else if (b.paymentStatus === PaymentStatus.PENDING) {
        pendingPaymentAmount += price;
        pendingPaymentCount += 1;
      } else if (b.paymentStatus === PaymentStatus.REFUNDED) {
        refundedAmount += price;
        refundedCount += 1;
        monthItem.refundedAmount += price;
        monthItem.refundedCount += 1;
      }

      if (b.status === BookingStatus.CANCELLED) {
        cancelledCount += 1;
        cancelledBookingValue += price;
        monthItem.cancelledCount += 1;
      }
    }

    const monthlyBreakdown = Array.from(monthlyMap.values()).sort((a, b) =>
      b.yearMonth.localeCompare(a.yearMonth),
    );

    return {
      currency,
      totalBookingsCount,
      totalBookingValue: Math.round(totalBookingValue * 100) / 100,
      confirmedPaidAmount: Math.round(confirmedPaidAmount * 100) / 100,
      confirmedPaidCount,
      onArrivalAmount: Math.round(onArrivalAmount * 100) / 100,
      onArrivalCount,
      pendingPaymentAmount: Math.round(pendingPaymentAmount * 100) / 100,
      pendingPaymentCount,
      refundedAmount: Math.round(refundedAmount * 100) / 100,
      refundedCount,
      cancelledCount,
      cancelledBookingValue: Math.round(cancelledBookingValue * 100) / 100,
      monthlyBreakdown,
    };
  }

  /**
   * Retrieves paginated financial transaction records for host properties.
   */
  async getFinancialTransactions(
    hostId: string,
    query?: QueryHostTransactionsDto,
    userRole: UserRole = UserRole.USER,
  ): Promise<HostTransactionsResponse> {
    await this.assertHostProfile(hostId, userRole);

    const page = Math.max(query?.page || 1, 1);
    const limit = Math.min(query?.limit || 20, 100);
    const skip = (page - 1) * limit;

    const qb = this.bookingRepository
      .createQueryBuilder('booking')
      .innerJoin('booking.property', 'property')
      .addSelect(['property.id', 'property.title', 'property.city'])
      .leftJoin('booking.guest', 'guest')
      .addSelect(['guest.id', 'guest.name', 'guest.email'])
      .where('property.hostId = :hostId', { hostId })
      .orderBy('booking.createdAt', 'DESC');

    if (query?.propertyId) {
      qb.andWhere('property.id = :propertyId', { propertyId: query.propertyId });
    }
    if (query?.paymentStatus) {
      qb.andWhere('booking.paymentStatus = :paymentStatus', { paymentStatus: query.paymentStatus });
    }
    if (query?.paymentMethod) {
      qb.andWhere('booking.paymentMethod = :paymentMethod', { paymentMethod: query.paymentMethod });
    }
    if (query?.bookingStatus) {
      qb.andWhere('booking.status = :bookingStatus', { bookingStatus: query.bookingStatus });
    }
    if (query?.startDate) {
      qb.andWhere('booking.createdAt >= :startDate', { startDate: new Date(query.startDate) });
    }
    if (query?.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('booking.createdAt <= :endDate', { endDate: end });
    }

    const [bookings, total] = await qb.skip(skip).take(limit).getManyAndCount();

    const data: HostTransactionItem[] = bookings.map((b) => ({
      id: b.id,
      propertyId: b.property?.id || '',
      propertyTitle: b.property?.title || 'Unknown Property',
      propertyCity: b.property?.city || '',
      guestName: b.guest?.name || 'Guest',
      guestEmail: b.guest?.email || '',
      checkInDate: b.checkInDate,
      checkOutDate: b.checkOutDate,
      guestCount: b.guestCount,
      totalPrice: Number(b.totalPrice) || 0,
      paymentCurrency: b.paymentCurrency || 'ETB',
      bookingStatus: b.status,
      paymentStatus: b.paymentStatus,
      paymentMethod: b.paymentMethod,
      paymentReference: b.paymentReference || null,
      paidAt: b.paidAt,
      createdAt: b.createdAt,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      currency: bookings[0]?.paymentCurrency || 'ETB',
    };
  }

  // ─────────────────────────────────────────
  // 12. HOST REVIEWS & REPUTATION MANAGEMENT
  // ─────────────────────────────────────────

  /**
   * Retrieves paginated reviews for properties owned by the authenticated host.
   * Host cannot create, update, or delete guest reviews (read-only).
   * Sensitive guest information is omitted (only safe display name is returned).
   */
  async getHostReviews(
    hostId: string,
    query?: QueryHostReviewsDto,
    userRole: UserRole = UserRole.USER,
  ): Promise<HostReviewsPage> {
    await this.assertHostProfile(hostId, userRole);

    if (!this.guestReviewRepository) {
      return { data: [], total: 0, page: 1, limit: 20, totalPages: 1 };
    }

    const page = Math.max(query?.page || 1, 1);
    const limit = Math.min(query?.limit || 20, 100);
    const skip = (page - 1) * limit;

    const qb = this.guestReviewRepository
      .createQueryBuilder('review')
      .innerJoin('review.property', 'property')
      .addSelect(['property.id', 'property.title', 'property.city'])
      .leftJoin('review.user', 'guest')
      .addSelect(['guest.id', 'guest.name'])
      .where('property.hostId = :hostId', { hostId })
      .andWhere('review.moderationStatus = :moderationStatus', {
        moderationStatus: ReviewModerationStatus.VISIBLE,
      })
      .orderBy('review.createdAt', 'DESC');

    if (query?.propertyId) {
      qb.andWhere('property.id = :propertyId', { propertyId: query.propertyId });
    }
    if (query?.rating) {
      qb.andWhere('review.rating = :rating', { rating: query.rating });
    }

    const [reviews, total] = await qb.skip(skip).take(limit).getManyAndCount();

    const data: HostReviewItem[] = reviews.map((r) => ({
      id: r.id,
      propertyId: r.property?.id || r.propertyId,
      propertyTitle: r.property?.title || 'Listing',
      propertyCity: r.property?.city || '',
      guestName: r.user?.name || 'Verified Guest',
      rating: r.rating,
      comment: r.comment || null,
      createdAt: r.createdAt,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Calculates overall host rating statistics, distribution breakdown,
   * and per-property review summaries for properties owned by the host.
   */
  async getHostReviewsSummary(
    hostId: string,
    query?: QueryHostReviewsSummaryDto,
    userRole: UserRole = UserRole.USER,
  ): Promise<HostReviewsSummaryResponse> {
    await this.assertHostProfile(hostId, userRole);

    const emptyDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (!this.guestReviewRepository) {
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: emptyDistribution,
        propertySummaries: [],
      };
    }

    // Load host properties to build property summaries
    const hostProperties = await this.propertyRepository.find({
      where: query?.propertyId ? { id: query.propertyId, hostId } : { hostId },
      select: ['id', 'title', 'city', 'coverImage'],
    });

    const qb = this.guestReviewRepository
      .createQueryBuilder('review')
      .innerJoin('review.property', 'property')
      .addSelect(['property.id', 'property.title', 'property.city', 'property.coverImage'])
      .where('property.hostId = :hostId', { hostId })
      .andWhere('review.moderationStatus = :moderationStatus', {
        moderationStatus: ReviewModerationStatus.VISIBLE,
      });

    if (query?.propertyId) {
      qb.andWhere('property.id = :propertyId', { propertyId: query.propertyId });
    }

    const reviews = await qb.getMany();

    const totalReviews = reviews.length;
    const ratingSum = reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
    const averageRating = totalReviews > 0 ? Math.round((ratingSum / totalReviews) * 10) / 10 : 0;

    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const r of reviews) {
      const rating = Number(r.rating);
      if (rating >= 1 && rating <= 5) {
        ratingDistribution[rating as 1 | 2 | 3 | 4 | 5] += 1;
      }
    }

    // Group ratings by propertyId
    const ratingsByProperty = new Map<string, number[]>();
    for (const r of reviews) {
      const pid = r.property?.id || r.propertyId;
      if (!ratingsByProperty.has(pid)) {
        ratingsByProperty.set(pid, []);
      }
      ratingsByProperty.get(pid)!.push(Number(r.rating) || 0);
    }

    const propertySummaries: PropertyReviewSummary[] = hostProperties.map((p) => {
      const propRatings = ratingsByProperty.get(p.id) || [];
      const count = propRatings.length;
      const avg = count > 0 ? Math.round((propRatings.reduce((sum, x) => sum + x, 0) / count) * 10) / 10 : 0;
      return {
        propertyId: p.id,
        propertyTitle: p.title || 'Listing',
        propertyCity: p.city || '',
        coverImage: p.coverImage || null,
        reviewCount: count,
        averageRating: avg,
      };
    }).sort((a, b) => b.reviewCount - a.reviewCount);

    return {
      totalReviews,
      averageRating,
      ratingDistribution,
      propertySummaries,
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
    await this.assertHostProfile(userId, userRole);
    const property = await this.propertyRepository.findOne({ where: { id: listingId } });
    if (!property) {
      throw new NotFoundException(`Listing with ID "${listingId}" not found`);
    }
    if (property.hostId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to manage this listing');
    }
    return property;
  }

  private async assertHostProfile(userId: string, userRole: UserRole): Promise<void> {
    if (userRole === UserRole.ADMIN) return;
    const profile = await this.hostProfileRepository.findOne({ where: { userId } });
    if (!profile) {
      throw new ForbiddenException('Create a host profile before accessing host workflows');
    }
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
