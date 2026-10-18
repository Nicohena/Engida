'use client';

import React, { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import type { HostProfile, PayoutProvider } from '@/types/host';
import {
  User,
  Phone,
  FileText,
  Building2,
  Landmark,
  Smartphone,
  Globe,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Lock,
  ChevronDown,
  Info,
} from 'lucide-react';

interface HostProfileForm {
  displayName: string;
  phone: string;
  bio: string;
  payoutProvider: PayoutProvider | '';
  payoutAccountName: string;
  payoutAccountNumber: string;
  payoutPhone: string;
  payoutBankBranch: string;
  payoutSwiftBic: string;
  payoutEmail: string;
  payoutCurrency: string;
}

const EMPTY_FORM: HostProfileForm = {
  displayName: '',
  phone: '',
  bio: '',
  payoutProvider: 'TELEBIRR',
  payoutAccountName: '',
  payoutAccountNumber: '',
  payoutPhone: '',
  payoutBankBranch: '',
  payoutSwiftBic: '',
  payoutEmail: '',
  payoutCurrency: 'ETB',
};

// Payment Provider options categorized
interface ProviderOption {
  id: PayoutProvider;
  name: string;
  category: 'local' | 'fintech' | 'international';
  badge: string;
  description: string;
  currency: string;
}

const PAYOUT_PROVIDERS: ProviderOption[] = [
  // Ethiopian Local
  {
    id: 'TELEBIRR',
    name: 'Telebirr',
    category: 'local',
    badge: 'Mobile Money',
    description: 'Instant mobile wallet payout via Ethio Telecom Telebirr',
    currency: 'ETB',
  },
  {
    id: 'CBE',
    name: 'Commercial Bank of Ethiopia (CBE)',
    category: 'local',
    badge: 'Direct Bank Transfer',
    description: 'Direct deposit into your CBE Birr or standard account',
    currency: 'ETB',
  },
  {
    id: 'AWASH',
    name: 'Awash Bank',
    category: 'local',
    badge: 'Commercial Bank',
    description: 'Direct wire to your Awash Bank savings or checking account',
    currency: 'ETB',
  },
  {
    id: 'DASHEN',
    name: 'Dashen Bank / Amole',
    category: 'local',
    badge: 'Bank & Wallet',
    description: 'Direct transfer to Dashen Bank account or Amole wallet',
    currency: 'ETB',
  },
  {
    id: 'ABYSSINIA',
    name: 'Bank of Abyssinia (BoA)',
    category: 'local',
    badge: 'Commercial Bank',
    description: 'Direct transfer to Bank of Abyssinia account',
    currency: 'ETB',
  },
  // Fintech Gateway
  {
    id: 'CHAPA',
    name: 'Chapa Direct Settlement',
    category: 'fintech',
    badge: 'Payment Gateway',
    description: 'Unified gateway payout supporting cards, telebirr, and cross-border wallets',
    currency: 'ETB / Multi-Currency',
  },
  // International & Diaspora
  {
    id: 'INTERNATIONAL_SWIFT',
    name: 'International SWIFT Wire Transfer',
    category: 'international',
    badge: 'Global Bank Wire',
    description: 'Cross-border wire to international banks via SWIFT/BIC code',
    currency: 'USD / EUR / GBP / ETB',
  },
  {
    id: 'PAYPAL',
    name: 'PayPal',
    category: 'international',
    badge: 'Global Wallet',
    description: 'Instant transfer to your international PayPal balance',
    currency: 'USD / EUR / GBP',
  },
  {
    id: 'WISE',
    name: 'Wise (TransferWise)',
    category: 'international',
    badge: 'Low-Fee Wire',
    description: 'Direct payout via Wise multi-currency account',
    currency: 'USD / EUR / GBP',
  },
];

export default function HostProfilePage() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState<HostProfile | null>(null);
  const [form, setForm] = useState<HostProfileForm>(EMPTY_FORM);
  const [activeCategory, setActiveCategory] = useState<'local' | 'fintech' | 'international'>('local');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sync profile data into form state
  const syncProfileToForm = (data: HostProfile) => {
    setProfile(data);
    const provider = data.payoutProvider || 'TELEBIRR';
    const found = PAYOUT_PROVIDERS.find((p) => p.id === provider);
    if (found) {
      setActiveCategory(found.category);
    }

    setForm({
      displayName: data.displayName ?? '',
      phone: data.phone ?? '',
      bio: data.bio ?? '',
      payoutProvider: provider,
      payoutAccountName: data.payoutAccountName ?? '',
      payoutAccountNumber: data.payoutAccountNumber ?? '',
      payoutPhone: data.payoutPhone ?? '',
      payoutBankBranch: data.payoutBankBranch ?? '',
      payoutSwiftBic: data.payoutSwiftBic ?? '',
      payoutEmail: data.payoutEmail ?? '',
      payoutCurrency: data.payoutCurrency ?? (found?.currency.includes('USD') ? 'USD' : 'ETB'),
    });
  };

  const loadProfile = useCallback(async () => {
    try {
      const data = await apiFetch<HostProfile>('/host/profile');
      syncProfileToForm(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load your host profile.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    // Dynamic field validation depending on selected provider
    if (form.payoutProvider === 'TELEBIRR' && !form.payoutPhone.trim()) {
      setError('Please provide your Telebirr registered phone number.');
      setSaving(false);
      return;
    }

    if (
      ['CBE', 'AWASH', 'DASHEN', 'ABYSSINIA'].includes(form.payoutProvider) &&
      (!form.payoutAccountNumber.trim() || !form.payoutAccountName.trim())
    ) {
      setError('Please provide both the bank account number and account holder name.');
      setSaving(false);
      return;
    }

    if (
      form.payoutProvider === 'INTERNATIONAL_SWIFT' &&
      (!form.payoutAccountNumber.trim() || !form.payoutSwiftBic.trim())
    ) {
      setError('International SWIFT transfers require both an Account/IBAN and a SWIFT/BIC code.');
      setSaving(false);
      return;
    }

    if (
      ['PAYPAL', 'WISE'].includes(form.payoutProvider) &&
      !form.payoutEmail.trim()
    ) {
      setError(`Please provide your registered ${form.payoutProvider === 'PAYPAL' ? 'PayPal' : 'Wise'} email address.`);
      setSaving(false);
      return;
    }

    try {
      const updated = await apiFetch<HostProfile>('/host/profile', {
        method: 'PUT',
        body: JSON.stringify({
          displayName: form.displayName.trim(),
          phone: form.phone.trim() || null,
          bio: form.bio.trim() || null,
          payoutProvider: form.payoutProvider || null,
          payoutAccountName: form.payoutAccountName.trim() || null,
          payoutAccountNumber: form.payoutAccountNumber.trim() || null,
          payoutPhone: form.payoutPhone.trim() || null,
          payoutBankBranch: form.payoutBankBranch.trim() || null,
          payoutSwiftBic: form.payoutSwiftBic.trim() || null,
          payoutEmail: form.payoutEmail.trim() || null,
          payoutCurrency: form.payoutCurrency || 'ETB',
        }),
      });

      syncProfileToForm(updated);
      await refreshUser();
      setSuccess('Your host profile and payout settings have been saved successfully.');
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to update your host profile.',
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedProviderMeta = PAYOUT_PROVIDERS.find(
    (p) => p.id === form.payoutProvider,
  );

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#1e40af] text-xs font-black uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Host Account & Financial Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Host Profile & Settlement Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Manage your public host identity and configure where your rental reservation earnings are disbursed.
          </p>
        </div>

        {profile && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold text-slate-500">Status:</span>
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                profile.verificationStatus === 'VERIFIED'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {profile.verificationStatus}
            </span>
          </div>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 text-xs sm:text-sm font-medium animate-in fade-in"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-center gap-3 p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs sm:text-sm font-medium animate-in fade-in"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="flex-1">{success}</span>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 text-sm">
          <RotateCcw className="w-6 h-6 animate-spin mx-auto text-[#1e40af] mb-3" />
          Loading your host profile & banking configuration...
        </div>
      ) : profile ? (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Card 1: Public Host Identity */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1e40af] flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">Public Host Identity</h2>
                <p className="text-xs text-slate-500">
                  Information displayed on your published listings and visible to prospective guests.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="displayName"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Host Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={form.displayName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, displayName: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-[#1e40af] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Contact Phone (Public Stays)
                </label>
                <input
                  id="phone"
                  type="tel"
                  maxLength={50}
                  value={form.phone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="+251 91 123 4567"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-[#1e40af] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-1.5">
                  <label
                    htmlFor="bio"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Host Bio & Hospitality Note
                  </label>
                  <span className="text-[11px] font-bold text-slate-400">
                    {form.bio.length} / 500 characters
                  </span>
                </div>
                <textarea
                  id="bio"
                  rows={4}
                  maxLength={500}
                  value={form.bio}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  placeholder="Tell guests about yourself, your hospitality experience, and what makes your stays unique..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs sm:text-sm text-slate-800 focus:border-[#1e40af] focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-y"
                />
              </div>
            </div>
          </section>

          {/* Card 2: Payout & Financial Settlement Accounts (The Core Request) */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-50 to-teal-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>Payout & Settlement Method</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                      Disbursements
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Select how you would like to receive reservation payouts for your properties.
                  </p>
                </div>
              </div>

              {/* Active Payout Indicator */}
              {selectedProviderMeta && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Configured: {selectedProviderMeta.name}</span>
                </div>
              )}
            </div>

            {/* Category Navigation Pills */}
            <div className="flex flex-wrap gap-2 p-1.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setActiveCategory('local')}
                className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black transition cursor-pointer ${
                  activeCategory === 'local'
                    ? 'bg-white text-[#1e40af] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>Ethiopian Accounts</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('fintech')}
                className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black transition cursor-pointer ${
                  activeCategory === 'fintech'
                    ? 'bg-white text-[#1e40af] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>Chapa Gateway</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCategory('international')}
                className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black transition cursor-pointer ${
                  activeCategory === 'international'
                    ? 'bg-white text-[#1e40af] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="w-4 h-4 text-purple-600" />
                <span>International & Diaspora</span>
              </button>
            </div>

            {/* Provider Grid Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PAYOUT_PROVIDERS.filter((p) => p.category === activeCategory).map(
                (provider) => {
                  const isSelected = form.payoutProvider === provider.id;
                  return (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          payoutProvider: provider.id,
                          payoutCurrency: provider.currency.includes('USD')
                            ? 'USD'
                            : 'ETB',
                        }))
                      }
                      className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'border-[#1e40af] bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {provider.badge}
                          </span>
                          <span
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-[#1e40af] bg-[#1e40af]'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </span>
                        </div>
                        <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                          {provider.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                          {provider.description}
                        </p>
                      </div>

                      <div className="text-[10px] font-bold text-slate-400">
                        Default Currency: <span className="font-extrabold text-slate-700">{provider.currency}</span>
                      </div>
                    </button>
                  );
                },
              )}
            </div>

            {/* Dynamic Provider Input Fields */}
            {selectedProviderMeta && (
              <div className="p-5 sm:p-6 rounded-xl bg-slate-50/70 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Enter {selectedProviderMeta.name} Account Credentials</span>
                  </h3>
                  <span className="text-xs font-bold text-[#1e40af]">
                    Payout Currency: {form.payoutCurrency}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Account / Beneficiary Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Account Holder / Beneficiary Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.payoutAccountName}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          payoutAccountName: e.target.value,
                        }))
                      }
                      placeholder="e.g. Habtamu Shewamene"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-[#1e40af] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Provider Specific Inputs */}
                  {/* 1. Telebirr */}
                  {form.payoutProvider === 'TELEBIRR' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Registered Telebirr Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={form.payoutPhone}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            payoutPhone: e.target.value,
                          }))
                        }
                        placeholder="+251 91 123 4567"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-[#1e40af] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  )}

                  {/* 2. Ethiopian Banks (CBE, Awash, Dashen, BoA) */}
                  {['CBE', 'AWASH', 'DASHEN', 'ABYSSINIA'].includes(
                    form.payoutProvider,
                  ) && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Bank Account Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={form.payoutAccountNumber}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              payoutAccountNumber: e.target.value,
                            }))
                          }
                          placeholder={
                            form.payoutProvider === 'CBE'
                              ? 'e.g. 1000289182910'
                              : 'Account Number'
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-[#1e40af] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Branch Name / City
                        </label>
                        <input
                          type="text"
                          value={form.payoutBankBranch}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              payoutBankBranch: e.target.value,
                            }))
                          }
                          placeholder="e.g. Bole Medhanialem Branch, Addis Ababa"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-[#1e40af] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </>
                  )}

                  {/* 3. Chapa Gateway */}
                  {form.payoutProvider === 'CHAPA' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Chapa Registered Phone / Subaccount ID *
                        </label>
                        <input
                          type="text"
                          required
                          value={form.payoutAccountNumber || form.payoutPhone}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              payoutAccountNumber: e.target.value,
                              payoutPhone: e.target.value,
                            }))
                          }
                          placeholder="e.g. +251 9... or SUB_ACCT_xxxx"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-[#1e40af] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Chapa Business / Merchant Name
                        </label>
                        <input
                          type="text"
                          value={form.payoutBankBranch}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              payoutBankBranch: e.target.value,
                            }))
                          }
                          placeholder="e.g. Engida Host Partner"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-[#1e40af] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </>
                  )}

                  {/* 4. International SWIFT Wire */}
                  {form.payoutProvider === 'INTERNATIONAL_SWIFT' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          IBAN / International Account Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={form.payoutAccountNumber}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              payoutAccountNumber: e.target.value,
                            }))
                          }
                          placeholder="e.g. GB29 XXXXXX or US89 XXXXXX"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-[#1e40af] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          SWIFT / BIC Code *
                        </label>
                        <input
                          type="text"
                          required
                          value={form.payoutSwiftBic}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              payoutSwiftBic: e.target.value.toUpperCase(),
                            }))
                          }
                          placeholder="e.g. CBETETAA or CHASUS33"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-[#1e40af] focus:outline-none focus:ring-2 focus:ring-blue-500/20 uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Bank Name & Country
                        </label>
                        <input
                          type="text"
                          value={form.payoutBankBranch}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              payoutBankBranch: e.target.value,
                            }))
                          }
                          placeholder="e.g. Chase Bank, United States"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-[#1e40af] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </>
                  )}

                  {/* 5. PayPal & Wise */}
                  {['PAYPAL', 'WISE'].includes(form.payoutProvider) && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Registered {form.payoutProvider === 'PAYPAL' ? 'PayPal' : 'Wise'} Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={form.payoutEmail}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            payoutEmail: e.target.value,
                          }))
                        }
                        placeholder="your-account@domain.com"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:border-[#1e40af] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  )}

                  {/* Currency Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Settlement Currency
                    </label>
                    <select
                      value={form.payoutCurrency}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          payoutCurrency: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-800 focus:border-[#1e40af] focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    >
                      <option value="ETB">ETB - Ethiopian Birr</option>
                      <option value="USD">USD - United States Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-2 text-[11px] text-slate-500">
                  <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Your financial credentials are encrypted and stored securely. Payouts are initiated within 24 hours after guest check-in.
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* Form Actions */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => profile && syncProfileToForm(profile)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs sm:text-sm font-bold text-slate-700 transition cursor-pointer disabled:opacity-50"
            >
              Reset Changes
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#1e40af] to-[#2563eb] hover:from-[#1e3a8a] hover:to-[#1d4ed8] text-white text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Saving Settings...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Save Profile & Payout Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center max-w-md mx-auto">
          <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-lg font-black text-slate-900">Host Profile Unavailable</h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-500">
            We could not load the host profile connected to your account.
          </p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError(null);
              void loadProfile();
            }}
            className="mt-6 px-5 py-2.5 rounded-xl bg-[#1e40af] text-white text-xs font-bold"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
