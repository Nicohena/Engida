import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User, UserRole } from '../../users/entities/user.entity';
import { ListingModerationService } from '../properties/listing-moderation.service';
import {
  QueryReviewsDto,
  RejectReviewDto,
  HideListingDto,
} from '../properties/dto/moderation-review.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly listingModerationService: ListingModerationService,
  ) {}

  /**
   * GET /admin/reviews
   * Unified listing review queue (new listings and important edit proposals).
   */
  @Get('reviews')
  async getReviewQueue(@Query() query: QueryReviewsDto) {
    return this.listingModerationService.getAdminReviewQueue(query);
  }

  /**
   * GET /admin/reviews/:id
   * Detailed view of a submission including proposed changes diff against live values.
   */
  @Get('reviews/:id')
  async getReviewDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.listingModerationService.getAdminReviewDetail(id);
  }

  /**
   * POST /admin/reviews/:id/approve
   * Concurrency-safe approval of initial publish or important edit proposal.
   */
  @Post('reviews/:id/approve')
  async approveReview(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() admin: User,
  ) {
    return this.listingModerationService.approveReview(id, admin);
  }

  /**
   * POST /admin/reviews/:id/reject
   * Concurrency-safe rejection requiring an explanation.
   */
  @Post('reviews/:id/reject')
  async rejectReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectReviewDto,
    @GetUser() admin: User,
  ) {
    return this.listingModerationService.rejectReview(id, dto.rejectionReason, admin);
  }

  /**
   * POST /admin/listings/:id/hide
   * Immediately hides an already-published listing when there is a safety, fraud, or policy concern.
   */
  @Post('listings/:id/hide')
  async hideListing(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: HideListingDto,
    @GetUser() admin: User,
  ) {
    return this.listingModerationService.hideListing(id, dto.reason, admin);
  }

  /**
   * POST /admin/listings/:id/restore
   * Restores a previously hidden listing to public discovery and bookings.
   */
  @Post('listings/:id/restore')
  async restoreListing(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() admin: User,
  ) {
    return this.listingModerationService.restoreListing(id, admin);
  }
}
