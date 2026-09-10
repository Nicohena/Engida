'use client';

import React, { useState } from 'react';

const PAYMENT_METHODS = [
  {
    id: 'telebirr',
    name: 'Telebirr Wallet',
    badge: 'National Mobile Money',
    description: 'Instant zero-fee booking with your Ethio Telecom Telebirr account. Instant SMS confirmation.',
    speed: 'Instant Confirmation (< 3 sec)',
    logoColor: 'from-amber-500 to-yellow-600',
  },
  {
    id: 'cbe',
    name: 'CBE Birr & CBE Mobile',
    badge: 'Commercial Bank of Ethiopia',
    description: 'Direct debits from CBE accounts across Ethiopia. Official commercial banking integration.',
    speed: 'Instant Settlement',
    logoColor: 'from-purple-700 to-indigo-800',
  },
  {
    id: 'chapa',
    name: 'Chapa Gateway',
    badge: 'Multi-Bank Gateway',
    description: 'Unified payment switch supporting local debit cards, Awash Birr, and international cards.',
    speed: 'Multi-Channel Processing',
    logoColor: 'from-blue-600 to-cyan-700',
  },
  {
    id: 'awash',
    name: 'Awash Bank / Awash Birr',
    badge: 'Leading Private Bank',
    description: 'Seamless checkout directly through Awash Internet banking and mobile wallet.',
    speed: 'Direct Bank Clearance',
    logoColor: 'from-blue-800 to-blue-950',
  },
  {
    id: 'dashen',
    name: 'Dashen Bank & Amole',
    badge: 'Private Bank & Wallet',
    description: 'Pay quickly using your Amole digital wallet or Dashen Bank debit cards.',
    speed: 'Instant Clearance',
    logoColor: 'from-emerald-600 to-teal-800',
  },
  {
    id: 'cards',
    name: 'Visa & Mastercard (ETB / USD)',
    badge: 'International & Diaspora',
    description: 'Diaspora and international visitors can book using foreign cards with automatic ETB conversion.',
    speed: 'Global Card Processing',
    logoColor: 'from-slate-700 to-slate-900',
  },
];

const ESCROW_STEPS = [
  {
    step: '01',
    title: 'Guest Books & Pays in ETB',
    desc: 'You pay with Telebirr, CBE, or card. Your price is locked in Ethiopian Birr with 0% foreign markup.',
  },
  {
    step: '02',
    title: 'Funds Held in National Escrow',
    desc: 'Money is not sent directly to the host yet. It is held securely in an NBE-compliant escrow vault.',
  },
  {
    step: '03',
    title: 'Seamless Check-In & Inspection',
    desc: 'You arrive at the property. Verify the backup generator, water reservoir, and room condition.',
  },
  {
    step: '04',
    title: 'Host Payout Released (24h Later)',
    desc: 'After 24 hours of satisfied stay, payment is automatically released into the host’s local bank or Telebirr.',
  },
];

export default function PaymentEscrowSection({ onExploreStays }: { onExploreStays?: () => void }) {
  const [activeStep, setActiveStep] = useState<number>(0);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#2563eb] text-xs font-bold mb-3">
          <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
          <span>SRS FR-07: Local Financial Settlement & Escrow Architecture</span>
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
          Pay in Ethiopian Birr. Protected by Escrow.
        </h2>
        <p className="mt-2.5 text-xs sm:text-sm text-slate-500 font-normal leading-relaxed">
          No foreign cards required. No hidden international transaction fees. Complete payment ecosystem integrated with Telebirr, CBE, and national financial switches.
        </p>
      </div>

      {/* Escrow Process Flow Horizontal Strip */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 mb-12">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-6 text-center">
          How Engida Escrow Protects Your Money (FR-07 Acceptance Criterion)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
          {ESCROW_STEPS.map((step, idx) => {
            const isCurrent = activeStep === idx;
            return (
              <div
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isCurrent
                    ? 'border-[#2563eb] shadow-md ring-1 ring-[#2563eb]/40 -translate-y-1'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black font-mono text-[#2563eb] bg-blue-50 px-2 py-0.5 rounded-md">
                      STEP {step.step}
                    </span>
                    {isCurrent && (
                      <span className="w-2 h-2 rounded-full bg-[#2563eb] animate-ping" />
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1.5">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                  <span>Audit Trail Verified</span>
                  <span className="text-[#2563eb]">✓ Encrypted</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Supported Payment Gateways Grid */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">
              Supported Ethiopian Payment Gateways
            </h3>
            <p className="text-xs text-slate-500">
              National wallets and banks fully verified with instant confirmation
            </p>
          </div>
          <span className="hidden sm:inline-block text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            ● 0% Forex Surcharge
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PAYMENT_METHODS.map((method) => (
            <div
              key={method.id}
              className="bg-white border border-slate-200 hover:border-blue-300 p-5 rounded-2xl transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${method.logoColor}`} />
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {method.badge}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 mb-1">
                  {method.name}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  {method.description}
                </p>
              </div>

              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-semibold text-slate-600">
                <span>{method.speed}</span>
                <span className="text-[#2563eb]">NBE Compliant</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Callout */}
      <div className="bg-[#2563eb] text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold mb-1">
            Ready to experience effortless, protected Ethiopian travel?
          </h3>
          <p className="text-xs sm:text-sm text-blue-100 max-w-xl">
            Book top-rated accommodations across Addis Ababa, Bishoftu, Hawassa, and Lalibela with your local mobile wallet.
          </p>
        </div>
        <button
          type="button"
          onClick={onExploreStays}
          className="px-6 py-3 bg-white text-[#2563eb] hover:bg-blue-50 font-bold rounded-full text-xs sm:text-sm transition-all shadow-md shrink-0 cursor-pointer"
        >
          Explore Stays & Book Now
        </button>
      </div>

    </div>
  );
}
