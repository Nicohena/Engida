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
  phone: '+251 9',
  password: '',
  confirmPassword: '',
  agreedToTerms: false,
  isExistingUser: false,

  verificationChannel: 'PHONE',
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
