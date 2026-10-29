import { IsString, IsOptional, IsInt, IsNumber, IsArray, Min, IsEnum, IsUUID, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { HostRecommendationAction } from './entities/price-recommendation-log.entity';

export class PredictPriceDto {
  @IsString()
  @IsOptional()
  propertyId?: string;

  @IsString()
  city: string;

  @IsString()
  @IsOptional()
  subCity?: string;

  @IsString()
  @IsOptional()
  neighborhood?: string;

  @IsString()
  propertyType: string;

  @IsString()
  @IsOptional()
  listingType?: string; // 'RENTAL' | 'SALE'

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

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  areaSqm?: number;

  @IsArray()
  @IsString({ each: true })
  amenities: string[];

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  regenerationIndex?: number;
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

export class GenerateListingContentDto {
  @IsString()
  propertyType: string;

  @IsString()
  @IsOptional()
  listingType?: string; // 'RENTAL' | 'SALE'

  @IsString()
  city: string;

  @IsString()
  @IsOptional()
  subCity?: string;

  @IsString()
  @IsOptional()
  neighborhood?: string;

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

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  areaSqm?: number;

  @IsArray()
  @IsString({ each: true })
  amenities: string[];

  @IsString()
  @IsOptional()
  language?: 'en' | 'am';

  @IsString()
  @IsOptional()
  tone?: 'luxury' | 'warm' | 'business';

  @IsString()
  @IsOptional()
  descriptionLength?: 'short' | 'medium' | 'long';

  @IsString()
  @IsOptional()
  titleLength?: 'concise' | 'standard' | 'extended';

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  regenerationIndex?: number;
}

export class RecordRecommendationFeedbackDto {
  @IsUUID()
  recommendationId: string;

  @IsEnum(HostRecommendationAction)
  action: HostRecommendationAction;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  chosenPrice?: number;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  feedbackReason?: string;
}
