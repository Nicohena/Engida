import { IsString, IsOptional, IsInt, IsNumber, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PredictPriceDto {
  @IsString()
  city: string;

  @IsString()
  propertyType: string;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  bedrooms: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  bathrooms: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxGuests: number;

  @IsArray()
  @IsString({ each: true })
  amenities: string[];
}

export class RecommendationsDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  propertyType?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  maxPrice?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  minBedrooms?: number;
}
