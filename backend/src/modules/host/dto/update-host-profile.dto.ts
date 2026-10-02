import {
  IsString,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateHostProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  displayName?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  @Matches(/^\+?[\d\s\-()]{7,20}$/, {
    message: 'Phone number must be a valid format',
  })
  phone?: string;
}
