'use client';

import React, { useState } from 'react';
import {
  Building2,
  User,
  MapPin,
  AlertCircle,
  FileBadge,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import {
  ETHIOPIAN_REGIONS,
  ADDIS_ABABA_SUBCITIES,
  type OnboardingFormData,
} from './types';

interface Step4HostDetailsProps {
  data: OnboardingFormData;
  updateData: (fields: Partial<OnboardingFormData>) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function Step4HostDetails({
  data,
  updateData,
  onBack,
  onContinue,
}: Step4HostDetailsProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!data.displayName.trim() || data.displayName.trim().length < 2) {
      newErrors.displayName = 'Host display name must be at least 2 characters long.';
    }

    if (data.hostType === 'BUSINESS') {
      if (!data.businessName.trim()) {
        newErrors.businessName = 'Registered business or corporate name is required.';
      }
      if (!data.businessTin.trim() || !/^\d{10}$/.test(data.businessTin.trim())) {
        newErrors.businessTin = 'Tax Identification Number (TIN) must be exactly 10 digits.';
      }
      if (!data.businessRegistrationNumber.trim()) {
        newErrors.businessRegistrationNumber = 'Business registration / commercial license number is required.';
      }
    }

    if (!data.region.trim()) {
      newErrors.region = 'Please select a region.';
    }

    if (!data.city.trim()) {
      newErrors.city = 'Please enter your city.';
    }

    if (!data.streetAddress.trim()) {
      newErrors.streetAddress = 'Please enter your physical street address or area description.';
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
          Host Profile & Operating Address
        </h2>
        <p className="text-xs text-slate-600 mt-1">
          Define how guests see your hosting profile and provide your primary operating address.
        </p>
      </div>

      {data.faydaExtractedData && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Operating address pre-populated from your verified <strong>National Fayda ID ({data.faydaExtractedData.fin})</strong>.
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
            NIDP Sync
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Host Type Selector: Individual vs Business */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            Host Registration Type <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                updateData({ hostType: 'INDIVIDUAL' });
                setErrors((prev) => ({
                  ...prev,
                  businessName: '',
                  businessTin: '',
                  businessRegistrationNumber: '',
                }));
              }}
              className={`p-4 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                data.hostType === 'INDIVIDUAL'
                  ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-100'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  data.hostType === 'INDIVIDUAL' ? 'bg-[#1e40af] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-900">Individual Host</span>
                <span className="block text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Private homeowner, resident, or personal property owner.
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => updateData({ hostType: 'BUSINESS' })}
              className={`p-4 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                data.hostType === 'BUSINESS'
                  ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-100'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  data.hostType === 'BUSINESS' ? 'bg-[#1e40af] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-900">Corporate / Business Host</span>
                <span className="block text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Registered real estate firm, hospitality company, or commercial property manager.
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label htmlFor="displayName" className="block text-xs font-bold text-slate-700 mb-1">
            Host Public Display Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="displayName"
            type="text"
            value={data.displayName}
            onChange={(e) => updateData({ displayName: e.target.value })}
            placeholder={data.hostType === 'BUSINESS' ? 'e.g. Bole Luxury Residences PLC' : 'e.g. Almaz Boutique Stays'}
            className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
              errors.displayName ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300 bg-white'
            }`}
          />
          {errors.displayName && (
            <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.displayName}</span>
            </p>
          )}
          <span className="text-[11px] text-slate-500 block mt-0.5">
            This name appears publicly on your property listings and host profile.
          </span>
        </div>

        {/* Conditional Business Details (Only for Business Host) */}
        {data.hostType === 'BUSINESS' && (
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 border-b border-blue-200 pb-2">
              <Building2 className="w-4 h-4 text-blue-700" />
              <span>Commercial Registration & Tax Details</span>
            </div>

            <div>
              <label htmlFor="businessName" className="block text-xs font-bold text-slate-700 mb-1">
                Registered Company Legal Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="businessName"
                type="text"
                value={data.businessName}
                onChange={(e) => updateData({ businessName: e.target.value })}
                placeholder="e.g. Addis Luxury Stays Share Company"
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white ${
                  errors.businessName ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                }`}
              />
              {errors.businessName && (
                <p className="text-xs text-rose-600 mt-1">{errors.businessName}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="businessTin" className="block text-xs font-bold text-slate-700 mb-1">
                  Tax Identification Number (TIN) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <FileBadge className="w-4 h-4" />
                  </div>
                  <input
                    id="businessTin"
                    type="text"
                    maxLength={10}
                    value={data.businessTin}
                    onChange={(e) => updateData({ businessTin: e.target.value.replace(/[^\d]/g, '') })}
                    placeholder="10-digit TIN"
                    className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white font-mono ${
                      errors.businessTin ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                    }`}
                  />
                </div>
                {errors.businessTin && (
                  <p className="text-xs text-rose-600 mt-1">{errors.businessTin}</p>
                )}
              </div>

              <div>
                <label htmlFor="businessRegistrationNumber" className="block text-xs font-bold text-slate-700 mb-1">
                  Commercial Registration No. <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <input
                    id="businessRegistrationNumber"
                    type="text"
                    value={data.businessRegistrationNumber}
                    onChange={(e) => updateData({ businessRegistrationNumber: e.target.value })}
                    placeholder="e.g. BL/AA/12345/2016"
                    className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white font-mono ${
                      errors.businessRegistrationNumber ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                    }`}
                  />
                </div>
                {errors.businessRegistrationNumber && (
                  <p className="text-xs text-rose-600 mt-1">{errors.businessRegistrationNumber}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Operating Address (Using Ethiopian Location Hierarchy) */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 border-b border-slate-200 pb-2">
            <MapPin className="w-4 h-4 text-[#1e40af]" />
            <span>Residential / Operating Address</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="region" className="block text-xs font-bold text-slate-700 mb-1">
                Region <span className="text-rose-500">*</span>
              </label>
              <select
                id="region"
                value={data.region}
                onChange={(e) => updateData({ region: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {ETHIOPIAN_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="city" className="block text-xs font-bold text-slate-700 mb-1">
                City / Town <span className="text-rose-500">*</span>
              </label>
              <input
                id="city"
                type="text"
                value={data.city}
                onChange={(e) => updateData({ city: e.target.value })}
                placeholder="e.g. Addis Ababa"
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                  errors.city ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                }`}
              />
              {errors.city && <p className="text-xs text-rose-600 mt-1">{errors.city}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="subCity" className="block text-xs font-bold text-slate-700 mb-1">
                Sub-City / Zone
              </label>
              {data.region === 'Addis Ababa' ? (
                <select
                  id="subCity"
                  value={data.subCity}
                  onChange={(e) => updateData({ subCity: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {ADDIS_ABABA_SUBCITIES.map((sc) => (
                    <option key={sc} value={sc}>
                      {sc} Sub-City
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="subCity"
                  type="text"
                  value={data.subCity}
                  onChange={(e) => updateData({ subCity: e.target.value })}
                  placeholder="e.g. East Shewa / Kirkos"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              )}
            </div>

            <div>
              <label htmlFor="woreda" className="block text-xs font-bold text-slate-700 mb-1">
                Woreda / Kebele / Neighborhood
              </label>
              <input
                id="woreda"
                type="text"
                value={data.woreda}
                onChange={(e) => updateData({ woreda: e.target.value })}
                placeholder="e.g. Woreda 03 / Medhanealem"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label htmlFor="streetAddress" className="block text-xs font-bold text-slate-700 mb-1">
              Physical Street Address / Landmark <span className="text-rose-500">*</span>
            </label>
            <input
              id="streetAddress"
              type="text"
              value={data.streetAddress}
              onChange={(e) => updateData({ streetAddress: e.target.value })}
              placeholder="e.g. Cameroon St, Near Edna Mall, House #402"
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                errors.streetAddress ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
              }`}
            />
            {errors.streetAddress && (
              <p className="text-xs text-rose-600 mt-1">{errors.streetAddress}</p>
            )}
          </div>
        </div>

        {/* Host Bio */}
        <div>
          <label htmlFor="bio" className="block text-xs font-bold text-slate-700 mb-1">
            Host Bio & Hospitality Description
          </label>
          <textarea
            id="bio"
            rows={3}
            value={data.bio}
            onChange={(e) => updateData({ bio: e.target.value })}
            placeholder="Tell guests about yourself, your hospitality background, and what makes your stays memorable…"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
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
            Continue to Review & Submit →
          </button>
        </div>
      </form>
    </div>
  );
}
