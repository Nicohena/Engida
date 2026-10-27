import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  CaseCategory,
  CasePriority,
  CaseSeverity,
  CaseStatus,
  CaseType,
} from '../entities/case.entity';
import { CaseMessageChannel } from '../entities/case-message.entity';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const toBoolean = ({ value }: { value: unknown }): boolean | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
};

export class QueryAdminCasesDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsEnum(CaseStatus)
  status?: CaseStatus;

  @IsOptional()
  @IsEnum(CaseType)
  type?: CaseType;

  @IsOptional()
  @IsEnum(CasePriority)
  priority?: CasePriority;

  @IsOptional()
  @IsEnum(CaseSeverity)
  severity?: CaseSeverity;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  overdue?: boolean;

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
  limit = 30;
}

export class CreateCaseDto {
  @IsEnum(CaseType)
  type: CaseType;

  @IsOptional()
  @IsEnum(CaseCategory)
  category?: CaseCategory;

  @IsOptional()
  @IsEnum(CasePriority)
  priority?: CasePriority;

  @IsOptional()
  @IsEnum(CaseSeverity)
  severity?: CaseSeverity;

  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  subject: string;

  @Transform(trim)
  @IsString()
  @MinLength(20)
  @MaxLength(10000)
  description: string;

  @IsOptional()
  @IsUUID()
  requesterUserId?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  requesterName?: string;

  @IsOptional()
  @Transform(trim)
  @IsEmail()
  @MaxLength(255)
  requesterEmail?: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsUUID()
  reportId?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;
}

export class UpdateCaseDto {
  @IsOptional()
  @IsEnum(CaseCategory)
  category?: CaseCategory;

  @IsOptional()
  @IsEnum(CasePriority)
  priority?: CasePriority;

  @IsOptional()
  @IsEnum(CaseSeverity)
  severity?: CaseSeverity;
}

export class AssignCaseDto {
  @IsUUID()
  assigneeId: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class CaseStatusDto {
  @IsEnum(CaseStatus)
  status: CaseStatus;

  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  reason: string;
}

export class AddCaseMessageDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(10000)
  body: string;

  @IsOptional()
  @IsEnum(CaseMessageChannel)
  channel?: CaseMessageChannel;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;
}

export class LogInboundReplyDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(10000)
  body: string;

  @IsOptional()
  @IsEnum(CaseMessageChannel)
  channel?: CaseMessageChannel;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  authorName?: string;

  @IsOptional()
  @Transform(trim)
  @IsEmail()
  @MaxLength(255)
  authorEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;
}

export class AddCaseNoteDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(10000)
  body: string;
}

export class ProposeCompensationDto {
  @Transform(trim)
  @Matches(/^\d{1,8}(\.\d{1,2})?$/, {
    message: 'Amount must be a positive value with up to two decimal places',
  })
  amount: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(10)
  currency?: string;

  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  note: string;
}

export class DecideCompensationDto {
  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  note: string;
}

export class UploadCaseAttachmentDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  caption?: string;
}

export class CreateCannedResponseDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title: string;

  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(10000)
  body: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  category?: string;
}

export class UpdateCannedResponseDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(10000)
  body?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
