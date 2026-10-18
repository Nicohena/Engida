import { IsNotEmpty, IsOptional, IsDateString, IsUUID, IsInt, Min, Max, IsEnum, IsString } from 'class-validator';
import { PaymentMethod } from '../entities/booking.entity';

export class CreateBookingDto {
  @IsUUID()
  @IsNotEmpty()
  propertyId: string;

  @IsUUID()
  @IsOptional()
  roomId?: string;

  @IsDateString()
  @IsNotEmpty()
  checkInDate: string;

  @IsDateString()
  @IsNotEmpty()
  checkOutDate: string;

  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  guestCount?: number;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  paymentReference?: string;

  @IsString()
  @IsOptional()
  paymentCurrency?: string;
}

