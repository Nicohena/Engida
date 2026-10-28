import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../admin/rbac/permissions.guard';
import { SuperAdminBypassGuard } from '../admin/rbac/super-admin-bypass.guard';
import { RequirePermissions } from '../admin/rbac/permissions.decorator';
import { Permission } from '../admin/rbac/permissions';
import { AdminCatalogService } from './admin-catalog.service';
import {
  CreateAmenityDto,
  CreateCategoryDto,
  CreateDestinationDto,
  UpdateAmenityDto,
  UpdateCategoryDto,
  UpdateDestinationDto,
} from './dto/admin-catalog.dto';

@Controller('admin/catalog')
@UseGuards(JwtAuthGuard, SuperAdminBypassGuard, PermissionsGuard)
export class AdminCatalogController {
  constructor(private readonly catalogService: AdminCatalogService) {}

  // ==================== CATEGORIES ====================

  @Get('categories')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async listCategories() {
    return this.catalogService.listCategories();
  }

  @Post('categories')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalogService.createCategory(dto);
  }

  @Patch('categories/:id')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.catalogService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async deleteCategory(@Param('id') id: string) {
    return this.catalogService.deleteCategory(id);
  }

  // ==================== DESTINATIONS ====================

  @Get('destinations')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async listDestinations(@Query('featured') featured?: string) {
    const onlyFeatured = featured !== undefined ? featured === 'true' : undefined;
    return this.catalogService.listDestinations(onlyFeatured);
  }

  @Post('destinations')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async createDestination(@Body() dto: CreateDestinationDto) {
    return this.catalogService.createDestination(dto);
  }

  @Patch('destinations/:id')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async updateDestination(
    @Param('id') id: string,
    @Body() dto: UpdateDestinationDto,
  ) {
    return this.catalogService.updateDestination(id, dto);
  }

  @Delete('destinations/:id')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async deleteDestination(@Param('id') id: string) {
    return this.catalogService.deleteDestination(id);
  }

  // ==================== AMENITIES ====================

  @Get('amenities')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async listAmenities() {
    return this.catalogService.listAmenities();
  }

  @Post('amenities')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async createAmenity(@Body() dto: CreateAmenityDto) {
    return this.catalogService.createAmenity(dto);
  }

  @Patch('amenities/:id')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async updateAmenity(
    @Param('id') id: string,
    @Body() dto: UpdateAmenityDto,
  ) {
    return this.catalogService.updateAmenity(id, dto);
  }

  @Delete('amenities/:id')
  @RequirePermissions(Permission.CATALOG_MANAGE)
  async deleteAmenity(@Param('id') id: string) {
    return this.catalogService.deleteAmenity(id);
  }
}
