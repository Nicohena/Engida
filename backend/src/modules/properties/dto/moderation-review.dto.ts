import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ReviewStatus,
  ReviewSubmissionType,
} from '../entities/listing-review.entity';

export class SubmitReviewDto {
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RejectReviewDto {
  @IsString()
  @IsNotEmpty({ message: 'A meaningful rejection explanation is required.' })
  rejectionReason: string;
}

export class HideListingDto {
  @IsString()
  @IsNotEmpty({ message: 'A reason is required to temporarily hide a listing.' })
  reason: string;
}

export class QueryReviewsDto {
  @IsEnum(ReviewStatus)
  @IsOptional()
  status?: ReviewStatus;

  @IsEnum(ReviewSubmissionType)
  @IsOptional()
  submissionType?: ReviewSubmissionType;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
