import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsInt,
  IsOptional,
  IsArray,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PropertyType } from '../entities/property.entity';

export class UpdatePropertyDto {
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

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  pricePerNight?: number;

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

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

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
