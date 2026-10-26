import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ListingModerationModule } from '../properties/listing-moderation.module';
import { HostModule } from '../host/host.module';

@Module({
  imports: [ListingModerationModule, HostModule],
  controllers: [AdminController],
})
export class AdminModule {}
