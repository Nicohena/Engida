import { IsString, IsNotEmpty, IsInt, IsNumber, IsOptional, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  roomNumber: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  capacity?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  pricePerNight: number;
}
