import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AmenitiesService } from './amenities.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

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

  /**
   * Protected: Create or retrieve custom host amenity
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() body: { name: string; icon?: string }) {
    if (!body?.name?.trim()) {
      throw new BadRequestException('Amenity name is required');
    }
    return this.amenitiesService.findOrCreate(body.name, body.icon);
  }
}
