import { IsNotEmpty, IsOptional, IsDateString, IsUUID, IsInt, Min, Max } from 'class-validator';

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
}
