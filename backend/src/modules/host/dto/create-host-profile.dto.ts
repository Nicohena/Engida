import { Transform } from 'class-transformer';
import { IsString, IsOptional, MaxLength, MinLength, Matches } from 'class-validator';

export class CreateHostProfileDto {
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(2)
  @MaxLength(100)
  displayName: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed || undefined;
  })
  @MaxLength(50)
  @Matches(/^\+?[\d\s\-()]{7,20}$/, {
    message: 'Phone number must be a valid format',
  })
  phone?: string;
}
