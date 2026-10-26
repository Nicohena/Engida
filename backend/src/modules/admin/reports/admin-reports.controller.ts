import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { AdminReportsService } from './admin-reports.service';
import {
  QueryAdminReportsDto,
  UpdateReportStatusDto,
} from './dto/admin-reports.dto';

@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ADMIN)
export class AdminReportsController {
  constructor(private readonly adminReportsService: AdminReportsService) {}

  @Get()
  @RequirePermissions(Permission.REPORTS_VIEW)
  list(@Query() query: QueryAdminReportsDto) {
    return this.adminReportsService.list(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.REPORTS_VIEW)
  getDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminReportsService.getDetail(id);
  }

  @Patch(':id/status')
  @RequirePermissions(Permission.REPORTS_RESOLVE)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReportStatusDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminReportsService.updateStatus(id, dto, actor, {
      ipAddress,
      userAgent,
    });
  }
}
