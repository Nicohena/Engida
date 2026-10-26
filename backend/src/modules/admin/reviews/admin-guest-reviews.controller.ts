import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { User, UserRole } from '../../../users/entities/user.entity';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { Permission } from '../rbac/permissions';
import { AdminGuestReviewsService } from './admin-guest-reviews.service';
import {
  ModerateGuestReviewDto,
  QueryAdminGuestReviewsDto,
} from './dto/admin-guest-reviews.dto';

@Controller('admin/guest-reviews')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ADMIN)
export class AdminGuestReviewsController {
  constructor(private readonly guestReviewsService: AdminGuestReviewsService) {}

  @Get()
  @RequirePermissions(Permission.REVIEWS_VIEW)
  list(@Query() query: QueryAdminGuestReviewsDto) {
    return this.guestReviewsService.list(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.REVIEWS_VIEW)
  getDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.guestReviewsService.getDetail(id);
  }

  @Post(':id/hide')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.REVIEWS_MODERATE)
  hide(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerateGuestReviewDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.guestReviewsService.hide(id, dto.reason, actor, {
      ipAddress,
      userAgent,
    });
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.REVIEWS_MODERATE)
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerateGuestReviewDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.guestReviewsService.restore(id, dto.reason, actor, {
      ipAddress,
      userAgent,
    });
  }
}
