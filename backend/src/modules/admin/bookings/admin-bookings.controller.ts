import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Ip,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { User, UserRole } from '../../../users/entities/user.entity';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { Permission } from '../rbac/permissions';
import { AdminBookingsService } from './admin-bookings.service';
import {
  AdminBookingStatusDto,
  CreateAdminAvailabilityBlockDto,
  DecideCancellationDto,
  QueryAdminBookingsDto,
  QueryAvailabilityDto,
  RecordCancellationDto,
} from './dto/admin-bookings.dto';

@Controller('admin/bookings')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ADMIN)
export class AdminBookingsController {
  constructor(private readonly adminBookingsService: AdminBookingsService) {}

  @Get()
  @RequirePermissions(Permission.BOOKINGS_VIEW)
  list(@Query() query: QueryAdminBookingsDto) {
    return this.adminBookingsService.list(query);
  }

  @Get('export.csv')
  @RequirePermissions(Permission.BOOKINGS_VIEW)
  async export(
    @Query() query: QueryAdminBookingsDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<string> {
    const csv = await this.adminBookingsService.exportCsv(query, actor, {
      ipAddress,
      userAgent,
    });
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="engida-bookings-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    return csv;
  }

  @Get('availability')
  @RequirePermissions(Permission.BOOKINGS_VIEW)
  availability(@Query() query: QueryAvailabilityDto) {
    return this.adminBookingsService.availability(query);
  }

  @Delete('availability-blocks/:blockId')
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  removeBlock(
    @Param('blockId', ParseUUIDPipe) blockId: string,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminBookingsService.removeBlock(blockId, actor, {
      ipAddress,
      userAgent,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.BOOKINGS_VIEW)
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminBookingsService.detail(id);
  }

  @Get(':id/cancellation-preview')
  @RequirePermissions(Permission.BOOKINGS_VIEW)
  cancellationPreview(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminBookingsService.previewCancellation(id);
  }

  @Post(':id/status')
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminBookingStatusDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminBookingsService.updateStatus(id, dto, actor, {
      ipAddress,
      userAgent,
    });
  }

  @Post(':id/cancellation-requests')
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  recordCancellation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordCancellationDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminBookingsService.recordCancellation(id, dto, actor, {
      ipAddress,
      userAgent,
    });
  }

  @Post(':id/cancellation-requests/:requestId/approve')
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  approveCancellation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: DecideCancellationDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminBookingsService.decideCancellation(
      id,
      requestId,
      'approve',
      dto,
      actor,
      { ipAddress, userAgent },
    );
  }

  @Post(':id/cancellation-requests/:requestId/reject')
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  rejectCancellation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @Body() dto: DecideCancellationDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminBookingsService.decideCancellation(
      id,
      requestId,
      'reject',
      dto,
      actor,
      { ipAddress, userAgent },
    );
  }

  @Post(':id/availability-blocks')
  @RequirePermissions(Permission.BOOKINGS_MANAGE)
  createBlock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAdminAvailabilityBlockDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminBookingsService.createBlock(id, dto, actor, {
      ipAddress,
      userAgent,
    });
  }
}
