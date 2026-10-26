export type IdentityDocumentType =
  | 'ETHIOPIAN_KEBELE_ID'
  | 'ETHIOPIAN_FAYDA_ID'
  | 'ETHIOPIAN_PASSPORT'
  | 'ETHIOPIAN_DRIVERS_LICENSE'
  | 'FOREIGN_PASSPORT'
  | 'RESIDENCE_PERMIT';

export interface DocumentTypeOption {
  value: IdentityDocumentType;
  label: string;
  description: string;
  defaultCountry: string;
  allowedCountries?: string[];
}

export const SUPPORTED_DOCUMENT_TYPES: DocumentTypeOption[] = [
  {
    value: 'ETHIOPIAN_KEBELE_ID',
    label: 'Ethiopian Kebele Resident ID',
    description: 'Valid resident identification card issued by local Kebele/Woreda administration.',
    defaultCountry: 'ET',
    allowedCountries: ['ET'],
  },
  {
    value: 'ETHIOPIAN_FAYDA_ID',
    label: 'National Fayda Digital ID (FIN / FAN)',
    description: 'National Identification Program digital ID card or Fayda registration number.',
    defaultCountry: 'ET',
    allowedCountries: ['ET'],
  },
  {
    value: 'ETHIOPIAN_PASSPORT',
    label: 'Ethiopian Passport',
    description: 'Current, unexpired passport issued by the Immigration and Citizenship Service.',
    defaultCountry: 'ET',
    allowedCountries: ['ET'],
  },
  {
    value: 'ETHIOPIAN_DRIVERS_LICENSE',
    label: "Ethiopian Driver's License",
    description: 'Official driving license issued by regional or federal transport authorities.',
    defaultCountry: 'ET',
    allowedCountries: ['ET'],
  },
  {
    value: 'FOREIGN_PASSPORT',
    label: 'Foreign Passport (International Hosts)',
    description: 'Valid international passport for non-Ethiopian citizens hosting properties in Ethiopia.',
    defaultCountry: 'US',
  },
  {
    value: 'RESIDENCE_PERMIT',
    label: 'Ethiopian Residence Permit / Yellow Card',
    description: 'Official residency card or Ethiopian origin identification for foreign nationals.',
    defaultCountry: 'ET',
    allowedCountries: ['ET'],
  },
];

export interface CountryOption {
  code: string;
  name: string;
}

export const SUPPORTED_COUNTRIES: CountryOption[] = [
  { code: 'ET', name: 'Ethiopia' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'KE', name: 'Kenya' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'AU', name: 'Australia' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'OTHER', name: 'Other International Country' },
];

export interface CountryDialCode {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  placeholder: string;
  minLength: number;
  maxLength: number;
  pattern?: RegExp;
  formatHint?: string;
}

