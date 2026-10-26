'use client';

import React, { useState } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Globe,
  Lock,
  Calendar,
  X,
} from 'lucide-react';
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

export default function Step3IdentityVerification({
  data,
  updateData,
  onBack,
  onContinue,
}: Step3IdentityVerificationProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  const selectedDocConfig = SUPPORTED_DOCUMENT_TYPES.find(
    (d) => d.value === data.documentType,
  ) || SUPPORTED_DOCUMENT_TYPES[0];

  const handleDocumentTypeChange = (type: IdentityDocumentType) => {
    const docConfig = SUPPORTED_DOCUMENT_TYPES.find((d) => d.value === type);
    const newCountry = docConfig?.defaultCountry || 'ET';
    updateData({
      documentType: type,
      issuingCountry: newCountry,
    });
    setErrors((prev) => ({ ...prev, documentType: '', issuingCountry: '' }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate mime-type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Invalid document format. Please upload JPEG, PNG, or PDF.');
      return;
    }

    // Validate file size (max 5MB)
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(
        `Document size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the maximum allowed 5MB limit.`,
      );
      return;
    }

    updateData({
      fileName: file.name,
      fileSize: file.size,
      fileValidated: true,
    });
  };

  const removeFile = () => {
    updateData({
      fileName: null,
      fileSize: null,
      fileValidated: false,
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!data.documentNumber.trim() || data.documentNumber.trim().length < 4) {
      newErrors.documentNumber = 'Please enter a valid document identification number.';
    }

    if (!data.issuingCountry) {
      newErrors.issuingCountry = 'Please select the issuing country.';
    }

    if (
      (data.documentType === 'ETHIOPIAN_KEBELE_ID' ||
        data.documentType === 'ETHIOPIAN_FAYDA_ID') &&
      data.issuingCountry !== 'ET'
    ) {
      newErrors.issuingCountry = 'Ethiopian National IDs must specify Ethiopia as issuing country.';
    }

    if (!data.fileValidated && !data.fileName) {
      newErrors.file = 'Please upload a legible copy of your selected identity document.';
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
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Government Identity Verification
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          ENGIDA supports eligible Ethiopian citizens, residents, and verified international hosts.
          Government ID verification is required prior to public listing publication.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Document Type Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
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
                      ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-200'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="documentType"
                    value={doc.value}
                    checked={isSelected}
                    onChange={() => handleDocumentTypeChange(doc.value)}
                    className="mt-1 w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-600 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className="block text-xs font-bold text-slate-900">{doc.label}</span>
                    <span className="block text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {doc.description}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Issuing Country & Authority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="issuingCountry" className="block text-xs font-bold text-slate-700 mb-1">
              Issuing Country <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Globe className="w-4 h-4" />
              </div>
              <select
                id="issuingCountry"
                value={data.issuingCountry}
                disabled={Boolean(selectedDocConfig.allowedCountries?.length === 1)}
                onChange={(e) => updateData({ issuingCountry: e.target.value })}
                className="w-full pl-9 pr-8 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-600"
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
            <label htmlFor="issuingAuthority" className="block text-xs font-bold text-slate-700 mb-1">
              Issuing Authority / Agency (Optional)
            </label>
            <input
              id="issuingAuthority"
              type="text"
              value={data.issuingAuthority}
              onChange={(e) => updateData({ issuingAuthority: e.target.value })}
              placeholder="e.g. Addis Ababa Sub-City / ICS / NIDP"
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {/* Document Number & Expiration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="documentNumber" className="block text-xs font-bold text-slate-700 mb-1">
              Document Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <FileText className="w-4 h-4" />
              </div>
              <input
                id="documentNumber"
                type="text"
                value={data.documentNumber}
                onChange={(e) => updateData({ documentNumber: e.target.value })}
                placeholder="e.g. ETH-10293847"
                className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono ${
                  errors.documentNumber ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300 bg-white'
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
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Encrypted and masked on storage for privacy.
            </span>
          </div>

          <div>
            <label htmlFor="expirationDate" className="block text-xs font-bold text-slate-700 mb-1">
              Expiration Date (Optional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                id="expirationDate"
                type="date"
                value={data.expirationDate}
                onChange={(e) => updateData({ expirationDate: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Document File Attachment / Upload Area */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Upload Document Scan / Photo <span className="text-rose-500">*</span>
          </label>

          {data.fileName ? (
            <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 line-clamp-1">{data.fileName}</p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {data.fileSize ? `${(data.fileSize / 1024).toFixed(0)} KB · Validated format` : 'Attached'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                title="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl bg-slate-50/50 hover:bg-blue-50/20 transition cursor-pointer">
              <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
              <span className="text-xs font-bold text-slate-800">
                Click to browse or drag document file here
              </span>
              <span className="text-[11px] text-slate-500 mt-1">
                Accepted formats: JPEG, PNG, or PDF (Max 5MB)
              </span>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={handleFileUpload}
                className="sr-only"
              />
            </label>
          )}

          {uploadError && (
            <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{uploadError}</span>
            </p>
          )}

          {errors.file && (
            <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.file}</span>
            </p>
          )}
        </div>

        {/* Data Protection & Privacy Notice */}
        <div className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 text-slate-700 space-y-2 text-xs">
          <div className="flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-slate-900">Privacy & Secure Compliance Storage</p>
              <p className="text-slate-600 mt-0.5 leading-relaxed">
                National identity documents are treated as confidential. In accordance with platform privacy
                standards, private identity images are strictly sequestered and never stored in public listing buckets
                or exposed via public API endpoints.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 pt-1 text-[11px] text-slate-500">
            <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <span>
              Automated biometric liveness provider is unconfigured in this environment. Your submission will be routed
              to authorized administrative compliance officers for manual verification.
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
          >
            ← Back
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#1e40af] hover:bg-[#1e3a8a] text-white text-xs font-bold rounded-lg transition cursor-pointer"
          >
            Continue to Host Details & Address →
          </button>
        </div>
      </form>
    </div>
  );
}
