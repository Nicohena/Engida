'use client';

import React, { useEffect, useState } from 'react';
import type { Property } from '../../types';
import { apiFetch } from '../../lib/api';

interface PropertyBookingWidgetProps {
  property: Property;
}

export default function PropertyBookingWidget({ property }: PropertyBookingWidgetProps) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [roomId, setRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const availableRooms = (property.rooms || []).filter((room) => room.isAvailable);
  const selectedRoom = availableRooms.find((room) => room.id === roomId);
  const pricePerNight = Number(selectedRoom?.pricePerNight ?? property.pricePerNight);
  const guestCapacity = selectedRoom?.capacity ?? property.maxGuests;
  useEffect(() => {
    if (guests > guestCapacity) setGuests(guestCapacity);
  }, [guestCapacity, guests]);

  // Calculate nights and total
  let nights = 0;
  let subtotal = 0;

  if (checkIn && checkOut) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    nights = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    subtotal = nights * pricePerNight;
  }

  const total = subtotal;

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
          ...(selectedRoom ? { roomId: selectedRoom.id } : {}),
          checkInDate: checkIn,
          checkOutDate: checkOut,
          guestCount: guests,
        }),
      });
      setMessage({ type: 'success', text: 'Reservation request submitted. Track its status in your account. Payment is not processed through ENGIDA yet.' });
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
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">ETB {pricePerNight.toLocaleString()}</span>
          <span className="text-xs font-semibold text-slate-500 ml-1.5">/ night</span>
        </div>
        <span className="text-[11px] font-bold bg-blue-50 text-[#2563eb] border border-blue-100 px-2.5 py-1 rounded-full">
          Request to book
        </span>
      </div>

      {/* Date Inputs */}
      {availableRooms.length > 0 && (
        <div className="mb-4">
          <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-bold font-mono mb-1.5">Room</label>
          <select value={roomId} onChange={(e) => { setRoomId(e.target.value); setGuests(1); }} className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50">
            <option value="">Entire property · ETB {Number(property.pricePerNight).toLocaleString()}/night</option>
            {availableRooms.map((room) => <option key={room.id} value={room.id}>{room.title} · Room {room.roomNumber} · ETB {Number(room.pricePerNight).toLocaleString()}/night</option>)}
          </select>
        </div>
      )}
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
          {Array.from({ length: guestCapacity }, (_, i) => i + 1).map((n) => (
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
        {loading ? 'Submitting request…' : nights > 0 ? `Request reservation · ETB ${total.toLocaleString()}` : 'Select dates to request'}
      </button>

      {/* Reservation estimate; final booking value is calculated by the backend */}
      {nights > 0 && (
        <div className="flex justify-between border-t border-slate-100 pt-4 text-sm font-bold text-slate-900">
          <span>Estimated total ({nights} night{nights !== 1 ? 's' : ''})</span>
          <span className="text-[#2563eb]">ETB {total.toLocaleString()}</span>
        </div>
      )}

      <div className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <p className="font-bold text-slate-800">Reservation request only</p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          ENGIDA records the booking request and its status. Payment is not collected or processed on the platform yet.
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
