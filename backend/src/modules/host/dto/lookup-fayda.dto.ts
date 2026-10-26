import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LookupFaydaDto {
  @IsNotEmpty({ message: 'Fayda number (FIN or FAN) is required' })
  @IsString()
  @MinLength(12, { message: 'Fayda number must contain at least 12 digits' })
  @MaxLength(25, { message: 'Fayda number exceeds maximum length' })
  faydaNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
