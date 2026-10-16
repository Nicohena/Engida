import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { DeletePropertyImageDto } from './dto/delete-property-image.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User } from '../../users/entities/user.entity';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  /**
   * Public: Search and filter property listings
   */
  @Get()
  async findAll(@Query() query: QueryPropertyDto) {
    return this.propertiesService.findAll(query);
  }

  /**
   * Public: Get a single property with full details
   */
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.propertiesService.findOne(id);
  }

  /**
   * Public: Get related properties for a given property
   */
  @Get(':id/related')
  async findRelated(@Param('id', ParseUUIDPipe) id: string) {
    return this.propertiesService.findRelated(id);
  }

  /**
   * Protected: Get current user's own listings
   */
  @Get('my/listings')
  @UseGuards(JwtAuthGuard)
  async getMyListings(@GetUser() user: User) {
    return this.propertiesService.findMyProperties(user.id);
  }

  /**
   * Protected: Create a new property listing
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createPropertyDto: CreatePropertyDto,
    @GetUser() user: User,
  ) {
    return this.propertiesService.create(createPropertyDto, user.id);
  }

  /**
   * Protected: Update a property listing (owner or admin only)
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
    @GetUser() user: User,
  ) {
    return this.propertiesService.update(id, updatePropertyDto, user.id, user.role);
  }

  /**
   * Protected: Delete a property listing (owner or admin only)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ) {
    return this.propertiesService.remove(id, user.id, user.role);
  }

  /**
   * Protected: Add a room to a property (owner or admin only)
   */
  @Post(':id/rooms')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async addRoom(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createRoomDto: CreateRoomDto,
    @GetUser() user: User,
  ) {
    return this.propertiesService.addRoom(id, createRoomDto, user.id, user.role);
  }

  /**
   * Protected: Upload and set cover image for a property
   */
  @Post(':id/cover-image')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadCoverImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required under "file" form field');
    }
    return this.propertiesService.uploadCoverImage(id, file, user.id, user.role);
  }

  /**
   * Protected: Upload multiple images to property gallery (up to 10)
   */
  @Post(':id/images')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('files', 10, { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadGalleryImages(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @GetUser() user: User,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one image file is required under "files" form field');
    }
    return this.propertiesService.uploadGalleryImages(id, files, user.id, user.role);
  }

  /**
   * Protected: Remove an image from property gallery
   */
  @Delete(':id/images')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async removeGalleryImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() deleteImageDto: DeletePropertyImageDto,
    @GetUser() user: User,
  ) {
    return this.propertiesService.removeGalleryImage(id, deleteImageDto.imageUrl, user.id, user.role);
  }
}
