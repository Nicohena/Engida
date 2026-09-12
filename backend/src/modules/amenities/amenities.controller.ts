import { Controller, Get } from '@nestjs/common';
import { AmenitiesService } from './amenities.service';

@Controller('amenities')
export class AmenitiesController {
  constructor(private readonly amenitiesService: AmenitiesService) {}

  /**
   * Public: Get all available amenities
   */
  @Get()
  async findAll() {
    return this.amenitiesService.findAll();
  }
}
