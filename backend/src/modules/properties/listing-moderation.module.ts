import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from './entities/property.entity';
import { ListingReview } from './entities/listing-review.entity';
import { Amenity } from '../amenities/entities/amenity.entity';
import { ListingModerationService } from './listing-moderation.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Property, ListingReview, Amenity]),
    CloudinaryModule,
  ],
  providers: [ListingModerationService],
  exports: [ListingModerationService, TypeOrmModule],
})
export class ListingModerationModule {}
