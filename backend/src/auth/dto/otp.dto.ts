import { IsEnum, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export enum OtpChannel {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
}

export class SendOtpDto {
  @IsNotEmpty({ message: 'Target email or phone is required' })
  @IsString()
  target: string;

  @IsNotEmpty({ message: 'Channel is required (EMAIL or PHONE)' })
  @IsEnum(OtpChannel, { message: 'Channel must be either EMAIL or PHONE' })
  channel: OtpChannel;

  @IsOptional()
  @IsString()
  purpose?: string;
}

export class VerifyOtpDto {
  @IsNotEmpty({ message: 'Target email or phone is required' })
  @IsString()
  target: string;

  @IsNotEmpty({ message: 'Verification code is required' })
  @IsString()
  @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Verification code must contain only numbers' })
  code: string;

  @IsOptional()
  @IsString()
  purpose?: string;
}
