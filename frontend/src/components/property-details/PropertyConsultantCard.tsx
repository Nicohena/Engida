'use client';

import React from 'react';
import type { PropertyHost } from '../../types';

interface PropertyConsultantCardProps {
  host: PropertyHost;
}

export default function PropertyConsultantCard({ host }: PropertyConsultantCardProps) {
  return (
    <section className="py-8 border-b border-slate-100">
      <div className="mb-6">
        <span className="text-xs font-bold tracking-widest text-[#2563eb] uppercase font-mono">
          LOCAL EXPERTISE &amp; TRUST
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-[-0.03em] mt-0.5">
          Meet Your Property Consultant
        </h2>
      </div>

      <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          {/* Consultant Photo */}
          <div className="w-28 h-32 sm:w-36 sm:h-40 rounded-2xl overflow-hidden flex-shrink-0 bg-slate-200 shadow-sm relative border border-slate-200">
            {host.avatar ? (
              <img
                alt={`${host.name} - ${host.title || 'Property Consultant'}`}
                className="w-full h-full object-cover object-top"
                src={host.avatar}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-3xl font-bold">
                {host.name.charAt(0)}
              </div>
            )}
            <span className="absolute bottom-1.5 right-1.5 bg-[#2563eb] text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-xs">
              ✓ Verified
            </span>
          </div>

          {/* Consultant Info Details */}
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold font-mono block mb-0.5">
                  Assigned Consultant
                </span>
                <h3 className="text-lg font-extrabold text-slate-900">{host.name}</h3>
              </div>
              {host.title && (
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold font-mono block mb-0.5">
                    Role &amp; Advisory
                  </span>
                  <h4 className="text-sm font-semibold text-slate-700">{host.title}</h4>
                </div>
              )}
            </div>

            {host.bio && (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {host.bio}
              </p>
            )}

            {/* Contact Details */}
            <div className="pt-3 border-t border-slate-200/70 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
              {host.phone && (
                <div>
                  <span className="text-slate-400 block text-[11px] font-mono font-medium">Direct Phone</span>
                  <span className="font-bold text-slate-800">{host.phone}</span>
                </div>
              )}
              <div>
                <span className="text-slate-400 block text-[11px] font-mono font-medium">Email Address</span>
                <span className="font-bold text-slate-800 break-all">{host.email}</span>
              </div>
              {host.officeLocation && (
                <div>
                  <span className="text-slate-400 block text-[11px] font-mono font-medium">Primary Office</span>
                  <span className="font-bold text-slate-800">{host.officeLocation}</span>
                </div>
              )}
            </div>

            {/* Contact Buttons */}
            <div className="pt-2 flex flex-wrap gap-2.5">
              <button
                className="px-5 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer active:scale-[0.98]"
                type="button"
              >
                Contact {host.name.split(' ')[0]}
              </button>
              <button
                className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
                type="button"
              >
                Schedule Private Call
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
