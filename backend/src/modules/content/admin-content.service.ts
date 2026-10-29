import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FaqItem, FaqCategory } from './entities/faq-item.entity';
import { ContentBlock } from './entities/content-block.entity';
import {
  CreateContentBlockDto,
  CreateFaqDto,
  UpdateContentBlockDto,
  UpdateFaqDto,
} from './dto/admin-content.dto';

@Injectable()
export class AdminContentService {
  constructor(
    @InjectRepository(FaqItem)
    private readonly faqRepository: Repository<FaqItem>,
    @InjectRepository(ContentBlock)
    private readonly contentBlockRepository: Repository<ContentBlock>,
  ) {}

  // ==================== FAQS ====================

  async listFaqs(category?: FaqCategory, onlyPublished?: boolean) {
    const where: Record<string, unknown> = {};
    if (category) {
      where.category = category;
    }
    if (onlyPublished !== undefined) {
      where.isPublished = onlyPublished;
    }
    return this.faqRepository.find({
      where,
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async createFaq(dto: CreateFaqDto) {
    const faq = this.faqRepository.create(dto);
    return this.faqRepository.save(faq);
  }

  async updateFaq(id: string, dto: UpdateFaqDto) {
    const faq = await this.faqRepository.findOne({ where: { id } });
    if (!faq) {
      throw new NotFoundException(`FAQ item ${id} not found`);
    }

    Object.assign(faq, dto);
    return this.faqRepository.save(faq);
  }

  async deleteFaq(id: string) {
    const faq = await this.faqRepository.findOne({ where: { id } });
    if (!faq) {
      throw new NotFoundException(`FAQ item ${id} not found`);
    }
    await this.faqRepository.remove(faq);
    return { success: true, deletedId: id };
  }

  // ==================== CONTENT BLOCKS (CMS) ====================

  async listContentBlocks(onlyPublished?: boolean) {
    const where: Record<string, unknown> = {};
    if (onlyPublished !== undefined) {
      where.isPublished = onlyPublished;
    }
    return this.contentBlockRepository.find({
      where,
      order: { title: 'ASC' },
    });
  }

  async getContentBlockBySlug(slug: string) {
    const block = await this.contentBlockRepository.findOne({
      where: { slug: slug.trim().toLowerCase() },
    });
    if (!block) {
      throw new NotFoundException(`Content block with slug "${slug}" not found`);
    }
    return block;
  }

  async createContentBlock(dto: CreateContentBlockDto, adminId?: string) {
    const normalizedSlug = dto.slug.trim().toLowerCase();
    const existing = await this.contentBlockRepository.findOne({
      where: { slug: normalizedSlug },
    });
    if (existing) {
      throw new ConflictException(`Content block with slug "${normalizedSlug}" already exists`);
    }

    const block = this.contentBlockRepository.create({
      ...dto,
      slug: normalizedSlug,
      lastEditedByAdminId: adminId || null,
      publishedAt: dto.isPublished ? new Date() : null,
      version: 1,
    });
    return this.contentBlockRepository.save(block);
  }

  async updateContentBlock(
    id: string,
    dto: UpdateContentBlockDto,
    adminId?: string,
  ) {
    const block = await this.contentBlockRepository.findOne({ where: { id } });
    if (!block) {
      throw new NotFoundException(`Content block ${id} not found`);
    }

    Object.assign(block, dto);
    block.version += 1;
    block.lastEditedByAdminId = adminId || block.lastEditedByAdminId;
    if (dto.isPublished && !block.publishedAt) {
      block.publishedAt = new Date();
    }

    return this.contentBlockRepository.save(block);
  }

  async deleteContentBlock(id: string) {
    const block = await this.contentBlockRepository.findOne({ where: { id } });
    if (!block) {
      throw new NotFoundException(`Content block ${id} not found`);
    }
    await this.contentBlockRepository.remove(block);
    return { success: true, deletedId: id };
  }
}
