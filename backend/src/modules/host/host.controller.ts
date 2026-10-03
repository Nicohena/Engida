import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { HostService } from './host.service';
import { CreateHostProfileDto } from './dto/create-host-profile.dto';
import { UpdateHostProfileDto } from './dto/update-host-profile.dto';
import { CreateHostListingDto } from './dto/create-host-listing.dto';
import { UpdateHostListingDto } from './dto/update-host-listing.dto';
import { QueryHostListingsDto, QueryHostReservationsDto } from './dto/query-host.dto';
import { CreateAvailabilityBlockDto } from './dto/create-host-availability-block.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';

/**
 * Host management API - all endpoints require authentication.
 * Ownership is enforced at the service layer for every mutation.
 */
@Controller('host')
@UseGuards(JwtAuthGuard)
export class HostController {
  constructor(private readonly hostService: HostService) {}

  // ─────────────────────────────────────────
  // 1. HOST PROFILE
  // ─────────────────────────────────────────

  /**
   * GET /host/profile
   * Get the authenticated user's host profile (auto-creates if absent).
   */
  @Get('profile')
  async getProfile(@GetUser() user: User) {
    return this.hostService.getHostProfile(user.id);
  }

  /**
   * POST /host/profile
   * Create a host profile for the authenticated user (Become a Host).
   */
  @Post('profile')
  @HttpCode(HttpStatus.CREATED)
  async createProfile(
    @GetUser() user: User,
    @Body() dto: CreateHostProfileDto,
  ) {
    return this.hostService.createHostProfile(user.id, dto);
  }

  /**
   * PUT /host/profile
   * Update displayName, bio, or phone. verificationStatus is read-only for hosts.
   */
  @Put('profile')
  async updateProfile(
    @GetUser() user: User,
    @Body() dto: UpdateHostProfileDto,
  ) {
    return this.hostService.updateHostProfile(user.id, dto);
  }

  // ─────────────────────────────────────────
  // 2. MY LISTINGS
  // ─────────────────────────────────────────

  /**
   * GET /host/listings
   * Returns paginated list of listings owned by the authenticated host.
   */
  @Get('listings')
  async getMyListings(
    @GetUser() user: User,
    @Query() query: QueryHostListingsDto,
  ) {
    return this.hostService.getMyListings(user.id, query);
  }

  // ─────────────────────────────────────────
  // 3. CREATE LISTING
  // ─────────────────────────────────────────

  /**
   * POST /host/listings
   * Creates a new listing starting in DRAFT status.
   */
  @Post('listings')
  @HttpCode(HttpStatus.CREATED)
  async createListing(
    @GetUser() user: User,
    @Body() dto: CreateHostListingDto,
  ) {
    return this.hostService.createListing(user.id, dto);
  }

  // ─────────────────────────────────────────
  // 4. LISTING DETAIL (owner only)
  // ─────────────────────────────────────────

  /**
   * GET /host/listings/:id
   * Full detail view for the owner. Another host cannot access this.
   */
  @Get('listings/:id')
  async getListingDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.hostService.getListingDetail(id, user.id, user.role);
  }

  // ─────────────────────────────────────────
  // 5. UPDATE LISTING
  // ─────────────────────────────────────────

  /**
   * PUT /host/listings/:id
   * Update listing content. Status changes use dedicated endpoints below.
   */
  @Put('listings/:id')
  async updateListing(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
    @Body() dto: UpdateHostListingDto,
  ) {
    return this.hostService.updateListing(id, dto, user.id, user.role);
  }

  // ─────────────────────────────────────────
  // 6. STATUS WORKFLOW
  // ─────────────────────────────────────────

  /**
   * PATCH /host/listings/:id/publish
   * DRAFT → PUBLISHED. Validates minimum required fields first.
   */
  @Patch('listings/:id/publish')
  async publishListing(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.hostService.publishListing(id, user.id, user.role);
  }

  /**
   * PATCH /host/listings/:id/pause
   * PUBLISHED → PAUSED.
   */
  @Patch('listings/:id/pause')
  async pauseListing(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.hostService.pauseListing(id, user.id, user.role);
  }

  /**
   * PATCH /host/listings/:id/archive
   * PUBLISHED/PAUSED → ARCHIVED.
   */
  @Patch('listings/:id/archive')
  async archiveListing(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.hostService.archiveListing(id, user.id, user.role);
  }

  /**
   * PATCH /host/listings/:id/mark-sold
   * For SALE listings only. Marks the listing as SOLD.
   */
  @Patch('listings/:id/mark-sold')
  async markSold(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.hostService.markSold(id, user.id, user.role);
  }

  // ─────────────────────────────────────────
  // 7. AVAILABILITY
  // ─────────────────────────────────────────

  /**
   * GET /host/listings/:id/availability
   */
  @Get('listings/:id/availability')
  async getAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.hostService.getAvailability(id, user.id, user.role);
  }

  /**
   * POST /host/listings/:id/availability
   * Only for RENTAL listings.
   */
  @Post('listings/:id/availability')
  @HttpCode(HttpStatus.CREATED)
  async addAvailabilityBlock(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
    @Body() dto: CreateAvailabilityBlockDto,
  ) {
    return this.hostService.addAvailabilityBlock(
      id,
      dto.startDate,
      dto.endDate,
      dto.reason || null,
      user.id,
      user.role,
    );
  }

  /**
   * DELETE /host/listings/:id/availability/:blockId
   */
  @Delete('listings/:id/availability/:blockId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAvailabilityBlock(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('blockId', ParseUUIDPipe) blockId: string,
    @GetUser() user: User,
  ) {
    return this.hostService.removeAvailabilityBlock(id, blockId, user.id, user.role);
  }

  // ─────────────────────────────────────────
  // 8. RESERVATIONS
  // ─────────────────────────────────────────

  /**
   * GET /host/reservations
   * Returns bookings for properties owned by the authenticated host.
   */
  @Get('reservations')
  async getHostReservations(
    @GetUser() user: User,
    @Query() query: QueryHostReservationsDto,
  ) {
    return this.hostService.getHostReservations(user.id, query);
  }

  // ─────────────────────────────────────────
  // 9. RESERVATION ACTIONS
  // ─────────────────────────────────────────

  /**
   * PATCH /host/reservations/:id/confirm
   */
  @Patch('reservations/:id/confirm')
  async confirmReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.hostService.confirmReservation(id, user.id);
  }

  /**
   * PATCH /host/reservations/:id/complete
   */
  @Patch('reservations/:id/complete')
  async completeReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.hostService.completeReservation(id, user.id);
  }

  /**
   * PATCH /host/reservations/:id/cancel
   */
  @Patch('reservations/:id/cancel')
  async cancelReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.hostService.cancelReservation(id, user.id);
  }

  // ─────────────────────────────────────────
  // 10. DASHBOARD
  // ─────────────────────────────────────────

  /**
   * GET /host/dashboard
   * Returns lightweight summary metrics for the host's dashboard.
   */
  @Get('dashboard')
  async getDashboard(@GetUser() user: User) {
    return this.hostService.getDashboardSummary(user.id);
  }
}