export const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  {
    code: 'ET',
    name: 'Ethiopia',
    dialCode: '+251',
    flag: '🇪🇹',
    placeholder: '91 123 4567',
    minLength: 9,
    maxLength: 9,
    pattern: /^[79]\d{8}$/,
    formatHint: '9 digits starting with 7 or 9',
  },
  {
    code: 'US',
    name: 'United States',
    dialCode: '+1',
    flag: '🇺🇸',
    placeholder: '(415) 555-2671',
    minLength: 10,
    maxLength: 10,
    pattern: /^[2-9]\d{9}$/,
    formatHint: '10 digits (area code + 7 digits)',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    dialCode: '+44',
    flag: '🇬🇧',
    placeholder: '7911 123456',
    minLength: 10,
    maxLength: 10,
    pattern: /^7\d{9}$/,
    formatHint: '10 digits starting with 7',
  },
  {
    code: 'CA',
    name: 'Canada',
    dialCode: '+1',
    flag: '🇨🇦',
    placeholder: '(416) 555-0199',
    minLength: 10,
    maxLength: 10,
    pattern: /^[2-9]\d{9}$/,
    formatHint: '10 digits (area code + 7 digits)',
  },
  {
    code: 'KE',
    name: 'Kenya',
    dialCode: '+254',
    flag: '🇰🇪',
    placeholder: '712 345678',
    minLength: 9,
    maxLength: 9,
    pattern: /^[17]\d{8}$/,
    formatHint: '9 digits starting with 1 or 7',
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    dialCode: '+971',
    flag: '🇦🇪',
    placeholder: '50 123 4567',
    minLength: 9,
    maxLength: 9,
    pattern: /^5\d{8}$/,
    formatHint: '9 digits starting with 5',
  },
  {
    code: 'DE',
    name: 'Germany',
    dialCode: '+49',
    flag: '🇩🇪',
    placeholder: '151 23456789',
    minLength: 10,
    maxLength: 11,
    pattern: /^1[5-7]\d{8,9}$/,
    formatHint: '10 or 11 digits',
  },
  {
    code: 'FR',
    name: 'France',
    dialCode: '+33',
    flag: '🇫🇷',
    placeholder: '6 12 34 56 78',
    minLength: 9,
    maxLength: 9,
    pattern: /^[67]\d{8}$/,
    formatHint: '9 digits starting with 6 or 7',
  },
  {
    code: 'IT',
    name: 'Italy',
    dialCode: '+39',
    flag: '🇮🇹',
    placeholder: '312 345 6789',
    minLength: 9,
    maxLength: 10,
    pattern: /^3\d{8,9}$/,
    formatHint: '9 or 10 digits starting with 3',
  },
  {
    code: 'AU',
    name: 'Australia',
    dialCode: '+61',
    flag: '🇦🇺',
    placeholder: '412 345 678',
    minLength: 9,
    maxLength: 9,
    pattern: /^4\d{8}$/,
    formatHint: '9 digits starting with 4',
  },
  {
    code: 'NL',
    name: 'Netherlands',
    dialCode: '+31',
    flag: '🇳🇱',
    placeholder: '6 12345678',
    minLength: 9,
    maxLength: 9,
    pattern: /^6\d{8}$/,
    formatHint: '9 digits starting with 6',
  },
  {
    code: 'SE',
    name: 'Sweden',
    dialCode: '+46',
    flag: '🇸🇪',
    placeholder: '70 123 45 67',
    minLength: 9,
    maxLength: 9,
    pattern: /^7[0236]\d{7}$/,
    formatHint: '9 digits starting with 7',
  },
  {
    code: 'SA',
    name: 'Saudi Arabia',
    dialCode: '+966',
    flag: '🇸🇦',
    placeholder: '50 123 4567',
    minLength: 9,
    maxLength: 9,
    pattern: /^5\d{8}$/,
    formatHint: '9 digits starting with 5',
  },
  {
    code: 'ZA',
    name: 'South Africa',
    dialCode: '+27',
    flag: '🇿🇦',
    placeholder: '71 234 5678',
    minLength: 9,
    maxLength: 9,
    pattern: /^[6-8]\d{8}$/,
    formatHint: '9 digits',
  },
  {
    code: 'CN',
    name: 'China',
    dialCode: '+86',
    flag: '🇨🇳',
    placeholder: '138 0013 8000',
    minLength: 11,
    maxLength: 11,
    pattern: /^1\d{10}$/,
    formatHint: '11 digits starting with 1',
  },
  {
    code: 'IN',
    name: 'India',
    dialCode: '+91',
    flag: '🇮🇳',
    placeholder: '98765 43210',
    minLength: 10,
    maxLength: 10,
    pattern: /^[6-9]\d{9}$/,
    formatHint: '10 digits starting with 6-9',
  },
  {
    code: 'OTHER',
    name: 'Other Country',
    dialCode: '+',
    flag: '🌐',
    placeholder: '1234567890',
    minLength: 7,
    maxLength: 15,
    formatHint: '7 to 15 digits',
  },
];

/**
 * Parse an E.164 phone string into its country code and national subscriber number.
 */
export function parsePhoneNumber(rawPhone: string): {
  countryCode: string;
  dialCode: string;
  nationalNumber: string;
} {
  const clean = rawPhone ? rawPhone.trim() : '';
  if (!clean) {
    return { countryCode: 'ET', dialCode: '+251', nationalNumber: '' };
  }

  // Handle local Ethiopian formats: 09... / 07...
  if (/^0[79]\d{8}$/.test(clean)) {
    return { countryCode: 'ET', dialCode: '+251', nationalNumber: clean.slice(1) };
  }

  // Sort dial codes by length descending (e.g. +971 before +9)
  const sortedCodes = [...COUNTRY_DIAL_CODES]
    .filter((c) => c.dialCode !== '+')
    .sort((a, b) => b.dialCode.length - a.dialCode.length);

  for (const c of sortedCodes) {
    if (clean.startsWith(c.dialCode)) {
      const national = clean.slice(c.dialCode.length).replace(/[^\d]/g, '');
      return { countryCode: c.code, dialCode: c.dialCode, nationalNumber: national };
    }
  }

  // If starts with +, parse digits
  if (clean.startsWith('+')) {
    const digitsOnly = clean.slice(1).replace(/[^\d]/g, '');
    return { countryCode: 'OTHER', dialCode: '+', nationalNumber: digitsOnly };
  }

  const digitsOnly = clean.replace(/[^\d]/g, '');
  return { countryCode: 'ET', dialCode: '+251', nationalNumber: digitsOnly };
}

