import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { Property, ListingStatus } from './entities/property.entity';
import {
  ListingReview,
  ReviewStatus,
  ReviewSubmissionType,
} from './entities/listing-review.entity';
import { Amenity } from '../amenities/entities/amenity.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import {
  classifyListingChanges,
  validatePublishReadiness,
} from './constants/moderation.constants';
import { UpdateHostListingDto } from '../host/dto/update-host-listing.dto';
import { QueryReviewsDto } from './dto/moderation-review.dto';

@Injectable()
export class ListingModerationService {
  private readonly logger = new Logger(ListingModerationService.name);

  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(ListingReview)
    private readonly reviewRepository: Repository<ListingReview>,
    @InjectRepository(Amenity)
    private readonly amenityRepository: Repository<Amenity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Submits a listing for manual admin review.
   * Runs automated completeness & validity checks before queuing.
   */
  async submitForReview(
    propertyId: string,
    hostId: string,
    userRole: UserRole,
    notes?: string,
  ): Promise<{ message: string; review: ListingReview; property: Property }> {
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
      relations: ['amenities'],
    });

    if (!property) {
      throw new NotFoundException(`Listing with ID "${propertyId}" not found`);
    }

    if (property.hostId !== hostId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to submit this listing for review');
    }

    if (property.adminHidden) {
      throw new ForbiddenException(
        `This listing is temporarily hidden by an administrator (${property.adminHiddenReason || 'Administrative hold'}). Contact support to resolve.`,
      );
    }

    // Check if an existing review is already pending
    const existingPending = await this.reviewRepository.findOne({
      where: { propertyId, status: ReviewStatus.PENDING },
    });

    if (existingPending) {
      throw new ConflictException('A review submission is already pending for this listing');
    }

    // Automated completeness checks
    const missing = validatePublishReadiness(property);
    if (missing.length > 0) {
      throw new BadRequestException(
        `Cannot submit listing for review - missing required fields: ${missing.join(', ')}`,
      );
    }

    const submissionType =
      property.status === ListingStatus.DRAFT
        ? ReviewSubmissionType.INITIAL_PUBLISH
        : ReviewSubmissionType.IMPORTANT_EDIT;

    const review = this.reviewRepository.create({
      propertyId,
      submissionType,
      status: ReviewStatus.PENDING,
      submittedByHostId: hostId,
      proposedChanges: notes ? { notes } : null,
      submittedAt: new Date(),
    });

    const savedReview = await this.reviewRepository.save(review);
    this.logger.log(
      `Listing ${propertyId} submitted for review by host ${hostId} [${submissionType}]`,
    );

    return {
      message: 'Listing submitted for admin review successfully.',
      review: savedReview,
      property,
    };
  }

  /**
   * Handles host listing updates.
   * If listing is DRAFT: applies all edits directly.
   * If listing is PUBLISHED: separates minor vs. important changes.
   * - Minor edits: applied directly to live listing.
   * - Important edits: preserved live public listing unchanged; queues an IMPORTANT_EDIT proposal.
   */
  async processListingUpdate(
    propertyId: string,
    dto: UpdateHostListingDto,
    hostId: string,
    userRole: UserRole,
  ): Promise<{
    property: Property;
    review: ListingReview | null;
    isPendingReview: boolean;
    message: string;
  }> {
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
      relations: ['amenities'],
    });

    if (!property) {
      throw new NotFoundException(`Listing with ID "${propertyId}" not found`);
    }

    if (property.hostId !== hostId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only update your own listings');
    }

    const { amenityIds, ...updateData } = dto;

    // 1. DRAFT Listings: Host may edit all fields freely without creating an edit review proposal
    if (property.status === ListingStatus.DRAFT) {
      Object.assign(property, updateData);

      if (amenityIds !== undefined) {
        const amenities = await this.amenityRepository.findByIds(amenityIds);
        property.amenities = amenities;
      }

      const saved = await this.propertyRepository.save(property);
      return {
        property: saved,
        review: null,
        isPendingReview: false,
        message: 'Draft listing updated successfully.',
      };
    }

    // 2. PUBLISHED or PAUSED Listings: Classify into important vs minor edits
    const classification = classifyListingChanges(property, {
      ...updateData,
      ...(amenityIds !== undefined ? { amenityIds } : {}),
    });

    // If NO important changes: apply minor changes directly
    if (!classification.hasImportantChanges) {
      if (classification.hasMinorChanges) {
        const { parkingSpaces, isAvailable } = updateData;
        if (parkingSpaces !== undefined) property.parkingSpaces = parkingSpaces;
        if (isAvailable !== undefined) property.isAvailable = isAvailable;

        if (amenityIds !== undefined) {
          const amenities = await this.amenityRepository.findByIds(amenityIds);
          property.amenities = amenities;
        }

        const saved = await this.propertyRepository.save(property);
        return {
          property: saved,
          review: null,
          isPendingReview: false,
          message: 'Minor updates saved directly to the listing.',
        };
      }

      return {
        property,
        review: null,
        isPendingReview: false,
        message: 'No changes detected.',
      };
    }

    // 3. IMPORTANT changes proposed on an approved/published listing:
    // Approved public version remains UNCHANGED. Create or update an IMPORTANT_EDIT proposal.
    const existingPending = await this.reviewRepository.findOne({
      where: { propertyId, status: ReviewStatus.PENDING },
    });

    let review: ListingReview;
    if (existingPending) {
      // Merge updates into the active pending proposal
      existingPending.proposedChanges = {
        ...(existingPending.proposedChanges || {}),
        ...classification.rawChanges,
      };
      existingPending.submittedAt = new Date();
      review = await this.reviewRepository.save(existingPending);
    } else {
      review = this.reviewRepository.create({
        propertyId,
        submissionType: ReviewSubmissionType.IMPORTANT_EDIT,
        status: ReviewStatus.PENDING,
        submittedByHostId: hostId,
        proposedChanges: classification.rawChanges,
        submittedAt: new Date(),
      });
      review = await this.reviewRepository.save(review);
    }

    this.logger.log(
      `Important edit proposal created for published listing ${propertyId} by host ${hostId}`,
    );

    return {
      property, // Unchanged approved public version
      review,
      isPendingReview: true,
      message:
        'Important changes submitted for review. The public listing remains online and unchanged until approved.',
    };
  }

  /**
   * Host withdraws an active pending review.
   * History is preserved; approved public version remains live and unchanged.
   */
  async withdrawReview(
    propertyId: string,
    hostId: string,
    userRole: UserRole,
  ): Promise<{ message: string; review: ListingReview }> {
    const property = await this.propertyRepository.findOne({ where: { id: propertyId } });
    if (!property) {
      throw new NotFoundException(`Listing with ID "${propertyId}" not found`);
    }

    if (property.hostId !== hostId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only withdraw reviews for your own listings');
    }

    const pendingReview = await this.reviewRepository.findOne({
      where: { propertyId, status: ReviewStatus.PENDING },
    });

    if (!pendingReview) {
      throw new NotFoundException('No pending review proposal found for this listing');
    }

    pendingReview.status = ReviewStatus.WITHDRAWN;
    const saved = await this.reviewRepository.save(pendingReview);
    this.logger.log(`Review ${saved.id} withdrawn by host ${hostId}`);

    return {
      message: 'Pending review proposal withdrawn successfully.',
      review: saved,
    };
  }

  /**
   * Retrieves review history and active pending review for a host.
   */
  async getHostListingReviews(
    propertyId: string,
    hostId: string,
    userRole: UserRole,
  ): Promise<{
    activeReview: ListingReview | null;
    history: ListingReview[];
    property: Property;
  }> {
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
      relations: ['amenities'],
    });

    if (!property) {
      throw new NotFoundException(`Listing with ID "${propertyId}" not found`);
    }

    if (property.hostId !== hostId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied');
    }

    const reviews = await this.reviewRepository.find({
      where: { propertyId },
      order: { createdAt: 'DESC' },
      relations: ['reviewedByAdmin'],
    });

    const activeReview = reviews.find((r) => r.status === ReviewStatus.PENDING) || null;

    return {
      activeReview,
      history: reviews,
      property,
    };
  }

  /**
   * Admin unified review queue with pagination and filters.
   */
  async getAdminReviewQueue(query: QueryReviewsDto): Promise<{
    data: (ListingReview & { currentProperty?: Property })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(query.page || 1, 1);
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const qb: SelectQueryBuilder<ListingReview> = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.property', 'property')
      .leftJoinAndSelect('review.submittedByHost', 'host')
      .leftJoinAndSelect('review.reviewedByAdmin', 'admin')
      .orderBy('review.submitted_at', 'ASC');

    if (query.status) {
      qb.andWhere('review.status = :status', { status: query.status });
    }

    if (query.submissionType) {
      qb.andWhere('review.submission_type = :submissionType', {
        submissionType: query.submissionType,
      });
    }

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin inspection of a review with comparison diff.
   */
  async getAdminReviewDetail(reviewId: string): Promise<{
    review: ListingReview;
    property: Property;
    diff: Record<string, { current: any; proposed: any }> | null;
  }> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: ['property', 'property.amenities', 'submittedByHost', 'reviewedByAdmin'],
    });

    if (!review) {
      throw new NotFoundException(`Review with ID "${reviewId}" not found`);
    }

    const diff: Record<string, { current: any; proposed: any }> = {};
    if (review.proposedChanges && review.property) {
      for (const [key, proposedVal] of Object.entries(review.proposedChanges)) {
        if (key === 'amenityIds') {
          const currentIds = (review.property.amenities || []).map((a) => a.id);
          diff[key] = { current: currentIds, proposed: proposedVal };
        } else {
          diff[key] = { current: (review.property as any)[key], proposed: proposedVal };
        }
      }
    }

    return {
      review,
      property: review.property,
      diff: Object.keys(diff).length > 0 ? diff : null,
    };
  }

  /**
   * Approves a listing review submission using a database transaction with locking.
   * Concurrency-safe: prevents competing or repeated admin decisions.
   */
  async approveReview(
    reviewId: string,
    adminUser: User,
  ): Promise<{ message: string; review: ListingReview; property: Property }> {
    return this.dataSource.transaction(async (manager) => {
      const reviewRepo = manager.getRepository(ListingReview);
      const propertyRepo = manager.getRepository(Property);
      const amenityRepo = manager.getRepository(Amenity);

      // Pessimistic write lock on review to ensure only one admin can decide
      const review = await reviewRepo.findOne({
        where: { id: reviewId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!review) {
        throw new NotFoundException(`Review with ID "${reviewId}" not found`);
      }

      if (review.status !== ReviewStatus.PENDING) {
        throw new ConflictException(
          `Review has already been decided with status "${review.status}"`,
        );
      }

      // Lock the property row
      const property = await propertyRepo.findOne({
        where: { id: review.propertyId },
        relations: ['amenities'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!property) {
        throw new NotFoundException(`Property with ID "${review.propertyId}" not found`);
      }

      if (review.submissionType === ReviewSubmissionType.INITIAL_PUBLISH) {
        property.status = ListingStatus.PUBLISHED;
        property.adminHidden = false;
        property.adminHiddenReason = null;
        await propertyRepo.save(property);
      } else if (review.submissionType === ReviewSubmissionType.IMPORTANT_EDIT) {
        // Apply proposed edits to the live property
        if (review.proposedChanges) {
          const { amenityIds, ...directChanges } = review.proposedChanges;
          Object.assign(property, directChanges);

          if (amenityIds !== undefined && Array.isArray(amenityIds)) {
            const amenities = await amenityRepo.findByIds(amenityIds);
            property.amenities = amenities;
          }

          await propertyRepo.save(property);
        }
      }

      review.status = ReviewStatus.APPROVED;
      review.reviewedByAdminId = adminUser.id;
      review.reviewedAt = new Date();
      review.rejectionReason = null;
      const savedReview = await reviewRepo.save(review);

      this.logger.log(
        `Review ${reviewId} approved by admin ${adminUser.id} for property ${property.id}`,
      );

      return {
        message: 'Review approved successfully. Listing is now updated and published.',
        review: savedReview,
        property,
      };
    });
  }

  /**
   * Rejects a listing review submission with mandatory explanation.
   * Concurrency-safe: database transaction with pessimistic locking.
   * Preserves approved public version; stores rejection reason privately for host.
   */
  async rejectReview(
    reviewId: string,
    rejectionReason: string,
    adminUser: User,
  ): Promise<{ message: string; review: ListingReview }> {
    if (!rejectionReason || !rejectionReason.trim() || rejectionReason.trim().length < 5) {
      throw new BadRequestException(
        'A meaningful rejection explanation is required (min 5 characters)',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const reviewRepo = manager.getRepository(ListingReview);

      const review = await reviewRepo.findOne({
        where: { id: reviewId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!review) {
        throw new NotFoundException(`Review with ID "${reviewId}" not found`);
      }

      if (review.status !== ReviewStatus.PENDING) {
        throw new ConflictException(
          `Review has already been decided with status "${review.status}"`,
        );
      }

      review.status = ReviewStatus.REJECTED;
      review.rejectionReason = rejectionReason.trim();
      review.reviewedByAdminId = adminUser.id;
      review.reviewedAt = new Date();
      const savedReview = await reviewRepo.save(review);

      this.logger.log(
        `Review ${reviewId} rejected by admin ${adminUser.id}. Reason: ${rejectionReason.trim()}`,
      );

      return {
        message: 'Review proposal rejected with explanation.',
        review: savedReview,
      };
    });
  }

  /**
   * Immediately hides an already-published listing when there is a safety, fraud, or policy concern.
   * Requires a mandatory explanation.
   */
  async hideListing(
    propertyId: string,
    reason: string,
    adminUser: User,
  ): Promise<{ message: string; property: Property }> {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('A reason is required to temporarily hide a listing');
    }

    const property = await this.propertyRepository.findOne({ where: { id: propertyId } });
    if (!property) {
      throw new NotFoundException(`Listing with ID "${propertyId}" not found`);
    }

    property.adminHidden = true;
    property.adminHiddenReason = reason.trim();
    property.adminHiddenAt = new Date();
    property.adminHiddenById = adminUser.id;

    const saved = await this.propertyRepository.save(property);
    this.logger.warn(
      `Listing ${propertyId} temporarily hidden by admin ${adminUser.id}. Reason: ${reason.trim()}`,
    );

    return {
      message: 'Listing has been temporarily hidden from public discovery and bookings.',
      property: saved,
    };
  }

  /**
   * Restores a previously hidden listing to public discovery.
   */
  async restoreListing(
    propertyId: string,
    adminUser: User,
  ): Promise<{ message: string; property: Property }> {
    const property = await this.propertyRepository.findOne({ where: { id: propertyId } });
    if (!property) {
      throw new NotFoundException(`Listing with ID "${propertyId}" not found`);
    }

    property.adminHidden = false;
    property.adminHiddenReason = null;
    property.adminHiddenAt = null;
    property.adminHiddenById = null;

    const saved = await this.propertyRepository.save(property);
    this.logger.log(`Listing ${propertyId} restored by admin ${adminUser.id}`);

    return {
      message: 'Listing has been restored to public visibility and is now bookable.',
      property: saved,
    };
  }
}
