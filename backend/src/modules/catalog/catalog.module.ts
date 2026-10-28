import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyCategory } from './entities/property-category.entity';
import { Destination } from './entities/destination.entity';
import { Amenity } from '../amenities/entities/amenity.entity';
import { Property } from '../properties/entities/property.entity';
import { AdminCatalogService } from './admin-catalog.service';
import { AdminCatalogController } from './admin-catalog.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PropertyCategory,
      Destination,
      Amenity,
      Property,
    ]),
  ],
  controllers: [AdminCatalogController],
  providers: [AdminCatalogService],
  exports: [AdminCatalogService],
})
export class CatalogModule {}
