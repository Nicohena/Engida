import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsBoolean,
} from 'class-validator';

export enum IdentityDocumentType {
  ETHIOPIAN_KEBELE_ID = 'ETHIOPIAN_KEBELE_ID',
  ETHIOPIAN_FAYDA_ID = 'ETHIOPIAN_FAYDA_ID',
  ETHIOPIAN_PASSPORT = 'ETHIOPIAN_PASSPORT',
  ETHIOPIAN_DRIVERS_LICENSE = 'ETHIOPIAN_DRIVERS_LICENSE',
  FOREIGN_PASSPORT = 'FOREIGN_PASSPORT',
  RESIDENCE_PERMIT = 'RESIDENCE_PERMIT',
}

export enum VerificationProviderType {
  MANUAL_ADMIN_REVIEW = 'MANUAL_ADMIN_REVIEW',
  SMILE_IDENTITY = 'SMILE_IDENTITY',
  PERSONA = 'PERSONA',
  FAYDA_NIDP = 'FAYDA_NIDP',
}

export class RequestHostVerificationDto {
  @IsNotEmpty({ message: 'Document type is required' })
  @IsEnum(IdentityDocumentType, { message: 'Must be an accepted identity document type' })
  documentType: IdentityDocumentType;

  @IsNotEmpty({ message: 'Issuing country is required (ISO 2-letter or country name)' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  issuingCountry: string;

  @IsNotEmpty({ message: 'Document number is required' })
  @IsString()
  @MinLength(4)
  @MaxLength(50)
  documentNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  issuingAuthority?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  expirationDate?: string;

  @IsOptional()
  @IsEnum(VerificationProviderType)
  verificationProvider?: VerificationProviderType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  verificationReference?: string;

  @IsOptional()
  @IsBoolean()
  faceMatchPerformed?: boolean;

  @IsOptional()
  @IsBoolean()
  livenessVerified?: boolean;
}
