import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateHostProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
