'use client';

import React, { useState } from 'react';
import type { Property } from '../../types';
import { apiFetch } from '../../lib/api';

interface PropertyBookingWidgetProps {
  property: Property;
}

export default function PropertyBookingWidget({ property }: PropertyBookingWidgetProps) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const pricePerNight = parseFloat(property.pricePerNight);

  // Calculate nights and total
  let nights = 0;
  let subtotal = 0;
  const serviceFee = 25;

  if (checkIn && checkOut) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    nights = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    subtotal = nights * pricePerNight;
  }

  const total = subtotal + (nights > 0 ? serviceFee : 0);

  const handleReserve = async () => {
    if (!checkIn || !checkOut || nights <= 0) {
      setMessage({ type: 'error', text: 'Please select valid check-in and check-out dates.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: property.id,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          totalPrice: total,
        }),
      });
      setMessage({ type: 'success', text: 'Booking request submitted! You will receive a confirmation shortly.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to submit booking. Please log in and try again.' });
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm sticky top-24 hover:border-blue-200 transition-all">
      {/* Price Header */}
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">${pricePerNight.toFixed(0)}</span>
          <span className="text-xs font-semibold text-slate-500 ml-1.5">/ night</span>
        </div>
        <span className="text-[11px] font-bold bg-blue-50 text-[#2563eb] border border-blue-100 px-2.5 py-1 rounded-full">
          Instant Booking
        </span>
      </div>

      {/* Date Inputs */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-bold font-mono mb-1.5">
            Check-in
          </label>
          <input
            type="date"
            value={checkIn}
            min={today}
            onChange={(e) => setCheckIn(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50/50"
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-bold font-mono mb-1.5">
            Check-out
          </label>
          <input
            type="date"
            value={checkOut}
            min={checkIn || today}
            onChange={(e) => setCheckOut(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50/50"
          />
        </div>
      </div>

      {/* Guests */}
      <div className="mb-5">
        <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-bold font-mono mb-1.5">
          Guests
        </label>
        <select
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50/50 cursor-pointer"
        >
          {Array.from({ length: property.maxGuests }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} guest{n !== 1 ? 's' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Reserve Button */}
      <button
        onClick={handleReserve}
        disabled={loading || nights <= 0}
        className="w-full py-3.5 bg-[#2563eb] hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer active:scale-[0.98] mb-4"
      >
        {loading ? 'Processing Booking...' : nights > 0 ? `Reserve for $${total.toFixed(0)}` : 'Select Dates to Book'}
      </button>

      {/* Price Breakdown */}
      {nights > 0 && (
        <div className="space-y-2.5 text-xs sm:text-sm border-t border-slate-100 pt-4">
          <div className="flex justify-between text-slate-600">
            <span>${pricePerNight.toFixed(0)} × {nights} night{nights !== 1 ? 's' : ''}</span>
            <span className="font-semibold text-slate-800">${subtotal.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Escrow &amp; Service fee</span>
            <span className="font-semibold text-slate-800">${serviceFee}</span>
          </div>
          <div className="flex justify-between font-extrabold text-slate-900 text-sm sm:text-base pt-2 border-t border-slate-100">
            <span>Total Price</span>
            <span className="text-[#2563eb]">${total.toFixed(0)}</span>
          </div>
        </div>
      )}

      {/* Trust & Escrow Guarantee strip */}
      <div className="mt-5 pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
        <div className="flex items-center gap-2 text-slate-800 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>24-Hour Guest Escrow Protection</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Payment is held securely and only released 24 hours after check-in. Supports Telebirr &amp; CBE Birr.
        </p>
      </div>

      {/* Message Box */}
      {message && (
        <div
          className={`mt-4 text-xs p-3.5 rounded-xl ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
