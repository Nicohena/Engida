'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Calendar,
  Check,
  CreditCard,
  Globe2,
  Info,
  Lock,
  RefreshCw,
  Save,
  ShieldAlert,
  Sliders,
  Undo2,
} from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import {
  FormattedSetting,
  SettingCategory,
  SettingsResponse,
} from '../../../types/admin-system';

interface TabConfig {
  id: SettingCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const TABS: TabConfig[] = [
  {
    id: 'GENERAL',
    label: 'General & Maintenance',
    icon: Sliders,
    description: 'Platform operational status, maintenance mode, and broadcast banners.',
  },
  {
    id: 'BOOKINGS',
    label: 'Booking Rules',
    icon: Calendar,
    description: 'Check-in/out hours, lead time policies, and advance calendar limits.',
  },
  {
    id: 'FINANCE',
    label: 'Financial & Escrow',
    icon: CreditCard,
    description: 'Marketplace take-rate commissions, VAT/tax parameters, and payout cutoffs.',
  },
  {
    id: 'LOCALIZATION',
    label: 'Regional & Currencies',
    icon: Globe2,
    description: 'Default Ethiopian Birr standards, multi-currency support, and Addis Ababa timezone.',
  },
  {
    id: 'NOTIFICATIONS',
    label: 'Communications',
    icon: Bell,
    description: 'Transactional SMS channels, email receipt relays, and support addresses.',
  },
  {
    id: 'SECURITY',
    label: 'Security & Access',
    icon: Lock,
    description: 'Administrative session timeouts, login backoff thresholds, and audit rules.',
  },
];

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingCategory>('GENERAL');
  const [settings, setSettings] = useState<FormattedSetting[]>([]);
  const [grouped, setGrouped] = useState<Record<SettingCategory, FormattedSetting[]> | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [initialValues, setInitialValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<SettingsResponse>('/admin/settings');
      setSettings(res.settings);
      setGrouped(res.grouped);

      const map: Record<string, any> = {};
      for (const s of res.settings) {
        map[s.key] = s.value;
      }
      setFormValues(map);
      setInitialValues(map);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch platform configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const hasDirtyChanges = Object.keys(formValues).some(
    (key) => JSON.stringify(formValues[key]) !== JSON.stringify(initialValues[key]),
  );

  const handleFieldChange = (key: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleDiscard = () => {
    setFormValues(initialValues);
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    const diff: Record<string, any> = {};
    for (const key of Object.keys(formValues)) {
      if (JSON.stringify(formValues[key]) !== JSON.stringify(initialValues[key])) {
        diff[key] = formValues[key];
      }
    }

    if (Object.keys(diff).length === 0) {
      setSaving(false);
      return;
    }

    try {
      await apiFetch('/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(diff),
      });
      setSuccessMessage('Platform parameters successfully updated and audit-logged.');
      await fetchSettings();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save configuration settings');
    } finally {
      setSaving(false);
    }
  };

  const isMaintenanceActive = Boolean(formValues['maintenance.enabled']);

  return (
    <div className="space-y-8 pb-20">
      {/* Page Header */}
      <AdminPageHeader
        title="Platform Settings & Rules"
        description="Centralized platform configuration, global booking rules, financial commission take-rates, and system parameters."
        actions={
          <button
            type="button"
            onClick={fetchSettings}
            disabled={loading}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#d8d0c8] bg-white text-[#605850] shadow-sm transition hover:bg-[#eae2da] hover:text-[#3a302a]"
            title="Reload settings"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-[#b3541e]' : ''}`} />
          </button>
        }
      />

      {/* Maintenance Mode Emergency Alert Banner */}
      {isMaintenanceActive && (
        <div className="flex items-start gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="text-xs">
            <p className="font-bold">Marketplace Maintenance Mode is Currently ACTIVE</p>
            <p className="mt-0.5 text-amber-800">
              Public search, checkout quotes, and host reservations are temporarily disabled.
              Visitors see the scheduled maintenance banner message.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-[#d47070] bg-[#fdf2f2] p-4 text-xs font-semibold text-[#8c3c3c]">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
          <Check className="h-4 w-4 text-emerald-600" />
          {successMessage}
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#d8d0c8] pb-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-150 ${
                active
                  ? 'bg-[#b3541e] text-white shadow-sm'
                  : 'text-[#605850] hover:bg-[#eae2da] hover:text-[#3a302a]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Category Section Description */}
      <div className="rounded-xl border border-[#d8d0c8] bg-white p-4">
        <p className="text-xs text-[#78706a]">
          {TABS.find((t) => t.id === activeTab)?.description}
        </p>
      </div>

      {/* Form Fields for Active Category */}
      <div className="divide-y divide-[#f2ece4] rounded-2xl border border-[#d8d0c8] bg-white shadow-[0_12px_28px_-20px_rgba(58,48,42,0.15)]">
        {grouped && grouped[activeTab] && grouped[activeTab].length > 0 ? (
          grouped[activeTab].map((setting) => {
            const currentVal = formValues[setting.key];
            return (
              <div
                key={setting.key}
                className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-headline text-base font-semibold text-[#3a302a]">
                      {setting.key.split('.').slice(1).join(' ').replace(/_/g, ' ')}
                    </span>
                    {setting.isPublic && (
                      <span className="rounded-md bg-[#f6f0e8] px-1.5 py-0.5 text-[10px] font-bold text-[#b3541e]">
                        Public
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#78706a]">
                    {setting.description || 'Configurable operational threshold.'}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-[#9a9088]">{setting.key}</p>
                </div>

                <div className="w-full sm:w-80">
                  {/* Boolean Switch Toggle */}
                  {setting.type === 'boolean' ? (
                    <button
                      type="button"
                      onClick={() => handleFieldChange(setting.key, !currentVal)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                        currentVal ? 'bg-[#b3541e]' : 'bg-[#d8d0c8]'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${
                          currentVal ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  ) : setting.type === 'number' ? (
                    <input
                      type="number"
                      value={currentVal !== undefined ? currentVal : ''}
                      onChange={(e) => handleFieldChange(setting.key, Number(e.target.value))}
                      className="w-full rounded-xl border border-[#d8d0c8] bg-[#faf5ee] px-3.5 py-2 text-xs font-semibold text-[#3a302a] focus:border-[#b3541e] focus:bg-white focus:outline-none"
                    />
                  ) : setting.key.includes('message') ? (
                    <textarea
                      rows={2}
                      value={currentVal || ''}
                      onChange={(e) => handleFieldChange(setting.key, e.target.value)}
                      className="w-full rounded-xl border border-[#d8d0c8] bg-[#faf5ee] p-3 text-xs text-[#3a302a] focus:border-[#b3541e] focus:bg-white focus:outline-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={
                        typeof currentVal === 'object'
                          ? JSON.stringify(currentVal)
                          : currentVal || ''
                      }
                      onChange={(e) => handleFieldChange(setting.key, e.target.value)}
                      className="w-full rounded-xl border border-[#d8d0c8] bg-[#faf5ee] px-3.5 py-2 text-xs font-semibold text-[#3a302a] focus:border-[#b3541e] focus:bg-white focus:outline-none"
                    />
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-xs text-[#78706a]">
            {loading ? 'Loading settings...' : 'No parameters registered in this category.'}
          </div>
        )}
      </div>

      {/* Sticky Bottom Unsaved Changes Floating Bar */}
      {hasDirtyChanges && (
        <div className="fixed bottom-6 left-1/2 z-50 flex w-[92vw] max-w-2xl -translate-x-1/2 items-center justify-between rounded-2xl border border-[#b3541e]/50 bg-[#3a302a] p-4 text-[#faf5ee] shadow-[0_20px_60px_-20px_rgba(58,48,42,0.8)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#b3541e] text-white">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold">Unsaved Configuration Changes</p>
              <p className="text-[11px] text-[#d8d0c8]">
                Changes will take effect platform-wide upon saving.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#78706a] px-3.5 py-2 text-xs font-semibold text-[#d8d0c8] transition hover:bg-white/10 hover:text-white"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#b3541e] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#c2652a] disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
