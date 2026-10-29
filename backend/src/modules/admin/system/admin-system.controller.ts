import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { SuperAdminBypassGuard } from '../rbac/super-admin-bypass.guard';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { Permission } from '../rbac/permissions';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { User } from '../../../users/entities/user.entity';
import { AdminSystemService } from './admin-system.service';

@Controller('admin/system')
@UseGuards(JwtAuthGuard, SuperAdminBypassGuard, PermissionsGuard)
export class AdminSystemController {
  constructor(private readonly systemService: AdminSystemService) {}

  @Get('health')
  @RequirePermissions(Permission.SYSTEM_VIEW)
  async getHealthOverview() {
    return this.systemService.getHealthOverview();
  }

  @Post('jobs/:jobName/run')
  @RequirePermissions(Permission.SYSTEM_MANAGE)
  async triggerJob(
    @Param('jobName') jobName: string,
    @GetUser() actor: User,
  ) {
    return this.systemService.triggerJob(jobName, actor);
  }
}
