import {
  Body,
  Controller,
  Get,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { SuperAdminBypassGuard } from '../rbac/super-admin-bypass.guard';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { Permission } from '../rbac/permissions';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { User } from '../../../users/entities/user.entity';
import { AdminSettingsService } from './admin-settings.service';
import { SettingCategory } from './entities/system-setting.entity';

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, SuperAdminBypassGuard, PermissionsGuard)
export class AdminSettingsController {
  constructor(private readonly settingsService: AdminSettingsService) {}

  @Get()
  @RequirePermissions(Permission.SETTINGS_VIEW)
  async getAllSettings(@Query('category') category?: SettingCategory) {
    return this.settingsService.getAllSettings(category);
  }

  @Patch()
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  async updateSettings(
    @Body() updates: Record<string, any>,
    @GetUser() actor: User,
  ) {
    return this.settingsService.updateSettings(updates, actor);
  }
}

@Controller('settings')
export class PublicSettingsController {
  constructor(private readonly settingsService: AdminSettingsService) {}

  @Get('public')
  async getPublicSettings() {
    return this.settingsService.getPublicSettings();
  }
}
