import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';

@Controller('properties/:propertyId/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * Public: Get all reviews for a property with average rating
   */
  @Get()
  async findByProperty(@Param('propertyId', ParseUUIDPipe) propertyId: string) {
    return this.reviewsService.findByProperty(propertyId);
  }

  /**
   * Protected: Submit a review for a property (must have a completed booking)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Body() createReviewDto: CreateReviewDto,
    @GetUser() user: User,
  ) {
    return this.reviewsService.create(propertyId, createReviewDto, user.id);
  }
}
