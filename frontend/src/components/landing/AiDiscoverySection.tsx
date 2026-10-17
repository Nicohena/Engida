'use client';

import React from 'react';

export default function AiDiscoverySection({ onCtaClick }: { onCtaClick?: () => void }) {
  return (
    <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-[#2563eb]">AI discovery</p>
      <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
        Natural-language recommendations are not available yet
      </h2>
      <p className="mt-3 mx-auto max-w-2xl text-sm leading-relaxed text-slate-600">
        ENGIDA does not currently show AI-generated matches or trust scores here. Browse published listings to see current property details and prices supplied by hosts.
      </p>
      <button
        type="button"
        onClick={onCtaClick}
        className="mt-6 rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        Browse published listings
      </button>
    </section>
  );
}
