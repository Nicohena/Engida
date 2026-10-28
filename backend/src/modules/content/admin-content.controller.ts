import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../admin/rbac/permissions.guard';
import { SuperAdminBypassGuard } from '../admin/rbac/super-admin-bypass.guard';
import { RequirePermissions } from '../admin/rbac/permissions.decorator';
import { Permission } from '../admin/rbac/permissions';
import { AdminContentService } from './admin-content.service';
import { FaqCategory } from './entities/faq-item.entity';
import {
  CreateContentBlockDto,
  CreateFaqDto,
  UpdateContentBlockDto,
  UpdateFaqDto,
} from './dto/admin-content.dto';

@Controller('admin/content')
@UseGuards(JwtAuthGuard, SuperAdminBypassGuard, PermissionsGuard)
export class AdminContentController {
  constructor(private readonly contentService: AdminContentService) {}

  // ==================== FAQS ====================

  @Get('faqs')
  @RequirePermissions(Permission.CONTENT_MANAGE)
  async listFaqs(
    @Query('category') category?: FaqCategory,
    @Query('published') published?: string,
  ) {
    const onlyPublished = published !== undefined ? published === 'true' : undefined;
    return this.contentService.listFaqs(category, onlyPublished);
  }

  @Post('faqs')
  @RequirePermissions(Permission.CONTENT_MANAGE)
  async createFaq(@Body() dto: CreateFaqDto) {
    return this.contentService.createFaq(dto);
  }

  @Patch('faqs/:id')
  @RequirePermissions(Permission.CONTENT_MANAGE)
  async updateFaq(
    @Param('id') id: string,
    @Body() dto: UpdateFaqDto,
  ) {
    return this.contentService.updateFaq(id, dto);
  }

  @Delete('faqs/:id')
  @RequirePermissions(Permission.CONTENT_MANAGE)
  async deleteFaq(@Param('id') id: string) {
    return this.contentService.deleteFaq(id);
  }

  // ==================== CONTENT BLOCKS ====================

  @Get('blocks')
  @RequirePermissions(Permission.CONTENT_MANAGE)
  async listContentBlocks(@Query('published') published?: string) {
    const onlyPublished = published !== undefined ? published === 'true' : undefined;
    return this.contentService.listContentBlocks(onlyPublished);
  }

  @Get('blocks/:slug')
  @RequirePermissions(Permission.CONTENT_MANAGE)
  async getContentBlockBySlug(@Param('slug') slug: string) {
    return this.contentService.getContentBlockBySlug(slug);
  }

  @Post('blocks')
  @RequirePermissions(Permission.CONTENT_MANAGE)
  async createContentBlock(
    @Body() dto: CreateContentBlockDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.id;
    return this.contentService.createContentBlock(dto, adminId);
  }

  @Patch('blocks/:id')
  @RequirePermissions(Permission.CONTENT_MANAGE)
  async updateContentBlock(
    @Param('id') id: string,
    @Body() dto: UpdateContentBlockDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.id;
    return this.contentService.updateContentBlock(id, dto, adminId);
  }

  @Delete('blocks/:id')
  @RequirePermissions(Permission.CONTENT_MANAGE)
  async deleteContentBlock(@Param('id') id: string) {
    return this.contentService.deleteContentBlock(id);
  }
}
