import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ListingModerationModule } from '../properties/listing-moderation.module';

@Module({
  imports: [ListingModerationModule],
  controllers: [AdminController],
})
export class AdminModule {}
