import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { ReviewModerationStatus } from './entities/review.entity';
import { Property } from '../properties/entities/property.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
  ) {}

  async findByProperty(propertyId: string): Promise<{
    reviews: Review[];
    averageRating: number;
    totalReviews: number;
  }> {
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException(`Property with ID "${propertyId}" not found`);
    }

    const reviews = await this.reviewRepository
      .createQueryBuilder('review')
      .select([
        'review.id',
        'review.propertyId',
        'review.rating',
        'review.comment',
        'review.createdAt',
      ])
      .leftJoin('review.user', 'user')
      .addSelect(['user.id', 'user.name'])
      .where('review.property_id = :propertyId', { propertyId })
      .andWhere('review.moderationStatus = :moderationStatus', {
        moderationStatus: ReviewModerationStatus.VISIBLE,
      })
      .orderBy('review.created_at', 'DESC')
      .getMany();

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? Math.round(
            (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10,
          ) / 10
        : 0;

    return { reviews, averageRating, totalReviews };
  }

  async hasReviewed(propertyId: string, userId: string): Promise<{ hasReviewed: boolean }> {
    const property = await this.propertyRepository.findOne({ where: { id: propertyId }, select: ['id'] });
    if (!property) throw new NotFoundException(`Property with ID "${propertyId}" not found`);
    const existing = await this.reviewRepository.findOne({ where: { propertyId, userId }, select: ['id'] });
    return { hasReviewed: Boolean(existing) };
  }

  async create(
    propertyId: string,
    createReviewDto: CreateReviewDto,
    userId: string,
  ): Promise<Review> {
    try {
      const saved = await this.reviewRepository.manager.transaction(async (manager) => {
        const propertyRepository = manager.getRepository(Property);
        const reviewRepository = manager.getRepository(Review);
        const bookingRepository = manager.getRepository(Booking);

        // Serialize reviews for this property; the unique index is the final concurrency guard.
        const property = await propertyRepository.findOne({
          where: { id: propertyId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!property) {
          throw new NotFoundException(`Property with ID "${propertyId}" not found`);
        }
        if (property.hostId === userId) {
          throw new BadRequestException('You cannot review your own property');
        }

        const completedBooking = await bookingRepository.findOne({
          where: {
            propertyId,
            guestId: userId,
            status: BookingStatus.COMPLETED,
            checkOutDate: LessThanOrEqual(new Date().toISOString().slice(0, 10)),
          },
        });
        if (!completedBooking) {
          throw new BadRequestException('You can only review a property after completing a stay');
        }

        const existingReview = await reviewRepository.findOne({ where: { propertyId, userId } });
        if (existingReview) {
          throw new ConflictException('You have already reviewed this property');
        }

        const review = reviewRepository.create({
          propertyId,
          userId,
          rating: createReviewDto.rating,
          comment: createReviewDto.comment || null,
        });
        return reviewRepository.save(review);
      });

      this.logger.log(
        `Review created by user ${userId} for property ${propertyId} (rating: ${createReviewDto.rating})`,
      );

      const createdReview = await this.reviewRepository
        .createQueryBuilder('review')
        .select([
          'review.id',
          'review.propertyId',
          'review.rating',
          'review.comment',
          'review.createdAt',
        ])
        .leftJoin('review.user', 'user')
        .addSelect(['user.id', 'user.name'])
        .where('review.id = :id', { id: saved.id })
        .getOne();
      if (!createdReview) throw new NotFoundException('The review was saved but could not be loaded');
      return createdReview;
    } catch (error: unknown) {
      const databaseError = error as { driverError?: { code?: string; constraint?: string } };
      if (databaseError?.driverError?.code === '23505' && databaseError.driverError.constraint === 'idx_reviews_property_user_unique') {
        throw new ConflictException('You have already reviewed this property');
      }
      throw error;
    }
  }
}
