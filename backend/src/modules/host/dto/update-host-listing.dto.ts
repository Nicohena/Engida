import {
  IsString,
  IsEnum,
  IsNumber,
  IsInt,
  IsOptional,
  IsArray,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PropertyType } from '../../properties/entities/property.entity';

/**
 * DTO for host to update their own listing.
 * Status changes are NOT allowed here - use dedicated workflow endpoints.
 * hostId / host ownership is NOT changeable.
 */
export class UpdateHostListingDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PropertyType)
  @IsOptional()
  propertyType?: PropertyType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  pricePerNight?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  salePrice?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  maxGuests?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  bedrooms?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  bathrooms?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  areaSqm?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  parkingSpaces?: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  region?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  zone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  subCity?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  woreda?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  neighborhood?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenityIds?: string[];
}
