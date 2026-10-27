'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Globe,
  Lock,
  Calendar,
  X,
  Eye,
  Info,
  CreditCard,
  Sparkles,
  Camera,
  RefreshCw,
  Zap,
  BadgeCheck,
  MapPin,
  UserCheck,
  RotateCcw,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import {
  SUPPORTED_DOCUMENT_TYPES,
  SUPPORTED_COUNTRIES,
  type OnboardingFormData,
  type IdentityDocumentType,
} from './types';

interface Step3IdentityVerificationProps {
  data: OnboardingFormData;
  updateData: (fields: Partial<OnboardingFormData>) => void;
  onBack: () => void;
  onContinue: () => void;
}

interface FaydaApiResponse {
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
  registeredPhoneMasked?: string;
  status: string;
  verificationToken: string;
  verifiedAt: string;
  provider: string;
  matchScore: number;
  isLiveNidpExtract?: boolean;
}

export default function Step3IdentityVerification({
  data,
  updateData,
  onBack,
  onContinue,
}: Step3IdentityVerificationProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [frontUploadError, setFrontUploadError] = useState<string | null>(null);
  const [backUploadError, setBackUploadError] = useState<string | null>(null);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [isFrontDragOver, setIsFrontDragOver] = useState(false);
  const [isBackDragOver, setIsBackDragOver] = useState(false);

  // Fayda Digital Verification state
  const [isExtractingFayda, setIsExtractingFayda] = useState(false);
  const [faydaExtractError, setFaydaExtractError] = useState<string | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const selectedDocConfig =
    SUPPORTED_DOCUMENT_TYPES.find((d) => d.value === data.documentType) ||
    SUPPORTED_DOCUMENT_TYPES[0];

  const isFayda = data.documentType === 'ETHIOPIAN_FAYDA_ID';

  const requiresBackSide =
    data.documentType === 'ETHIOPIAN_KEBELE_ID' ||
    isFayda ||
    data.documentType === 'ETHIOPIAN_DRIVERS_LICENSE' ||
    data.documentType === 'RESIDENCE_PERMIT';

  // Ensure country matches document constraints on initial load or type change
  useEffect(() => {
    if (selectedDocConfig.allowedCountries?.length === 1) {
      const allowed = selectedDocConfig.allowedCountries[0];
      if (data.issuingCountry !== allowed) {
        queueMicrotask(() => {
          updateData({ issuingCountry: allowed });
        });
      }
    }
  }, [selectedDocConfig, data.issuingCountry, updateData]);

  // Contextual placeholder for document numbers
  const getDocumentPlaceholder = (type: IdentityDocumentType): string => {
    switch (type) {
      case 'ETHIOPIAN_FAYDA_ID':
        return 'e.g. 1029 3847 5610 (12-digit FIN)';
      case 'ETHIOPIAN_KEBELE_ID':
        return 'e.g. AA-03-91823 / KB-48201';
      case 'ETHIOPIAN_PASSPORT':
        return 'e.g. EP1029384';
      case 'ETHIOPIAN_DRIVERS_LICENSE':
        return 'e.g. ET-DL-882194';
      case 'FOREIGN_PASSPORT':
        return 'e.g. 9-digit passport number';
      case 'RESIDENCE_PERMIT':
        return 'e.g. RP-8819203 or Yellow Card ID';
      default:
        return 'e.g. ETH-10293847';
    }
  };

  // Contextual helper for issuing authority
  const getIssuingAuthorityPlaceholder = (type: IdentityDocumentType): string => {
    switch (type) {
      case 'ETHIOPIAN_FAYDA_ID':
        return 'National ID Program (NIDP)';
      case 'ETHIOPIAN_KEBELE_ID':
        return 'e.g. Addis Ababa Woreda 03 Kebele Administration';
      case 'ETHIOPIAN_PASSPORT':
        return 'e.g. Immigration and Citizenship Service (ICS)';
      case 'ETHIOPIAN_DRIVERS_LICENSE':
        return 'e.g. Federal / Regional Transport Bureau';
      case 'FOREIGN_PASSPORT':
        return 'e.g. Department of State / Passport Agency';
      case 'RESIDENCE_PERMIT':
        return 'e.g. ICS Foreigners Registration Division';
      default:
        return 'e.g. Issuing Government Authority';
    }
  };

  const handleDocumentTypeChange = (type: IdentityDocumentType) => {
    const docConfig = SUPPORTED_DOCUMENT_TYPES.find((d) => d.value === type);
    const newCountry =
      docConfig?.defaultCountry ||
      (type === 'FOREIGN_PASSPORT' && data.issuingCountry === 'ET' ? 'US' : data.issuingCountry);

    updateData({
      documentType: type,
      issuingCountry: newCountry,
      documentNumber: '',
      faydaExtractedData: null,
      faydaVerificationMethod: 'DIGITAL_LOOKUP',
    });
    setErrors({});
    setFrontUploadError(null);
    setBackUploadError(null);
    setFaydaExtractError(null);
  };

  // Real-time document number input formatting
  const handleDocumentNumberChange = (rawVal: string) => {
    let formatted = rawVal;

    if (data.documentType === 'ETHIOPIAN_FAYDA_ID') {
      // Numbers only, formatted in 4-digit groups: 1234 5678 9012 (12-digit FIN or 16-digit FAN)
      const digits = rawVal.replace(/\D/g, '').slice(0, 16);
      formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    } else if (
      data.documentType === 'ETHIOPIAN_PASSPORT' ||
      data.documentType === 'FOREIGN_PASSPORT'
    ) {
      formatted = rawVal.toUpperCase().replace(/\s/g, '').slice(0, 20);
    } else if (
      data.documentType === 'ETHIOPIAN_KEBELE_ID' ||
      data.documentType === 'ETHIOPIAN_DRIVERS_LICENSE' ||
      data.documentType === 'RESIDENCE_PERMIT'
    ) {
      formatted = rawVal.toUpperCase().slice(0, 30);
    }

    updateData({
      documentNumber: formatted,
      // If user edits number after extraction, reset verified record
      ...(isFayda && data.faydaExtractedData ? { faydaExtractedData: null } : {}),
    });

    if (errors.documentNumber) {
      setErrors((prev) => ({ ...prev, documentNumber: '' }));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // FAYDA DIGITAL LOOKUP & EXTRACT ACTION
  // ─────────────────────────────────────────────────────────────
  const handleFaydaLookupAndExtract = async () => {
    const raw = data.documentNumber.trim();
    const cleanDigits = raw.replace(/\D/g, '');

    if (cleanDigits.length !== 12 && cleanDigits.length !== 16) {
      setFaydaExtractError(
        'Fayda ID must be a 12-digit FIN (e.g. 1029 3847 5610) or 16-digit FAN before extraction.',
      );
      return;
    }

    setFaydaExtractError(null);
    setIsExtractingFayda(true);

    try {
      const result = await apiFetch<FaydaApiResponse>('/host/verification/fayda/lookup', {
        method: 'POST',
        body: JSON.stringify({
          faydaNumber: cleanDigits,
          fullName: data.fullName || undefined,
          phone: data.phone || undefined,
        }),
      });

      if (result) {
        updateData({
          documentNumber: result.fin,
          issuingAuthority: 'National ID Program (NIDP)',
          faydaExtractedData: result,
          ...(result.isLiveNidpExtract
            ? {
                displayName: data.displayName || result.fullName,
                subCity: result.subCity || data.subCity,
                woreda: result.woreda || data.woreda,
                region: result.region || data.region,
                city: result.city || data.city,
                dateOfBirth: result.dateOfBirth || data.dateOfBirth,
                gender: result.gender || data.gender,
              }
            : {}),
        });
        setErrors((prev) => ({ ...prev, documentNumber: '' }));
      }
    } catch (err) {
      setFaydaExtractError(
        err instanceof Error
          ? err.message
          : 'Unable to connect to National ID Program registry. Please check your number or upload card scans.',
      );
    } finally {
      setIsExtractingFayda(false);
    }
  };

  // Expiration date change with past-date check
  const handleExpirationDateChange = (val: string) => {
    updateData({ expirationDate: val });
    if (val) {
      const selectedDate = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        setErrors((prev) => ({
          ...prev,
          expirationDate:
            'This document has expired. Government regulations require a current, valid ID.',
        }));
      } else {
        setErrors((prev) => ({ ...prev, expirationDate: '' }));
      }
    } else {
      setErrors((prev) => ({ ...prev, expirationDate: '' }));
    }
  };

  // Validate uploaded file (format and size)
  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid document format. Please upload JPEG, PNG, WebP, or PDF.';
    }
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      return `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum 5MB limit.`;
    }
    return null;
  };

  const handleFrontFileSelected = (file: File) => {
    setFrontUploadError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setFrontUploadError(validationError);
      return;
    }

    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    updateData({
      fileName: file.name,
      fileSize: file.size,
      fileValidated: true,
      filePreviewUrl: previewUrl,
    });
    setErrors((prev) => ({ ...prev, file: '' }));
  };

  const handleBackFileSelected = (file: File) => {
    setBackUploadError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setBackUploadError(validationError);
      return;
    }

    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
    updateData({
      backFileName: file.name,
      backFileSize: file.size,
      backFilePreviewUrl: previewUrl,
    });
    setErrors((prev) => ({ ...prev, backFile: '' }));
  };

  const removeFrontFile = () => {
    updateData({
      fileName: null,
      fileSize: null,
      fileValidated: false,
      filePreviewUrl: null,
      documentFrontUrl: null,
    });
    if (frontInputRef.current) frontInputRef.current.value = '';
  };

  const removeBackFile = () => {
    updateData({
      backFileName: null,
      backFileSize: null,
      backFilePreviewUrl: null,
      documentBackUrl: null,
    });
    if (backInputRef.current) backInputRef.current.value = '';
  };

  // Development helper: load a high-quality SVG sample document in 1 click
  const loadDemoIdentityDocument = () => {
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 800;
    sampleCanvas.height = 500;
    const ctx = sampleCanvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 800, 500);
      grad.addColorStop(0, '#c2652a');
      grad.addColorStop(1, '#a65320');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 500);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA', 40, 55);
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#f2ece4';
      ctx.fillText('OFFICIAL IDENTITY DOCUMENT · VERIFIED DEMO SPECIMEN', 40, 85);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(40, 120, 180, 220);
      ctx.fillStyle = '#605850';
      ctx.fillRect(45, 125, 170, 210);
      ctx.fillStyle = '#f2ece4';
      ctx.beginPath();
      ctx.arc(130, 200, 45, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(130, 310, 70, Math.PI, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('LEGAL FULL NAME', 250, 150);
      ctx.font = '20px sans-serif';
      ctx.fillText(data.fullName || 'ABEBE BIKILA KEBEDE', 250, 180);

      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('DOCUMENT TYPE', 250, 225);
      ctx.font = '16px sans-serif';
      ctx.fillText(selectedDocConfig.label, 250, 250);

      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('DOCUMENT NUMBER', 250, 295);
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = '#fde047';
      const sampleNum =
        data.documentType === 'ETHIOPIAN_FAYDA_ID'
          ? '1029 3847 5610'
          : data.documentType === 'ETHIOPIAN_PASSPORT'
            ? 'EP1029384'
            : 'AA-03-91823';
      ctx.fillText(data.documentNumber || sampleNum, 250, 325);

      ctx.fillStyle = '#f2ece4';
      ctx.font = '12px monospace';
      ctx.fillText('<<ETH10293847<<5M01019<<<BIKILA<<ABEBE<<<<<<<<<<<<<', 40, 440);
      ctx.fillText('ET-NIDP-2026-ENGIDA-DEMO-VERIFIED-SPECIMEN-SECURE-ID', 40, 465);

      const dataUrl = sampleCanvas.toDataURL('image/png');
      updateData({
        documentNumber: data.documentNumber || sampleNum,
        fileName: `demo_${data.documentType.toLowerCase()}_sample.png`,
        fileSize: 148200,
        fileValidated: true,
        filePreviewUrl: dataUrl,
      });
      setErrors({});
      setFrontUploadError(null);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Document Number Validation
    const cleanNum = data.documentNumber.trim();
    if (!cleanNum || cleanNum.length < 4) {
      newErrors.documentNumber = 'Please enter a valid document identification number.';
    } else if (isFayda) {
      const digits = cleanNum.replace(/\D/g, '');
      if (digits.length !== 12 && digits.length !== 16) {
        newErrors.documentNumber =
          'Fayda National ID must be a 12-digit FIN (e.g. 1029 3847 5610) or 16-digit FAN.';
      }
    } else if (data.documentType === 'ETHIOPIAN_PASSPORT') {
      if (!/^EP\d{7}$/i.test(cleanNum) && cleanNum.length < 7) {
        newErrors.documentNumber =
          'Ethiopian Passport numbers typically begin with EP followed by 7 digits.';
      }
    }

    // 2. Issuing Country Validation
    if (!data.issuingCountry) {
      newErrors.issuingCountry = 'Please select the issuing country.';
    } else if (
      (data.documentType === 'ETHIOPIAN_KEBELE_ID' ||
        isFayda ||
        data.documentType === 'ETHIOPIAN_PASSPORT' ||
        data.documentType === 'ETHIOPIAN_DRIVERS_LICENSE' ||
        data.documentType === 'RESIDENCE_PERMIT') &&
      data.issuingCountry !== 'ET'
    ) {
      newErrors.issuingCountry =
        'Ethiopian identity documents must specify Ethiopia as the issuing country.';
    }

    // 3. Expiration Date Check (if provided)
    if (data.expirationDate) {
      const expDate = new Date(data.expirationDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expDate < today) {
        newErrors.expirationDate =
          'This document has expired. Government regulations require an active, unexpired ID.';
      }
    }

    // 4. Document Verification / File Check
    if (isFayda && data.faydaExtractedData?.isLiveNidpExtract) {
      // Live NIDP e-KYC verified - physical upload is optional
    } else {
      if (!data.fileName || !data.fileValidated) {
        newErrors.file = isFayda
          ? 'Please upload the front side of your Fayda card.'
          : 'Please upload a legible copy of your selected identity document.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onContinue();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* ── Step Header ── */}
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#f2ece4] text-[#c2652a] uppercase tracking-wider">
            Enterprise KYC
          </span>
          <span className="text-xs text-[#605850] font-medium flex items-center gap-1">
            <Lock className="w-3 h-3 text-[#605850]" /> AES-256 Vault Protected
          </span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-[#3a302a] mt-2">
          Government Identity Verification
        </h2>
        <p className="text-xs text-[#605850] mt-1 leading-relaxed">
          ENGIDA supports eligible Ethiopian citizens, diaspora residents, and verified international
          hosts. Government ID verification binds your account to an authoritative legal identity prior to
          public listing publication.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* ── Document Type Selection ── */}
        <div>
          <label className="block text-xs font-bold text-[#3a302a] mb-2">
            Select Identity Document Type <span className="text-rose-500">*</span>
          </label>
          <div className="space-y-2">
            {SUPPORTED_DOCUMENT_TYPES.map((doc) => {
              const isSelected = data.documentType === doc.value;
              return (
                <label
                  key={doc.value}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'border-[#c2652a] bg-[#f2ece4]/50 ring-1 ring-[#c2652a]'
                      : 'border-[#d8d0c8] bg-white hover:border-[#c2652a]'
                  }`}
                >
                  <input
                    type="radio"
                    name="documentType"
                    value={doc.value}
                    checked={isSelected}
                    onChange={() => handleDocumentTypeChange(doc.value)}
                    className="mt-1 w-4 h-4 text-[#c2652a] border-[#d8d0c8] focus:ring-[#c2652a] cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="block text-xs font-bold text-[#3a302a]">{doc.label}</span>
                      {doc.value === 'ETHIOPIAN_FAYDA_ID' && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Zap className="w-3 h-3 text-emerald-600" /> Instant e-KYC Available
                        </span>
                      )}
                      {doc.value === 'FOREIGN_PASSPORT' && (
                        <span className="text-[10px] font-semibold text-[#c2652a] bg-[#f2ece4] px-2 py-0.5 rounded-full">
                          Global Hosts
                        </span>
                      )}
                    </div>
                    <span className="block text-xs text-[#605850] mt-0.5 leading-relaxed">
                      {doc.description}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* ── FAYDA DIGITAL ID SECTION ── */}
        {isFayda ? (
          <div className="space-y-4 p-5 rounded-2xl border border-[#d8d0c8] bg-white shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#d8d0c8]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#f2ece4] text-[#c2652a] flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-xs font-bold text-[#3a302a]">National Fayda Digital ID</span>
                  <span className="block text-[11px] text-[#605850]">
                    Federal Democratic Republic of Ethiopia · National Identification Program (NIDP)
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-[#c2652a] bg-[#f2ece4] border border-[#d8d0c8] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#c2652a]" /> NIDP Compliant
              </span>
            </div>

            {/* FIN or FAN Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="faydaNumberInput" className="block text-xs font-bold text-[#3a302a]">
                  National Fayda ID Number (FIN or FAN) <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] font-mono text-[#c2652a]">
                  {data.documentNumber.replace(/\D/g, '').length} / 12 digits
                </span>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#605850]">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <input
                    id="faydaNumberInput"
                    type="text"
                    value={data.documentNumber}
                    onChange={(e) => handleDocumentNumberChange(e.target.value)}
                    placeholder="e.g. 6874 0718 4986 (12-digit FIN)"
                    className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c2652a] focus:border-[#c2652a] font-mono tracking-wider ${
                      errors.documentNumber ? 'border-rose-400 bg-rose-50/30 text-[#3a302a]' : 'border-[#d8d0c8] bg-white text-[#3a302a]'
                    }`}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleFaydaLookupAndExtract}
                  disabled={isExtractingFayda || data.documentNumber.replace(/\D/g, '').length < 12}
                  className="px-4 py-2.5 bg-[#c2652a] hover:bg-[#e08850] active:bg-[#a65320] text-white text-xs font-bold rounded-lg transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
                >
                  {isExtractingFayda ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Validating…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Validate Number</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#605850] mt-1">
                <span>Enter 12-digit FIN printed on front, or 16-digit FAN on back</span>
                <span className="text-[#605850] font-mono">Encrypted at rest</span>
              </div>

              {errors.documentNumber && (
                <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.documentNumber}</span>
                </p>
              )}

              {faydaExtractError && (
                <p className="text-xs text-rose-600 mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{faydaExtractError}</span>
                </p>
              )}
            </div>

            {/* Validated Format Confirmation Badge */}
            {data.faydaExtractedData && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-[#3a302a]">
                      National Fayda Number Validated ({data.faydaExtractedData.fin})
                    </span>
                    <span className="text-[#605850] text-[11px] block mt-0.5">
                      12-digit national structure authentic. Please upload your physical card scans below for document verification.
                    </span>
                    <span className="text-[#605850] text-[10px] block font-mono mt-0.5">
                      Audit Token: {data.faydaExtractedData.verificationToken}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                  Format Valid
                </span>
              </div>
            )}

            {/* Host Demographic Details Confirmation (Real Data Input) */}
            <div className="p-3.5 rounded-xl border border-[#d8d0c8] bg-[#faf5ee] space-y-2.5 text-xs">
              <span className="font-bold text-[#3a302a] flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#c2652a]" />
                Identity Details (As Printed on Your Fayda Card)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="faydaDobInput" className="block text-[11px] font-semibold text-[#3a302a] mb-1">
                    Date of Birth
                  </label>
                  <input
                    id="faydaDobInput"
                    type="date"
                    value={data.dateOfBirth || ''}
                    onChange={(e) => updateData({ dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-[#d8d0c8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c2652a] focus:border-[#c2652a] bg-white text-[#3a302a]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#3a302a] mb-1">
                    Gender
                  </label>
                  <div className="flex gap-4 items-center h-8">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="hostGender"
                        value="MALE"
                        checked={data.gender === 'MALE'}
                        onChange={() => updateData({ gender: 'MALE' })}
                        className="w-4 h-4 text-[#c2652a] focus:ring-[#c2652a]"
                      />
                      <span className="text-xs text-[#3a302a] font-medium">Male</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="hostGender"
                        value="FEMALE"
                        checked={data.gender === 'FEMALE'}
                        onChange={() => updateData({ gender: 'FEMALE' })}
                        className="w-4 h-4 text-[#c2652a] focus:ring-[#c2652a]"
                      />
                      <span className="text-xs text-[#3a302a] font-medium">Female</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── STANDARD DOCUMENT INPUTS (FOR OTHER DOC TYPES) ── */
          <div className="space-y-4">
            {/* Issuing Country & Authority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="issuingCountry" className="block text-xs font-bold text-[#3a302a]">
                    Issuing Country <span className="text-rose-500">*</span>
                  </label>
                  {selectedDocConfig.allowedCountries?.length === 1 && (
                    <span className="text-[10px] text-[#605850] flex items-center gap-1 font-medium">
                      <Lock className="w-2.5 h-2.5 text-[#605850]" /> Ethiopia Only
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#605850]">
                    <Globe className="w-4 h-4" />
                  </div>
                  <select
                    id="issuingCountry"
                    value={data.issuingCountry}
                    disabled={Boolean(selectedDocConfig.allowedCountries?.length === 1)}
                    onChange={(e) => updateData({ issuingCountry: e.target.value })}
                    className="w-full pl-9 pr-8 py-2.5 text-sm border border-[#d8d0c8] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#c2652a] focus:border-[#c2652a] disabled:bg-[#f2ece4] disabled:text-[#605850] text-[#3a302a] font-medium cursor-pointer"
                  >
                    {SUPPORTED_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.issuingCountry && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.issuingCountry}</span>
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="issuingAuthority" className="block text-xs font-bold text-[#3a302a] mb-1">
                  Issuing Authority / Agency (Optional)
                </label>
                <input
                  id="issuingAuthority"
                  type="text"
                  value={data.issuingAuthority}
                  onChange={(e) => updateData({ issuingAuthority: e.target.value })}
                  placeholder={getIssuingAuthorityPlaceholder(data.documentType)}
                  className="w-full px-3 py-2.5 text-sm border border-[#d8d0c8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c2652a] focus:border-[#c2652a] bg-white text-[#3a302a]"
                />
              </div>
            </div>

            {/* Document Number & Expiration Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="documentNumber" className="block text-xs font-bold text-[#3a302a]">
                    Document Number <span className="text-rose-500">*</span>
                  </label>
                  {isFayda && (
                    <span className="text-[10px] font-mono text-[#c2652a]">
                      {data.documentNumber.replace(/\D/g, '').length} / 12 digits
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#605850]">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <input
                    id="documentNumber"
                    type="text"
                    value={data.documentNumber}
                    onChange={(e) => handleDocumentNumberChange(e.target.value)}
                    placeholder={getDocumentPlaceholder(data.documentType)}
                    className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c2652a] focus:border-[#c2652a] font-mono text-[#3a302a] ${
                      errors.documentNumber ? 'border-rose-400 bg-rose-50/30' : 'border-[#d8d0c8] bg-white'
                    }`}
                    aria-invalid={Boolean(errors.documentNumber)}
                  />
                </div>
                {errors.documentNumber && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.documentNumber}</span>
                  </p>
                )}
                <span className="text-[11px] text-[#605850] block mt-0.5">
                  Encrypted at rest and masked on storage (<span className="font-mono">****-1234</span>) for privacy.
                </span>
              </div>

              <div>
                <label htmlFor="expirationDate" className="block text-xs font-bold text-[#3a302a] mb-1">
                  Expiration Date (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#605850]">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    id="expirationDate"
                    type="date"
                    value={data.expirationDate}
                    onChange={(e) => handleExpirationDateChange(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c2652a] focus:border-[#c2652a] bg-white text-[#3a302a] ${
                      errors.expirationDate ? 'border-rose-400 bg-rose-50/30' : 'border-[#d8d0c8]'
                    }`}
                  />
                </div>
                {errors.expirationDate && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.expirationDate}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Document Upload Section (Front & Back) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-[#3a302a]">
                    Upload Official Document Scans <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-[#605850]">Max 5MB per file • JPEG, PNG, or PDF</span>
                </div>

                <button
                  type="button"
                  onClick={loadDemoIdentityDocument}
                  className="px-2.5 py-1 text-[11px] font-semibold text-[#c2652a] hover:bg-[#faf5ee] border border-[#d8d0c8] rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                  title="Populate a demo government document for evaluation"
                >
                  <Camera className="w-3 h-3 text-[#c2652a]" />
                  <span>Use Demo ID Specimen</span>
                </button>
              </div>

              {/* Front Side Upload */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-[#3a302a] flex items-center gap-1">
                  <span>Front Side (Photo & Personal Details)</span>
                  <span className="text-rose-500">*</span>
                </span>

                {data.fileName ? (
                  <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {data.filePreviewUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewModalUrl(data.filePreviewUrl || null)}
                          className="relative w-12 h-12 rounded-lg overflow-hidden border border-emerald-300 shrink-0 group cursor-pointer bg-white"
                          title="Click to view full preview"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={data.filePreviewUrl}
                            alt="Front document preview"
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                            <Eye className="w-4 h-4" />
                          </div>
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#3a302a] truncate">{data.fileName}</p>
                        <p className="text-[11px] text-emerald-800 font-medium flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {data.fileSize ? `${(data.fileSize / 1024).toFixed(0)} KB · Verified Ready` : 'Attached'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {data.filePreviewUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewModalUrl(data.filePreviewUrl || null)}
                          className="px-2 py-1 text-xs text-[#c2652a] hover:bg-[#faf5ee] rounded-lg font-medium flex items-center gap-1 transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Preview
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => frontInputRef.current?.click()}
                        className="px-2 py-1 text-xs text-[#605850] hover:bg-[#f2ece4] rounded-lg font-medium flex items-center gap-1 transition cursor-pointer"
                        title="Replace with another file"
                      >
                        <RefreshCw className="w-3 h-3" /> Replace
                      </button>
                      <button
                        type="button"
                        onClick={removeFrontFile}
                        className="p-1.5 text-[#605850] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsFrontDragOver(true);
                    }}
                    onDragLeave={() => setIsFrontDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsFrontDragOver(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) handleFrontFileSelected(f);
                    }}
                    onClick={() => frontInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition cursor-pointer ${
                      isFrontDragOver
                        ? 'border-[#c2652a] bg-[#f2ece4]/50'
                        : 'border-[#d8d0c8] hover:border-[#c2652a] bg-[#faf5ee] hover:bg-[#f2ece4]'
                    }`}
                  >
                    <UploadCloud className="w-8 h-8 text-[#605850] mb-2" />
                    <span className="text-xs font-bold text-[#3a302a]">
                      Click to browse or drag Front of document here
                    </span>
                    <span className="text-[11px] text-[#605850] mt-1">
                      Accepted formats: JPEG, PNG, WebP, or PDF (Max 5MB)
                    </span>
                    <input
                      ref={frontInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFrontFileSelected(f);
                      }}
                      className="sr-only"
                    />
                  </div>
                )}

                {frontUploadError && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{frontUploadError}</span>
                  </p>
                )}

                {errors.file && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.file}</span>
                  </p>
                )}
              </div>

              {/* Back Side Upload (For ID Cards) */}
              {requiresBackSide && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#3a302a]">
                      Back Side (Barcode, Address, or Official Stamp)
                    </span>
                    <span className="text-[11px] text-[#605850]">Recommended for ID Cards</span>
                  </div>

                  {data.backFileName ? (
                    <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/40 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {data.backFilePreviewUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewModalUrl(data.backFilePreviewUrl || null)}
                            className="relative w-12 h-12 rounded-lg overflow-hidden border border-emerald-300 shrink-0 group cursor-pointer bg-white"
                            title="Click to view full preview"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={data.backFilePreviewUrl}
                              alt="Back document preview"
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                              <Eye className="w-4 h-4" />
                            </div>
                          </button>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#3a302a] truncate">{data.backFileName}</p>
                          <p className="text-[11px] text-emerald-800 font-medium flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {data.backFileSize ? `${(data.backFileSize / 1024).toFixed(0)} KB · Verified Ready` : 'Attached'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {data.backFilePreviewUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewModalUrl(data.backFilePreviewUrl || null)}
                            className="px-2 py-1 text-xs text-[#c2652a] hover:bg-[#faf5ee] rounded-lg font-medium flex items-center gap-1 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> Preview
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => backInputRef.current?.click()}
                          className="px-2 py-1 text-xs text-[#605850] hover:bg-[#f2ece4] rounded-lg font-medium flex items-center gap-1 transition cursor-pointer"
                          title="Replace with another file"
                        >
                          <RefreshCw className="w-3 h-3" /> Replace
                        </button>
                        <button
                          type="button"
                          onClick={removeBackFile}
                          className="p-1.5 text-[#605850] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsBackDragOver(true);
                      }}
                      onDragLeave={() => setIsBackDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsBackDragOver(false);
                        const f = e.dataTransfer.files?.[0];
                        if (f) handleBackFileSelected(f);
                      }}
                      onClick={() => backInputRef.current?.click()}
                      className={`relative flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl transition cursor-pointer ${
                        isBackDragOver
                          ? 'border-[#c2652a] bg-[#f2ece4]/50'
                          : 'border-[#d8d0c8] hover:border-[#c2652a] bg-[#faf5ee] hover:bg-[#f2ece4]'
                      }`}
                    >
                      <UploadCloud className="w-6 h-6 text-[#605850] mb-1" />
                      <span className="text-xs font-bold text-[#3a302a]">
                        Click to browse or drag Back of document here
                      </span>
                      <span className="text-[11px] text-[#605850] mt-0.5">
                        Helps expedite administrative approval for regional ID cards
                      </span>
                      <input
                        ref={backInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleBackFileSelected(f);
                        }}
                        className="sr-only"
                      />
                    </div>
                  )}

                  {backUploadError && (
                    <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{backUploadError}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

        {/* ── Document Quality & Authenticity Guidelines ── */}
        <div className="p-4 bg-[#faf5ee] border border-[#d8d0c8] rounded-xl space-y-2 text-xs">
          <p className="font-bold text-[#3a302a] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Document Quality & Authenticity Standards</span>
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#605850] pt-1">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>All 4 physical corners must be fully visible</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Portrait photo and legal name clearly legible</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>No flash glare, shadows, or screen captures</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Current, unexpired government-issued document</span>
            </li>
          </ul>
        </div>

        {/* ── Data Protection & Privacy Notice ── */}
        <div className="p-4 rounded-xl bg-[#f2ece4]/50 border border-[#d8d0c8] text-[#3a302a] space-y-2 text-xs">
          <div className="flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-[#c2652a] mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-[#3a302a]">Privacy & Confidential Storage Guarantee</p>
              <p className="text-[#605850] mt-0.5 leading-relaxed text-[11px]">
                In accordance with Ethiopian Personal Data Protection Proclamation No. 1205/2020 and platform
                governance standards, identity document files are encrypted with AES-256 and stored in an
                isolated, zero-public-access security vault. Documents are never exposed to guests or public visitors.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 pt-1 text-[11px] text-[#605850]">
            <Info className="w-4 h-4 text-[#c2652a] mt-0.5 shrink-0" />
            <span>
              Your identity application will be submitted for formal verification by authorized compliance officers.
            </span>
          </div>
        </div>

        {/* ── Navigation Buttons ── */}
        <div className="pt-4 border-t border-[#d8d0c8] flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 border border-[#d8d0c8] hover:bg-[#faf5ee] text-[#3a302a] text-xs font-bold rounded-lg transition cursor-pointer"
          >
            ← Back to Email Verification
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#c2652a] hover:bg-[#e08850] active:bg-[#a65320] text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-2 shadow-xs"
          >
            <span>Continue to Host Details & Address →</span>
          </button>
        </div>
      </form>

      {/* ── High-Resolution Document Preview Modal ── */}
      {previewModalUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-[#faf5ee] border border-[#d8d0c8] rounded-2xl overflow-hidden shadow-2xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#d8d0c8] pb-2">
              <span className="text-xs font-bold text-[#3a302a] flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#c2652a]" />
                Identity Document High-Res Inspection
              </span>
              <button
                type="button"
                onClick={() => setPreviewModalUrl(null)}
                className="p-1 rounded-lg hover:bg-[#f2ece4] text-[#605850] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-[#f2ece4]/60 rounded-xl p-3 border border-[#d8d0c8]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewModalUrl}
                alt="Enlarged document preview"
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-sm"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[#605850]">
                AES-256 encrypted preview · Ensure all details and photo are sharp
              </span>
              <button
                type="button"
                onClick={() => setPreviewModalUrl(null)}
                className="px-4 py-2 bg-[#f2ece4] hover:bg-[#d8d0c8] text-[#3a302a] text-xs font-bold rounded-lg transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
