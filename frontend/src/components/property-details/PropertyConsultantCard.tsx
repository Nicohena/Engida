'use client';

import React from 'react';
import type { PropertyHost } from '../../types';

interface PropertyConsultantCardProps {
  host: PropertyHost;
  listingType?: 'RENTAL' | 'SALE';
}

export default function PropertyConsultantCard({ host, listingType = 'RENTAL' }: PropertyConsultantCardProps) {
  const displayName = host.hostProfile?.displayName?.trim() || host.name;
  const contactPhone = host.hostProfile?.phone?.trim();
  const phoneLink = contactPhone?.replace(/[^\d+]/g, '');

  return (
    <section className="border-b border-slate-100 py-8">
      <div className="mb-5">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#2563eb]">Property host</span>
        <h2 className="mt-0.5 text-xl font-extrabold tracking-[-0.03em] text-slate-900 sm:text-2xl">About your host</h2>
      </div>
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
        <div aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-[#2563eb]">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-slate-900">{displayName}</p>
          {host.hostProfile?.bio && <p className="mt-1 max-w-xl whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{host.hostProfile.bio}</p>}
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            {listingType === 'SALE'
              ? 'This sale listing is managed by the host profile shown above. ENGIDA does not process property sales.'
              : 'This rental listing is managed by the host profile shown above. You can submit a reservation request through ENGIDA.'}
          </p>
          {contactPhone && phoneLink && <a href={`tel:${phoneLink}`} className="mt-2 inline-flex text-sm font-semibold text-blue-700 hover:underline">Call host · {contactPhone}</a>}
        </div>
      </div>
    </section>
  );
}
