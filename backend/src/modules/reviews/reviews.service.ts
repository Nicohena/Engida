import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
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
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
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

    const reviews = await this.reviewRepository.find({
      where: { propertyId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    // Sanitize user data
    reviews.forEach((review) => {
      if (review.user) {
        delete (review.user as any).passwordHash;
      }
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? Math.round(
            (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10,
          ) / 10
        : 0;

    return { reviews, averageRating, totalReviews };
  }

  async create(
    propertyId: string,
    createReviewDto: CreateReviewDto,
    userId: string,
  ): Promise<Review> {
    // Validate property exists
    const property = await this.propertyRepository.findOne({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException(`Property with ID "${propertyId}" not found`);
    }

    // Hosts cannot review their own property
    if (property.hostId === userId) {
      throw new BadRequestException('You cannot review your own property');
    }

    // Check that the user has a completed booking at this property
    const completedBooking = await this.bookingRepository.findOne({
      where: {
        propertyId,
        guestId: userId,
        status: BookingStatus.COMPLETED,
      },
    });

    if (!completedBooking) {
      throw new BadRequestException(
        'You can only review a property after completing a stay',
      );
    }

    // Check for existing review by same user on same property
    const existingReview = await this.reviewRepository.findOne({
      where: { propertyId, userId },
    });

    if (existingReview) {
      throw new BadRequestException(
        'You have already reviewed this property',
      );
    }

    const review = this.reviewRepository.create({
      propertyId,
      userId,
      rating: createReviewDto.rating,
      comment: createReviewDto.comment || null,
    });

    const saved = await this.reviewRepository.save(review);
    this.logger.log(
      `Review created by user ${userId} for property ${propertyId} (rating: ${createReviewDto.rating})`,
    );

    return this.reviewRepository.findOne({
      where: { id: saved.id },
      relations: ['user'],
    }) as Promise<Review>;
  }
}
