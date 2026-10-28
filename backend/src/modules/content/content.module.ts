import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FaqItem } from './entities/faq-item.entity';
import { ContentBlock } from './entities/content-block.entity';
import { AdminContentService } from './admin-content.service';
import { AdminContentController } from './admin-content.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FaqItem, ContentBlock])],
  controllers: [AdminContentController],
  providers: [AdminContentService],
  exports: [AdminContentService],
})
export class ContentModule {}
