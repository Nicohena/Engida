import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaymentMethod } from '../../bookings/entities/booking.entity';

export class CreatePaymentSessionDto {
  @IsUUID()
  @IsNotEmpty()
  bookingId: string;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @IsString()
  @IsOptional()
  currency?: string = 'ETB';

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  returnUrl?: string;
}

export class InitializePaymentDto {
  @IsUUID()
  @IsOptional()
  bookingId?: string;

  @IsUUID()
  @IsNotEmpty()
  propertyId: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string = 'ETB';

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  @IsNotEmpty()
  customerEmail: string;

  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  returnUrl?: string;
}

export class VerifyPaymentDto {
  @IsString()
  @IsNotEmpty()
  transactionReference: string;

  @IsUUID()
  @IsOptional()
  bookingId?: string;
}
