import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class DeletePropertyImageDto {
  @IsString()
  @IsNotEmpty()
  imageUrl: string;
}
