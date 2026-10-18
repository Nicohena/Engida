import {
  IsString,
  IsOptional,
  MaxLength,
  Matches,
  MinLength,
  IsEnum,
  IsEmail,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PayoutProvider } from '../../../users/entities/host-profile.entity';

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

  // ─────────────────────────────────────────
  // Payout & Banking
  // ─────────────────────────────────────────
  @IsOptional()
  @IsEnum(PayoutProvider)
  payoutProvider?: PayoutProvider | null;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  payoutAccountName?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  payoutAccountNumber?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  payoutPhone?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  payoutBankBranch?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  payoutSwiftBic?: string | null;

  @IsOptional()
  @IsEmail({}, { message: 'Must be a valid email for PayPal or Wise' })
  payoutEmail?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  payoutCurrency?: string;
}
