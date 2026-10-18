'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  CreditCard,
  Smartphone,
  Globe,
  Lock,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import type { Property, Booking } from '../../types';
import BookingCheckoutModal from '../booking/BookingCheckoutModal';

interface PropertyBookingWidgetProps {
  property: Property;
}

export default function PropertyBookingWidget({ property }: PropertyBookingWidgetProps) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [roomId, setRoomId] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

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
  const today = new Date().toISOString().split('T')[0];

  const handleOpenCheckout = () => {
    if (!checkIn || !checkOut || nights <= 0) {
      setMessage({ type: 'error', text: 'Please select valid check-in and check-out dates.' });
      return;
    }
    setMessage(null);
    setShowCheckoutModal(true);
  };

  const handleBookingSuccess = (booking: Booking) => {
    setConfirmedBooking(booking);
    setMessage({
      type: 'success',
      text: `Reservation confirmed! Reference: ${booking.paymentReference || booking.id.slice(0, 8)} (${booking.paymentMethod || 'Confirmed'}). Track status in your dashboard.`,
    });
  };

  return (
    <>
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm sticky top-24 hover:border-blue-200 transition-all">
        {/* Price Header */}
        <div className="flex items-baseline justify-between mb-5">
          <div>
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
              ETB {pricePerNight.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-slate-500 ml-1.5">/ night</span>
          </div>
          <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
            <Lock className="w-3 h-3" /> Secure Payment
          </span>
        </div>

        {/* Date Inputs */}
        {availableRooms.length > 0 && (
          <div className="mb-4">
            <label className="block text-[11px] uppercase tracking-wider text-slate-400 font-bold font-mono mb-1.5">
              Room Selection
            </label>
            <select
              value={roomId}
              onChange={(e) => {
                setRoomId(e.target.value);
                setGuests(1);
              }}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50/50"
            >
              <option value="">
                Entire property · ETB {Number(property.pricePerNight).toLocaleString()}/night
              </option>
              {availableRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.title} · Room {room.roomNumber} · ETB {Number(room.pricePerNight).toLocaleString()}/night
                </option>
              ))}
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

        {/* Reserve & Pay Button */}
        <button
          onClick={handleOpenCheckout}
          disabled={nights <= 0}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-md cursor-pointer active:scale-[0.98] mb-4 flex items-center justify-center gap-2"
        >
          {nights > 0 ? (
            <>
              <span>Proceed to Payment · ETB {total.toLocaleString()}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            'Select dates to proceed'
          )}
        </button>

        {/* Price Breakdown */}
        {nights > 0 && (
          <div className="space-y-2 border-t border-slate-100 pt-4 text-xs sm:text-sm">
            <div className="flex justify-between text-slate-600">
              <span>
                ETB {pricePerNight.toLocaleString()} × {nights} night{nights !== 1 ? 's' : ''}
              </span>
              <span className="font-semibold text-slate-900">ETB {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span className="flex items-center gap-1">
                ENGIDA Service Fee <span className="text-[10px] text-emerald-600 font-bold">Waived</span>
              </span>
              <span className="font-semibold text-emerald-600">ETB 0</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3 text-sm font-black text-slate-900">
              <span>Total Price</span>
              <span className="text-blue-600">
                ETB {total.toLocaleString()}
                <span className="text-xs font-normal text-slate-500 ml-1.5">
                  (~${Math.round((total / 125) * 100) / 100} USD)
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Accepted Payment Methods Pill Card */}
        <div className="mt-5 border-t border-slate-100 pt-4 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <span>Accepted Payment Options</span>
            <span className="text-emerald-600 flex items-center gap-0.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Escrow Protected
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
              <span className="font-bold text-slate-800 block">🇪🇹 Local Ethiopia</span>
              <span className="text-slate-500 text-[10px]">Chapa, Telebirr, CBE Birr</span>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
              <span className="font-bold text-slate-800 block">🌍 International</span>
              <span className="text-slate-500 text-[10px]">Visa, Mastercard, PayPal, Wise</span>
            </div>
          </div>
        </div>

        {/* Message Box */}
        {message && (
          <div
            className={`mt-4 text-xs p-3.5 rounded-2xl ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      {/* Interactive Checkout Modal */}
      <BookingCheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        property={property}
        selectedRoom={selectedRoom}
        checkIn={checkIn}
        checkOut={checkOut}
        nights={nights}
        guestCount={guests}
        totalPrice={total}
        onBookingSuccess={handleBookingSuccess}
      />
    </>
  );
}
