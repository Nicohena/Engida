import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { AdminUsersService } from './admin-users.service';
import {
  CreateAdminUserDto,
  QueryAdminUsersDto,
  UpdateAdminRoleDto,
  UpdateUserStatusDto,
} from './dto/admin-users.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ADMIN)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get('users')
  @RequirePermissions(Permission.USERS_VIEW)
  list(@Query() query: QueryAdminUsersDto) {
    return this.adminUsersService.list(query);
  }

  @Post('admins')
  @RequirePermissions(Permission.ADMINS_MANAGE)
  createAdmin(
    @Body() dto: CreateAdminUserDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminUsersService.createAdmin(dto, actor, { ipAddress, userAgent });
  }

  @Get('users/:id')
  @RequirePermissions(Permission.USERS_VIEW)
  getDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminUsersService.getDetail(id);
  }

  @Patch('users/:id/status')
  @RequirePermissions(Permission.USERS_MANAGE)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminUsersService.updateStatus(id, dto, actor, { ipAddress, userAgent });
  }

  @Patch('users/:id/admin-role')
  @RequirePermissions(Permission.ADMINS_MANAGE)
  updateAdminRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminRoleDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminUsersService.updateAdminRole(id, dto, actor, {
      ipAddress,
      userAgent,
    });
  }
}
