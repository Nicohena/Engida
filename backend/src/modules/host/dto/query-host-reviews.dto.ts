import { IsOptional, IsInt, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryHostReviewsDto {
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}

export class QueryHostReviewsSummaryDto {
  @IsOptional()
  @IsUUID()
  propertyId?: string;
}
