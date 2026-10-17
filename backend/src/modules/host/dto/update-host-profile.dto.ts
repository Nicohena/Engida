import {
  IsString,
  IsOptional,
  MaxLength,
  Matches,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateHostProfileDto {
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(2)
  @MaxLength(100)
  displayName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  bio?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  @Matches(/^\+?[\d\s\-()]{7,20}$/, {
    message: 'Phone number must be a valid format',
  })
  phone?: string;
}
