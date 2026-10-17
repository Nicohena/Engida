'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import type { HostListingRow, HostListingsResponse } from '@/types/host';

interface AvailabilityBlock {
  id: string;
  propertyId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  createdAt: string;
}

interface AvailabilityForm {
  startDate: string;
  endDate: string;
  reason: string;
}

const EMPTY_FORM: AvailabilityForm = { startDate: '', endDate: '', reason: '' };

export default function HostAvailabilityPage() {
  const [listings, setListings] = useState<HostListingRow[]>([]);
  const [listingId, setListingId] = useState('');
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [form, setForm] = useState<AvailabilityForm>(EMPTY_FORM);
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const blockRequestId = useRef(0);
  const [reloadVersion, setReloadVersion] = useState(0);

  const selectedListing = useMemo(
    () => listings.find((listing) => listing.id === listingId) ?? null,
    [listings, listingId],
  );

  useEffect(() => {
    let active = true;
    const loadListings = async () => {
      setLoadingListings(true);
      setError(null);
      try {
        const firstPage = await apiFetch<HostListingsResponse>('/host/listings?listingType=RENTAL&page=1&limit=100');
        const allListings = [...firstPage.data];
        for (let page = 2; page <= firstPage.totalPages; page += 1) {
          const nextPage = await apiFetch<HostListingsResponse>(`/host/listings?listingType=RENTAL&page=${page}&limit=100`);
          allListings.push(...nextPage.data);
        }
        if (active) {
          setListings(allListings);
          setLoadingBlocks(allListings.length > 0);
          setListingId((current) => current || allListings[0]?.id || '');
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load rental listings.');
      } finally {
        if (active) setLoadingListings(false);
      }
    };

    void loadListings();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!listingId) return;
    const requestId = ++blockRequestId.current;
    let active = true;
    apiFetch<AvailabilityBlock[]>(`/host/listings/${listingId}/availability`)
      .then((data) => {
        if (active && requestId === blockRequestId.current) setBlocks(data);
      })
      .catch((loadError: unknown) => {
        if (active && requestId === blockRequestId.current) {
          setBlocks([]);
          setError(loadError instanceof Error ? loadError.message : 'Unable to load availability blocks.');
        }
      })
      .finally(() => {
        if (active && requestId === blockRequestId.current) setLoadingBlocks(false);
      });
    return () => { active = false; };
  }, [listingId, reloadVersion]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!listingId) return;
    if (form.endDate <= form.startDate) {
      setError('The end date must be after the start date.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await apiFetch<AvailabilityBlock>(`/host/listings/${listingId}/availability`, {
        method: 'POST',
        body: JSON.stringify({
          startDate: form.startDate,
          endDate: form.endDate,
          reason: form.reason.trim() || undefined,
        }),
      });
      setBlocks((current) => [...current, created].sort((a, b) => a.startDate.localeCompare(b.startDate)));
      setForm(EMPTY_FORM);
      setSuccess('The dates have been blocked for this rental listing.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to block these dates.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (blockId: string) => {
    if (!listingId) return;
    setRemovingId(blockId);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(`/host/listings/${listingId}/availability/${blockId}`, { method: 'DELETE' });
      setBlocks((current) => current.filter((block) => block.id !== blockId));
      setSuccess('The availability block was removed.');
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Unable to remove this availability block.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 text-2xl font-black text-[#000000]">Availability</h1>
        <p className="mb-8 text-sm text-[#64748B]">Block dates when your rental property cannot accept new bookings.</p>

        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
        {success && <div role="status" className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">{success}</div>}

        {loadingListings ? (
          <div role="status" className="rounded-2xl border border-[#CBD5E1] bg-white p-8 text-sm text-[#64748B]">Loading your rental listings…</div>
        ) : listings.length === 0 ? (
          <div className="rounded-2xl border border-[#CBD5E1] bg-white p-8">
            <h2 className="font-bold text-[#000000]">No rental listings yet</h2>
            <p className="mt-2 text-sm text-[#64748B]">Create a rental listing to manage its unavailable dates.</p>
            <Link href="/host/listings/new" className="mt-5 inline-flex rounded-xl bg-[#33599E] px-5 py-2.5 text-sm font-bold text-white">Create a listing</Link>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl border border-[#CBD5E1] bg-white p-5 md:p-7">
              <label htmlFor="listing" className="mb-2 block text-sm font-semibold text-[#334155]">Rental listing</label>
                <select id="listing" value={listingId} onChange={(event) => {
                  setError(null);
                  setSuccess(null);
                  setLoadingBlocks(true);
                  setListingId(event.target.value);
                }}
                className="w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-sm text-[#000000] focus:border-[#33599E] focus:outline-none focus:ring-2 focus:ring-[#33599E]/20">
                {listings.map((listing) => <option key={listing.id} value={listing.id}>{listing.title} · {listing.city}</option>)}
              </select>
              {selectedListing && <p className="mt-2 text-xs text-[#64748B]">Listing status: {selectedListing.status.toLowerCase()}</p>}
            </section>

            <form onSubmit={handleCreate} className="grid gap-4 rounded-2xl border border-[#CBD5E1] bg-white p-5 md:grid-cols-2 md:p-7">
              <h2 className="md:col-span-2 font-bold text-[#000000]">Block unavailable dates</h2>
              <div>
                <label htmlFor="startDate" className="mb-1.5 block text-sm font-semibold text-[#334155]">Start date</label>
                <input id="startDate" type="date" required min={new Date().toISOString().slice(0, 10)} value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
                  className="w-full rounded-xl border border-[#CBD5E1] px-4 py-3 text-sm text-[#000000] focus:border-[#33599E] focus:outline-none focus:ring-2 focus:ring-[#33599E]/20" />
              </div>
              <div>
                <label htmlFor="endDate" className="mb-1.5 block text-sm font-semibold text-[#334155]">End date (exclusive)</label>
                <input id="endDate" type="date" required min={form.startDate || undefined} value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
                  className="w-full rounded-xl border border-[#CBD5E1] px-4 py-3 text-sm text-[#000000] focus:border-[#33599E] focus:outline-none focus:ring-2 focus:ring-[#33599E]/20" />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="reason" className="mb-1.5 block text-sm font-semibold text-[#334155]">Reason <span className="font-normal text-[#64748B]">(optional)</span></label>
                <input id="reason" maxLength={255} value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                  placeholder="Maintenance, personal use, or another reason"
                  className="w-full rounded-xl border border-[#CBD5E1] px-4 py-3 text-sm text-[#000000] focus:border-[#33599E] focus:outline-none focus:ring-2 focus:ring-[#33599E]/20" />
              </div>
              <div className="md:col-span-2 md:flex md:justify-end">
                <button type="submit" disabled={saving || !listingId} className="w-full rounded-xl bg-[#33599E] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#234079] disabled:cursor-wait disabled:opacity-60 md:w-auto">
                  {saving ? 'Saving…' : 'Block dates'}
                </button>
              </div>
            </form>

            <section className="overflow-hidden rounded-2xl border border-[#CBD5E1] bg-white">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4 md:px-7">
                <h2 className="font-bold text-[#000000]">Unavailable dates</h2>
                <button type="button" onClick={() => {
                  setError(null);
                  setLoadingBlocks(true);
                  setReloadVersion((version) => version + 1);
                }} className="text-xs font-bold text-[#33599E] hover:underline">Refresh</button>
              </div>
              {loadingBlocks ? (
                <div role="status" className="p-6 text-sm text-[#64748B]">Loading blocked dates…</div>
              ) : blocks.length === 0 ? (
                <p className="p-6 text-sm text-[#64748B]">There are no blocked dates for this listing.</p>
              ) : (
                <ul className="divide-y divide-[#E2E8F0]">
                  {blocks.map((block) => (
                    <li key={block.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-7">
                      <div>
                        <p className="text-sm font-semibold text-[#000000]">{block.startDate} through {block.endDate}</p>
                        <p className="mt-1 text-sm text-[#64748B]">{block.reason || 'No reason provided'}</p>
                      </div>
                      <button type="button" onClick={() => void handleRemove(block.id)} disabled={removingId === block.id}
                        className="self-start rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50 sm:self-auto">
                        {removingId === block.id ? 'Removing…' : 'Remove block'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