/**
 * Format dial code and national number into standard E.164 string.
 */
export function formatToE164(dialCode: string, nationalNumber: string): string {
  const digits = nationalNumber.replace(/[^\d]/g, '');
  if (!digits) return '';
  const prefix = dialCode.startsWith('+') ? dialCode : `+${dialCode}`;
  return `${prefix}${digits}`;
}

export const ETHIOPIAN_REGIONS = [
  'Addis Ababa',
  'Oromia',
  'Amhara',
  'Sidama',
  'Dire Dawa',
  'Tigray',
  'Somali',
  'Afar',
  'Harari',
  'Benishangul-Gumuz',
  'Gambela',
  'South Ethiopia Regional State',
  'Central Ethiopia Regional State',
  'South West Ethiopia Peoples Region',
];

export const ADDIS_ABABA_SUBCITIES = [
  'Bole',
  'Kirkos',
  'Yeka',
  'Lideta',
  'Arada',
  'Addis Ketema',
  'Kolfe Keranio',
  'Gullele',
  'Nifas Silk-Lafto',
  'Akaki Kality',
  'Lemi Kura',
];

export type HostType = 'INDIVIDUAL' | 'BUSINESS';

export interface OnboardingFormData {
  // Step 1: Account
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  agreedToTerms: boolean;
  isExistingUser: boolean;

  // Step 2: Contact Verification
  verificationChannel: 'EMAIL' | 'PHONE';
  otpCode: string;
  contactVerified: boolean;
  otpCooldownSeconds: number;
  providerStatus: {
    smsConfigured: boolean;
    emailConfigured: boolean;
  };
  manualVerificationAcknowledged: boolean;

  // Step 3: National / International ID Verification
  documentType: IdentityDocumentType;
  issuingCountry: string;
  documentNumber: string;
  issuingAuthority: string;
  expirationDate: string;
  fileName: string | null;
  fileSize: number | null;
  fileValidated: boolean;
  filePreviewUrl?: string | null;
  documentFrontUrl?: string | null;
  backFileName?: string | null;
  backFileSize?: number | null;
  backFilePreviewUrl?: string | null;
  documentBackUrl?: string | null;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | '';
  faydaVerificationMethod?: 'DIGITAL_LOOKUP' | 'DOCUMENT_UPLOAD';
  faydaExtractedData?: {
    fin: string;
    fan?: string;
    rawNumber: string;
    fullName?: string;
    fullNameAmharic?: string;
    dateOfBirth?: string;
    gender?: 'MALE' | 'FEMALE';
    nationality: string;
    region?: string;
    city?: string;
    subCity?: string;
    woreda?: string;
    verificationToken: string;
    verifiedAt: string;
    status: string;
    isLiveNidpExtract?: boolean;
  } | null;

  // Step 4: Host Details & Address
  displayName: string;
  hostType: HostType;
  businessName: string;
  businessTin: string;
  businessRegistrationNumber: string;
  region: string;
  city: string;
  subCity: string;
  woreda: string;
  streetAddress: string;
  bio: string;

  // Step 5: Compliance
  agreedToHostStandards: boolean;
}

export const INITIAL_ONBOARDING_STATE: OnboardingFormData = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  agreedToTerms: false,
  isExistingUser: false,

  verificationChannel: 'EMAIL',
  otpCode: '',
  contactVerified: false,
  otpCooldownSeconds: 0,
  providerStatus: {
    smsConfigured: false,
    emailConfigured: false,
  },
  manualVerificationAcknowledged: false,

  documentType: 'ETHIOPIAN_KEBELE_ID',
  issuingCountry: 'ET',
  documentNumber: '',
  issuingAuthority: '',
  expirationDate: '',
  fileName: null,
  fileSize: null,
  fileValidated: false,
  filePreviewUrl: null,
  documentFrontUrl: null,
  backFileName: null,
  backFileSize: null,
  backFilePreviewUrl: null,
  documentBackUrl: null,
  dateOfBirth: '',
  gender: '',
  faydaVerificationMethod: 'DOCUMENT_UPLOAD',
  faydaExtractedData: null,

  displayName: '',
  hostType: 'INDIVIDUAL',
  businessName: '',
  businessTin: '',
  businessRegistrationNumber: '',
  region: 'Addis Ababa',
  city: 'Addis Ababa',
  subCity: 'Bole',
  woreda: '',
  streetAddress: '',
  bio: '',

  agreedToHostStandards: false,
};
