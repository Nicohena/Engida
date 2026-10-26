import {
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HostVerificationStatus } from '../../../users/entities/host-profile.entity';

export class QueryHostVerificationsDto {
  @IsOptional()
  @IsEnum(HostVerificationStatus)
  status?: HostVerificationStatus = HostVerificationStatus.PENDING;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class RejectHostVerificationDto {
  @IsOptional()
  @IsString()
  @MinLength(5, { message: 'Rejection explanation must be at least 5 characters' })
  @MaxLength(500, { message: 'Rejection explanation cannot exceed 500 characters' })
  explanation?: string;

  @IsOptional()
  @IsString()
  @MinLength(5, { message: 'Rejection reason must be at least 5 characters' })
  @MaxLength(500, { message: 'Rejection reason cannot exceed 500 characters' })
  rejectionReason?: string;
}
