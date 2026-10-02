import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAvailabilityBlockDto {
  @IsNotEmpty({ message: 'Start date is required' })
  @IsDateString({}, { message: 'Start date must be a valid ISO date string (YYYY-MM-DD)' })
  startDate: string;

  @IsNotEmpty({ message: 'End date is required' })
  @IsDateString({}, { message: 'End date must be a valid ISO date string (YYYY-MM-DD)' })
  endDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
