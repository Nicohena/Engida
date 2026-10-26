import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ReviewModerationStatus } from '../../../reviews/entities/review.entity';

const toBoolean = ({ value }: { value: unknown }): boolean | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
};

export class QueryAdminGuestReviewsDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsEnum(ReviewModerationStatus)
  status?: ReviewModerationStatus;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  reported?: boolean;

  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class ModerateGuestReviewDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}
