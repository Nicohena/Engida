'use client';

import React from 'react';

interface PropertyAboutProps {
  description: string;
}

export default function PropertyAbout({ description }: PropertyAboutProps) {
  const paragraphs = description.split('\n\n').filter(Boolean);

  return (
    <section className="py-8 border-b border-slate-100">
      <div className="mb-4">
        <span className="text-xs font-bold tracking-widest text-[#2563eb] uppercase font-mono">
          RESIDENCE DETAILS
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-[-0.03em] mt-0.5">
          About This Property
        </h2>
      </div>
      <div className="text-slate-600 text-sm sm:text-[15px] leading-relaxed space-y-4">
        {paragraphs.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </section>
  );
}
