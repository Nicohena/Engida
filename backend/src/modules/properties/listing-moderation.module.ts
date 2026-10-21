import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from './entities/property.entity';
import { ListingReview } from './entities/listing-review.entity';
import { Amenity } from '../amenities/entities/amenity.entity';
import { ListingModerationService } from './listing-moderation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Property, ListingReview, Amenity]),
  ],
  providers: [ListingModerationService],
  exports: [ListingModerationService, TypeOrmModule],
})
export class ListingModerationModule {}
