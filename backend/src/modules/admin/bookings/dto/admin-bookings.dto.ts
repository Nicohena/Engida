import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
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
import { BookingStatus, PaymentStatus } from '../../../bookings/entities/booking.entity';
import {
  CancellationRequestSource,
} from '../../../bookings/entities/cancellation-request.entity';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class QueryAdminBookingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

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
  limit = 25;
}

export class AdminBookingStatusDto {
  @IsEnum(BookingStatus)
  status: BookingStatus;

  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  reason: string;
}

export class RecordCancellationDto {
  @IsEnum(CancellationRequestSource)
  source: CancellationRequestSource;

  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;
}

export class DecideCancellationDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class QueryAvailabilityDto {
  @IsUUID()
  propertyId: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class CreateAdminAvailabilityBlockDto {
  @IsUUID()
  propertyId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  reason: string;
}
