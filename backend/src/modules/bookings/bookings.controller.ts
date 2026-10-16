import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  /**
   * Create a new booking (authenticated users)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createBookingDto: CreateBookingDto,
    @GetUser() user: User,
  ) {
    return this.bookingsService.create(createBookingDto, user.id);
  }

  /**
   * Get the current user's bookings as a tenant
   */
  @Get('my-bookings')
  async getMyBookings(@GetUser() user: User) {
    return this.bookingsService.findMyBookings(user.id);
  }

  /**
   * Get incoming reservations for properties the current user hosts
   */
  @Get('host-reservations')
  async getHostReservations(@GetUser() user: User) {
    return this.bookingsService.findHostReservations(user.id);
  }

  /**
   * Get a single booking by ID
   */
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookingsService.findOne(id);
  }

  /**
   * Update booking status (confirm, cancel, complete)
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateBookingStatusDto,
    @GetUser() user: User,
  ) {
    return this.bookingsService.updateStatus(id, updateDto, user.id, user.role);
  }
}
