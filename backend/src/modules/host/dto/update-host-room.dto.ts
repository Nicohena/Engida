import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateHostRoomDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(150)
  title?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(50)
  roomNumber?: string;

  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  @Type(() => Number)
  capacity?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @IsOptional()
  @Type(() => Number)
  pricePerNight?: number;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}
