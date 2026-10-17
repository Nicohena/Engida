'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import type { HostProfile } from '@/types/host';

interface HostProfileForm {
  displayName: string;
  phone: string;
  bio: string;
}

const EMPTY_FORM: HostProfileForm = { displayName: '', phone: '', bio: '' };

export default function HostProfilePage() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState<HostProfile | null>(null);
  const [form, setForm] = useState<HostProfileForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    apiFetch<HostProfile>('/host/profile')
      .then((data) => {
        if (!active) return;
        setProfile(data);
        setForm({
          displayName: data.displayName ?? '',
          phone: data.phone ?? '',
          bio: data.bio ?? '',
        });
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load your host profile.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const data = await apiFetch<HostProfile>('/host/profile');
      setProfile(data);
      setForm({ displayName: data.displayName ?? '', phone: data.phone ?? '', bio: data.bio ?? '' });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your host profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await apiFetch<HostProfile>('/host/profile', {
        method: 'PUT',
        body: JSON.stringify({
          displayName: form.displayName.trim(),
          phone: form.phone.trim() || null,
          bio: form.bio.trim() || null,
        }),
      });
      setProfile(updated);
      setForm({
        displayName: updated.displayName ?? '',
        phone: updated.phone ?? '',
        bio: updated.bio ?? '',
      });
      await refreshUser();
      setSuccess('Your host profile has been updated.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update your host profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-2xl font-black text-[#000000]">Host Profile</h1>
        <p className="mb-8 text-sm text-[#64748B]">Manage the information guests see about you as a host.</p>

        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
        {success && <div role="status" className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">{success}</div>}

        {loading ? (
          <div role="status" className="rounded-2xl border border-[#CBD5E1] bg-white p-8 text-sm text-[#64748B]">Loading your profile…</div>
        ) : profile ? (
          <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-[#CBD5E1] bg-white p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-5">
              <div>
                <h2 className="font-bold text-[#000000]">Public host details</h2>
                <p className="mt-1 text-sm text-[#64748B]">Your account role remains a regular ENGIDA user.</p>
              </div>
              <span className="rounded-full bg-[#E3EAF5] px-3 py-1 text-xs font-bold text-[#33599E]">
                Verification: {profile.verificationStatus.toLowerCase()}
              </span>
            </div>

            <div>
              <label htmlFor="displayName" className="mb-1.5 block text-sm font-semibold text-[#334155]">Display name</label>
              <input id="displayName" required minLength={2} maxLength={100} value={form.displayName}
                onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                className="w-full rounded-xl border border-[#CBD5E1] px-4 py-3 text-sm text-[#000000] focus:border-[#33599E] focus:outline-none focus:ring-2 focus:ring-[#33599E]/20" />
            </div>

            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-semibold text-[#334155]">Contact phone</label>
              <input id="phone" type="tel" maxLength={50} value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="+251…"
                className="w-full rounded-xl border border-[#CBD5E1] px-4 py-3 text-sm text-[#000000] focus:border-[#33599E] focus:outline-none focus:ring-2 focus:ring-[#33599E]/20" />
            </div>

            <div>
              <label htmlFor="bio" className="mb-1.5 block text-sm font-semibold text-[#334155]">About you</label>
              <textarea id="bio" rows={5} maxLength={500} value={form.bio}
                onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                className="w-full resize-y rounded-xl border border-[#CBD5E1] px-4 py-3 text-sm text-[#000000] focus:border-[#33599E] focus:outline-none focus:ring-2 focus:ring-[#33599E]/20" />
              <p className="mt-1 text-right text-xs text-[#64748B]">{form.bio.length}/500</p>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-[#E2E8F0] pt-5">
              <button type="button" disabled={saving} onClick={() => setForm({
                displayName: profile.displayName ?? '', phone: profile.phone ?? '', bio: profile.bio ?? '',
              })} className="rounded-xl border border-[#CBD5E1] px-5 py-2.5 text-sm font-semibold text-[#334155] hover:bg-[#F4F7FC] disabled:opacity-50">
                Reset changes
              </button>
              <button type="submit" disabled={saving} className="rounded-xl bg-[#33599E] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#234079] disabled:cursor-wait disabled:opacity-60">
                {saving ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-2xl border border-[#CBD5E1] bg-white p-8">
            <h2 className="font-bold text-[#000000]">Host profile unavailable</h2>
            <p className="mt-2 text-sm text-[#64748B]">We could not load the profile connected to your account.</p>
            <button type="button" onClick={() => {
              setLoading(true);
              setError(null);
              void loadProfile();
            }} className="mt-5 rounded-xl bg-[#33599E] px-5 py-2.5 text-sm font-bold text-white">Try again</button>
          </div>
        )}
      </div>
    </div>
  );
}
