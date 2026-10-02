import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAvailabilityBlockDto {
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
