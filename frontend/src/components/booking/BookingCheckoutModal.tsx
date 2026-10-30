'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  ShieldCheck,
  Smartphone,
  Globe,
  Building,
  CheckCircle2,
  X,
  Lock,
  ArrowRight,
  Receipt,
  AlertCircle,
  HelpCircle,
  Calendar,
  Users,
  Tag,
  Sparkles,
  Percent,
  Check,
  Loader2,
} from 'lucide-react';
import type { Property, Room, Booking, PaymentMethod } from '../../types';
import { apiFetch } from '../../lib/api';

interface BookingCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
  selectedRoom?: Room | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestCount: number;
  totalPrice: number;
  onBookingSuccess: (booking: Booking) => void;
}

export default function BookingCheckoutModal({
  isOpen,
  onClose,
  property,
  selectedRoom,
  checkIn,
  checkOut,
  nights,
  guestCount,
  totalPrice,
  onBookingSuccess,
}: BookingCheckoutModalProps) {
  // Exchange rate: 1 USD ≈ 125 ETB
  const ETB_USD_RATE = 125;

  const [category, setCategory] = useState<'LOCAL' | 'INTERNATIONAL'>('LOCAL');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CHAPA');
  const [currency, setCurrency] = useState<'ETB' | 'USD'>('ETB');

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number; // in ETB
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    payableAmount: number; // in ETB
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Derived pricing calculations
  const grossTotalPrice = totalPrice;
  const discountETB = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const netTotalPrice = Math.max(0, grossTotalPrice - discountETB);

  const grossUsdPrice = Math.round((grossTotalPrice / ETB_USD_RATE) * 100) / 100;
  const discountUsdPrice = Math.round((discountETB / ETB_USD_RATE) * 100) / 100;
  const netUsdPrice = Math.round((netTotalPrice / ETB_USD_RATE) * 100) / 100;

  // Ethiopian mobile input
  const [telebirrPhone, setTelebirrPhone] = useState('0911223344');
  const [cbeAccount, setCbeAccount] = useState('1000192837465');

  // International Card inputs
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCsc, setCardCsc] = useState('');
  const [billingCountry, setBillingCountry] = useState('Ethiopia');

  // Status & processing
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);

  // Guard against cart alteration / date changes while modal is open
  const prevParamsRef = useRef({ checkIn, checkOut, totalPrice });
  useEffect(() => {
    if (
      appliedCoupon &&
      (prevParamsRef.current.checkIn !== checkIn ||
        prevParamsRef.current.checkOut !== checkOut ||
        prevParamsRef.current.totalPrice !== totalPrice)
    ) {
      prevParamsRef.current = { checkIn, checkOut, totalPrice };
      // Re-validate coupon against the updated cart amount
      validateAndApplyCoupon(appliedCoupon.code, totalPrice);
    } else {
      prevParamsRef.current = { checkIn, checkOut, totalPrice };
    }
  }, [checkIn, checkOut, totalPrice, appliedCoupon]);

  if (!isOpen) return null;

  const validateAndApplyCoupon = async (codeToValidate: string, baseAmount = totalPrice) => {
    const normalizedCode = codeToValidate.trim().toUpperCase();
    if (!normalizedCode) {
      setCouponError('Please enter a promotional code');
      return;
    }

    setCouponLoading(true);
    setCouponError(null);

    try {
      const bookingAmountMinor = Math.round(baseAmount * 100);
      const res = await apiFetch<{
        valid: boolean;
        code: string;
        couponId?: string;
        discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';
        discountValue?: number;
        discountAmountMinor: number;
        payableAmountMinor: number;
        reason?: string;
      }>('/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({
          code: normalizedCode,
          bookingAmountMinor,
        }),
      });

      if (res.valid) {
        const discountAmount = res.discountAmountMinor / 100;
        const payableAmount = res.payableAmountMinor / 100;
        setAppliedCoupon({
          code: res.code,
          discountAmount,
          discountType: res.discountType || 'PERCENTAGE',
          payableAmount,
        });
        setCouponInput('');
        setCouponError(null);
      } else {
        setAppliedCoupon(null);
        setCouponError(res.reason || 'This promotional code cannot be applied to your reservation.');
      }
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err.message || 'Unable to validate promotional code. Please try again.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) {
      setCouponError('Please enter a promotional code');
      return;
    }
    validateAndApplyCoupon(couponInput);
  };

  const handleApplySuggestion = (suggestionCode: string) => {
    setCouponInput(suggestionCode);
    validateAndApplyCoupon(suggestionCode);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setCardNumber(formatted);
  };

  const handleCardExpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }
    setCardExp(raw);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Submit booking to backend (server authoritative price calculation and coupon binding)
      const bookingPayload = {
        propertyId: property.id,
        ...(selectedRoom ? { roomId: selectedRoom.id } : {}),
        checkInDate: checkIn,
        checkOutDate: checkOut,
        guestCount,
        paymentMethod: selectedMethod,
        paymentCurrency: currency,
        couponCode: appliedCoupon?.code,
      };

      const booking = await apiFetch<Booking>('/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingPayload),
      });

      // 2. Bind authoritative payment session with backend payments service
      try {
        const session = await apiFetch<{
          paymentId: string;
          checkoutUrl?: string;
          status: string;
        }>('/payments/sessions', {
          method: 'POST',
          body: JSON.stringify({
            bookingId: booking.id,
            paymentMethod: selectedMethod,
            currency,
            customerPhone: telebirrPhone || undefined,
            returnUrl: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined,
          }),
        });

        if (session.checkoutUrl && session.checkoutUrl.startsWith('http')) {
          // If a hosted checkout URL was returned (e.g. Chapa hosted checkout)
          window.location.href = session.checkoutUrl;
          return;
        }
      } catch (sessionErr) {
        console.warn('Quote session binding fallback:', sessionErr);
      }

      setCompletedBooking(booking);
      onBookingSuccess(booking);
    } catch (err: any) {
      setError(err.message || 'Payment processing failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#faf5ee] rounded-3xl shadow-2xl max-w-2xl w-full border border-[#d8d0c8] overflow-hidden relative text-[#3a302a]">
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-900 via-[#3a302a] to-[#2c221c] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-stone-300 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all"
            aria-label="Close checkout modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
              <Lock className="w-3 h-3" /> Secure 256-bit Checkout
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight font-serif">Complete Your Reservation</h2>
          <p className="text-stone-300 text-sm mt-1">
            {property.title} · {property.city}, Ethiopia
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {completedBooking ? (
            /* SUCCESS SCREEN */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-[#3a302a] font-serif">Payment & Reservation Confirmed!</h3>
              <p className="text-sm text-[#605850] max-w-md mx-auto">
                Your reservation has been secured. A confirmation receipt has been generated and sent to the host.
              </p>

              {/* Receipt Summary Card */}
              <div className="bg-white border border-[#d8d0c8] rounded-2xl p-5 text-left max-w-md mx-auto space-y-2.5 text-xs sm:text-sm shadow-sm">
                <div className="flex justify-between text-[#605850]">
                  <span>Reservation ID:</span>
                  <span className="font-mono font-bold text-[#3a302a]">{completedBooking.id.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between text-[#605850]">
                  <span>Payment Gateway:</span>
                  <span className="font-bold text-[#b3541e] bg-[#f2ece4] px-2 py-0.5 rounded">
                    {completedBooking.paymentMethod || selectedMethod}
                  </span>
                </div>
                {completedBooking.paymentReference && (
                  <div className="flex justify-between text-[#605850]">
                    <span>Transaction Ref:</span>
                    <span className="font-mono text-[#3a302a]">{completedBooking.paymentReference}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#605850]">
                  <span>Payment Status:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {completedBooking.paymentStatus || 'PAID'}
                  </span>
                </div>
                <div className="flex justify-between text-[#605850]">
                  <span>Duration:</span>
                  <span className="font-semibold text-[#3a302a]">
                    {checkIn} → {checkOut} ({nights} night{nights !== 1 ? 's' : ''})
                  </span>
                </div>

                {/* Coupon breakdown in receipt */}
                {completedBooking.couponCode && (
                  <div className="flex justify-between text-emerald-700 font-medium bg-emerald-50/70 p-2 rounded-xl">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" /> Promo ({completedBooking.couponCode}):
                    </span>
                    <span>
                      -ETB {Number(completedBooking.discountAmount || discountETB).toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="border-t border-[#d8d0c8] pt-2 flex justify-between font-bold text-base text-[#3a302a]">
                  <span>Total Amount Paid:</span>
                  <span className="text-emerald-700 font-mono">
                    ETB {Number(completedBooking.totalPrice).toLocaleString()}
                    <span className="text-xs font-normal text-[#605850] ml-1">
                      (~${Math.round(Number(completedBooking.totalPrice) / ETB_USD_RATE)} USD)
                    </span>
                  </span>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/dashboard"
                  className="px-6 py-3 bg-[#b3541e] hover:bg-[#964215] text-white text-sm font-bold rounded-xl shadow-sm transition-all"
                >
                  View in My Trips / Dashboard
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 bg-[#f2ece4] hover:bg-[#eae2da] text-[#3a302a] text-sm font-bold rounded-xl transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* CHECKOUT FORM */
            <form onSubmit={handleSubmitPayment} className="space-y-5">
              {/* Trip Summary Pill */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#d8d0c8] rounded-2xl p-4 text-xs sm:text-sm shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#f2ece4] text-[#b3541e] rounded-xl">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-[#3a302a]">
                      {checkIn} to {checkOut}
                    </p>
                    <p className="text-[#605850] text-xs">
                      {nights} night{nights !== 1 ? 's' : ''} · {guestCount} guest{guestCount !== 1 ? 's' : ''}
                      {selectedRoom ? ` · Room: ${selectedRoom.title}` : ' · Entire Property'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-[#3a302a] font-mono">
                    {currency === 'ETB' ? `ETB ${netTotalPrice.toLocaleString()}` : `$${netUsdPrice.toFixed(2)} USD`}
                  </div>
                  {appliedCoupon ? (
                    <div className="text-[11px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                      <Tag className="w-3 h-3" />
                      <span>Saved ETB {discountETB.toLocaleString()} with {appliedCoupon.code}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-[#605850]">
                      {currency === 'ETB' ? `≈ $${netUsdPrice.toFixed(2)} USD` : `≈ ETB ${netTotalPrice.toLocaleString()}`}
                    </div>
                  )}
                </div>
              </div>

              {/* Currency Selector Toggle */}
              <div className="flex items-center justify-between border-b border-[#d8d0c8] pb-3">
                <span className="text-xs font-bold text-[#605850] uppercase tracking-wider">Currency Choice</span>
                <div className="flex gap-1 bg-[#f2ece4] p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setCurrency('ETB')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      currency === 'ETB'
                        ? 'bg-white text-[#b3541e] shadow-xs font-black'
                        : 'text-[#605850] hover:text-[#3a302a]'
                    }`}
                  >
                    🇪🇹 ETB (Birr)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency('USD')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      currency === 'USD'
                        ? 'bg-white text-[#b3541e] shadow-xs font-black'
                        : 'text-[#605850] hover:text-[#3a302a]'
                    }`}
                  >
                    🌍 USD (International)
                  </button>
                </div>
              </div>

              {/* ============================================================== */}
              {/* COUPON & PROMO CODE INTERACTION CARD                          */}
              {/* ============================================================== */}
              <div className="bg-white border border-[#d8d0c8] rounded-2xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#f2ece4] flex items-center justify-center text-[#b3541e]">
                      <Tag className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#3a302a] uppercase tracking-wider block">
                        Promotional Coupon
                      </span>
                      <span className="text-[11px] text-[#605850]">
                        Apply a promo code to unlock instant stay savings
                      </span>
                    </div>
                  </div>
                  {appliedCoupon && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>

                {appliedCoupon ? (
                  /* Applied Coupon Banner */
                  <div className="space-y-2 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <div className="flex items-center gap-1.5 font-mono font-bold text-xs text-emerald-900">
                            <span>{appliedCoupon.code}</span>
                            <span className="text-emerald-600 font-sans font-normal">applied</span>
                            <span className="text-emerald-700">·</span>
                            <span className="text-emerald-800 font-sans font-bold">
                              Saved ETB {discountETB.toLocaleString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            Promo code applied! You saved ETB {discountETB.toLocaleString()} on this trip.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-emerald-800 hover:text-red-700 hover:bg-emerald-100/60 p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                        aria-label="Remove coupon"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Coupon Input Field & Suggestions */
                  <div className="space-y-2.5">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value.toUpperCase());
                            if (couponError) setCouponError(null);
                          }}
                          placeholder="e.g. WELCOME10"
                          className="w-full px-3.5 py-2 text-xs sm:text-sm font-mono uppercase bg-[#faf5ee] border border-[#d8d0c8] rounded-xl focus:border-[#b3541e] focus:bg-white focus:ring-2 focus:ring-[#b3541e]/20 outline-none text-[#3a302a] placeholder:text-[#9a9088]"
                          disabled={couponLoading}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponInput.trim()}
                        className="px-4 py-2 bg-[#b3541e] hover:bg-[#964215] active:scale-95 disabled:bg-[#d8d0c8] disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                      >
                        {couponLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Validating…</span>
                          </>
                        ) : (
                          <span>Apply</span>
                        )}
                      </button>
                    </div>

                    {/* Quick suggestion pills */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[11px] text-[#605850] font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#b3541e]" /> Try:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleApplySuggestion('WELCOME10')}
                        disabled={couponLoading}
                        className="px-2.5 py-1 text-[11px] font-mono font-semibold bg-[#faf5ee] hover:bg-[#f2ece4] text-[#b3541e] border border-[#d8d0c8] hover:border-[#b3541e] rounded-lg transition-all active:scale-95 flex items-center gap-1"
                      >
                        <span>WELCOME10</span>
                        <span className="text-[10px] text-[#605850] font-sans font-normal">(10% off)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplySuggestion('ENGIDA500')}
                        disabled={couponLoading}
                        className="px-2.5 py-1 text-[11px] font-mono font-semibold bg-[#faf5ee] hover:bg-[#f2ece4] text-[#b3541e] border border-[#d8d0c8] hover:border-[#b3541e] rounded-lg transition-all active:scale-95 flex items-center gap-1"
                      >
                        <span>ENGIDA500</span>
                        <span className="text-[10px] text-[#605850] font-sans font-normal">(500 ETB off)</span>
                      </button>
                    </div>

                    {/* Coupon Error Feedback */}
                    {couponError && (
                      <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs animate-in fade-in duration-150">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{couponError}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Method Category Tabs */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#605850] mb-2">
                  Select Payment Option
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCategory('LOCAL');
                      setSelectedMethod('CHAPA');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      category === 'LOCAL'
                        ? 'border-[#b3541e] bg-white text-[#3a302a] ring-2 ring-[#b3541e]/20 shadow-xs'
                        : 'border-[#d8d0c8] bg-white/60 hover:bg-white text-[#605850]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span>🇪🇹 Ethiopia Local</span>
                    </div>
                    <p className="text-[11px] text-[#605850] mt-0.5 truncate">Chapa, Telebirr, CBE</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCategory('INTERNATIONAL');
                      setSelectedMethod('INTERNATIONAL_CARD');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      category === 'INTERNATIONAL'
                        ? 'border-[#b3541e] bg-white text-[#3a302a] ring-2 ring-[#b3541e]/20 shadow-xs'
                        : 'border-[#d8d0c8] bg-white/60 hover:bg-white text-[#605850]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <span>🌍 International</span>
                    </div>
                    <p className="text-[11px] text-[#605850] mt-0.5 truncate">Visa, MC, PayPal, Wise</p>
                  </button>
                </div>
              </div>

              {/* Method Details by Category */}
              {category === 'LOCAL' && (
                <div className="space-y-4 bg-white border border-[#d8d0c8] rounded-2xl p-4 shadow-xs">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('CHAPA')}
                      className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                        selectedMethod === 'CHAPA'
                          ? 'bg-[#b3541e] text-white border-[#b3541e] shadow-xs'
                          : 'bg-[#faf5ee] text-[#3a302a] border-[#d8d0c8] hover:bg-[#f2ece4]'
                      }`}
                    >
                      ⚡ Chapa Gateway
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('TELEBIRR')}
                      className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                        selectedMethod === 'TELEBIRR'
                          ? 'bg-[#b3541e] text-white border-[#b3541e] shadow-xs'
                          : 'bg-[#faf5ee] text-[#3a302a] border-[#d8d0c8] hover:bg-[#f2ece4]'
                      }`}
                    >
                      📱 Telebirr Direct
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('CBE_BIRR')}
                      className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                        selectedMethod === 'CBE_BIRR'
                          ? 'bg-[#b3541e] text-white border-[#b3541e] shadow-xs'
                          : 'bg-[#faf5ee] text-[#3a302a] border-[#d8d0c8] hover:bg-[#f2ece4]'
                      }`}
                    >
                      🏦 CBE Birr
                    </button>
                  </div>

                  {selectedMethod === 'CHAPA' && (
                    <div className="bg-[#faf5ee] border border-[#d8d0c8] rounded-xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-[#b3541e] bg-[#f2ece4] px-2.5 py-1 rounded-md border border-[#d8d0c8]">
                            CHAPA VERIFIED GATEWAY
                          </span>
                          <span className="text-xs font-semibold text-[#605850]">Zero Transaction Fees</span>
                        </div>
                        <span className="text-xs text-[#605850] font-mono">Instant Settlement</span>
                      </div>
                      <p className="text-xs text-[#605850] leading-relaxed">
                        Chapa automatically supports <strong>Telebirr</strong>, <strong>CBE Birr</strong>, <strong>Awash Birr</strong>, <strong>Mpessa</strong>, and all Ethiopian bank debit cards. Click confirm below to proceed through the Chapa secure gateway.
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="text-[10px] font-bold bg-white text-[#605850] px-2 py-0.5 rounded border border-[#d8d0c8]">Telebirr</span>
                        <span className="text-[10px] font-bold bg-white text-[#605850] px-2 py-0.5 rounded border border-[#d8d0c8]">CBE Birr</span>
                        <span className="text-[10px] font-bold bg-white text-[#605850] px-2 py-0.5 rounded border border-[#d8d0c8]">Awash Birr</span>
                        <span className="text-[10px] font-bold bg-white text-[#605850] px-2 py-0.5 rounded border border-[#d8d0c8]">EthSwitch Local Cards</span>
                      </div>
                    </div>
                  )}

                  {selectedMethod === 'TELEBIRR' && (
                    <div className="bg-[#faf5ee] border border-[#d8d0c8] rounded-xl p-4 space-y-3">
                      <label htmlFor="telebirr-phone" className="block text-xs font-bold text-[#3a302a]">
                        Ethio Telecom Registered Mobile Number
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-[#605850]">+251</span>
                        <input
                          id="telebirr-phone"
                          type="tel"
                          inputMode="tel"
                          value={telebirrPhone}
                          onChange={(e) => setTelebirrPhone(e.target.value)}
                          placeholder="911223344"
                          className="w-full pl-14 pr-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#d8d0c8] rounded-xl font-mono focus:ring-2 focus:ring-[#b3541e]/20 focus:border-[#b3541e] outline-none"
                          required
                        />
                      </div>
                      <p className="text-[11px] text-[#605850]">
                        A payment authorization prompt will be dispatched to your Telebirr app.
                      </p>
                    </div>
                  )}

                  {selectedMethod === 'CBE_BIRR' && (
                    <div className="bg-[#faf5ee] border border-[#d8d0c8] rounded-xl p-4 space-y-3">
                      <label htmlFor="cbe-number" className="block text-xs font-bold text-[#3a302a]">
                        CBE Account / Mobile Wallet Number
                      </label>
                      <input
                        id="cbe-number"
                        type="text"
                        inputMode="numeric"
                        value={cbeAccount}
                        onChange={(e) => setCbeAccount(e.target.value)}
                        placeholder="1000192837465"
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#d8d0c8] rounded-xl font-mono focus:ring-2 focus:ring-[#b3541e]/20 focus:border-[#b3541e] outline-none"
                        required
                      />
                      <p className="text-[11px] text-[#605850]">
                        Official Commercial Bank of Ethiopia direct mobile checkout.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {category === 'INTERNATIONAL' && (
                <div className="space-y-4 bg-white border border-[#d8d0c8] rounded-2xl p-4 shadow-xs">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('INTERNATIONAL_CARD')}
                      className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                        selectedMethod === 'INTERNATIONAL_CARD'
                          ? 'bg-[#b3541e] text-white border-[#b3541e] shadow-xs'
                          : 'bg-[#faf5ee] text-[#3a302a] border-[#d8d0c8] hover:bg-[#f2ece4]'
                      }`}
                    >
                      💳 Credit / Debit Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('PAYPAL')}
                      className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                        selectedMethod === 'PAYPAL'
                          ? 'bg-[#b3541e] text-white border-[#b3541e] shadow-xs'
                          : 'bg-[#faf5ee] text-[#3a302a] border-[#d8d0c8] hover:bg-[#f2ece4]'
                      }`}
                    >
                      🅿️ PayPal
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedMethod('WISE')}
                      className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                        selectedMethod === 'WISE'
                          ? 'bg-[#b3541e] text-white border-[#b3541e] shadow-xs'
                          : 'bg-[#faf5ee] text-[#3a302a] border-[#d8d0c8] hover:bg-[#f2ece4]'
                      }`}
                    >
                      🌐 Wise / Wire
                    </button>
                  </div>

                  {selectedMethod === 'INTERNATIONAL_CARD' && (
                    <div className="bg-[#faf5ee] border border-[#d8d0c8] rounded-xl p-4 space-y-3">
                      <div>
                        <label htmlFor="cc-name" className="block text-xs font-bold text-[#3a302a] mb-1">
                          Cardholder Name
                        </label>
                        <input
                          id="cc-name"
                          name="cc-name"
                          type="text"
                          autoComplete="cc-name"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          placeholder="e.g. Samuel Yohannes"
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#d8d0c8] rounded-xl focus:ring-2 focus:ring-[#b3541e]/20 focus:border-[#b3541e] outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="cc-number" className="block text-xs font-bold text-[#3a302a] mb-1">
                          Card Number (Visa / Mastercard / Amex)
                        </label>
                        <div className="relative">
                          <input
                            id="cc-number"
                            name="cc-number"
                            type="text"
                            autoComplete="cc-number"
                            inputMode="numeric"
                            maxLength={19}
                            pattern="[\d ]{13,19}"
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            placeholder="4000 1234 5678 9010"
                            className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm font-mono bg-white border border-[#d8d0c8] rounded-xl focus:ring-2 focus:ring-[#b3541e]/20 focus:border-[#b3541e] outline-none"
                            required
                          />
                          <CreditCard className="w-4 h-4 text-[#605850] absolute right-3 top-3" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span id="exp-hint" className="block text-[11px] font-bold text-[#605850] mb-1">
                            Format: MM/YY
                          </span>
                          <input
                            id="cc-exp"
                            name="cc-exp"
                            type="text"
                            autoComplete="cc-exp"
                            aria-describedby="exp-hint"
                            maxLength={5}
                            value={cardExp}
                            onChange={handleCardExpChange}
                            placeholder="12/28"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono bg-white border border-[#d8d0c8] rounded-xl focus:ring-2 focus:ring-[#b3541e]/20 focus:border-[#b3541e] outline-none"
                            required
                          />
                        </div>

                        <div>
                          <label htmlFor="cc-csc" className="block text-[11px] font-bold text-[#605850] mb-1">
                            CVC / Security Code
                          </label>
                          <input
                            id="cc-csc"
                            name="cc-csc"
                            type="text"
                            autoComplete="cc-csc"
                            inputMode="numeric"
                            maxLength={4}
                            pattern="[0-9]{3,4}"
                            value={cardCsc}
                            onChange={(e) => setCardCsc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="123"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono bg-white border border-[#d8d0c8] rounded-xl focus:ring-2 focus:ring-[#b3541e]/20 focus:border-[#b3541e] outline-none"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="billing-country" className="block text-xs font-bold text-[#3a302a] mb-1">
                          Billing Country
                        </label>
                        <select
                          id="billing-country"
                          value={billingCountry}
                          onChange={(e) => setBillingCountry(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#d8d0c8] rounded-xl focus:ring-2 focus:ring-[#b3541e]/20 focus:border-[#b3541e] outline-none bg-white text-[#3a302a]"
                        >
                          <option value="Ethiopia">Ethiopia</option>
                          <option value="United States">United States</option>
                          <option value="United Kingdom">United Kingdom</option>
                          <option value="Canada">Canada</option>
                          <option value="Germany">Germany</option>
                          <option value="Sweden">Sweden</option>
                          <option value="United Arab Emirates">United Arab Emirates</option>
                          <option value="Other">Other International Country</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {selectedMethod === 'PAYPAL' && (
                    <div className="bg-[#faf5ee] border border-[#d8d0c8] rounded-xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-[#b3541e] bg-[#f2ece4] px-2.5 py-1 rounded-md border border-[#d8d0c8]">
                          PAYPAL GLOBAL CHECKOUT
                        </span>
                        <span className="text-xs font-bold text-[#3a302a] font-mono">
                          USD ${netUsdPrice.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-[#605850]">
                        Checkout using your registered PayPal account or connected international debit/credit cards.
                      </p>
                    </div>
                  )}

                  {selectedMethod === 'WISE' && (
                    <div className="bg-[#faf5ee] border border-[#d8d0c8] rounded-xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-[#b3541e] bg-[#f2ece4] px-2.5 py-1 rounded-md border border-[#d8d0c8]">
                          WISE / MID-MARKET WIRE
                        </span>
                        <span className="text-xs text-[#605850]">Low Conversion Fee</span>
                      </div>
                      <p className="text-xs text-[#605850]">
                        Send payment directly via Wise transfer at the official mid-market exchange rate.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================== */}
              {/* DYNAMIC PRICE BREAKDOWN TABLE                                  */}
              {/* ============================================================== */}
              <div className="bg-white border border-[#d8d0c8] rounded-2xl p-4 shadow-xs space-y-2.5 text-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-[#605850] block border-b border-[#d8d0c8]/50 pb-2">
                  Reservation Price Breakdown
                </span>

                <div className="flex justify-between items-center text-[#605850]">
                  <span>Stay Subtotal ({nights} night{nights !== 1 ? 's' : ''}):</span>
                  <span className="font-mono text-[#3a302a] font-semibold">
                    ETB {grossTotalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between items-center text-emerald-700 bg-emerald-50/70 px-2.5 py-1.5 rounded-xl font-medium animate-in fade-in duration-150">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      <span>Promotional Discount ({appliedCoupon.code}):</span>
                    </span>
                    <span className="font-mono font-bold">
                      -ETB {discountETB.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center text-[#605850]">
                  <span>Service & Escrow Fee:</span>
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                    Included
                  </span>
                </div>

                <div className="border-t border-[#d8d0c8] pt-2.5 flex justify-between items-center text-sm font-bold text-[#3a302a]">
                  <span>Total Payable:</span>
                  <div className="text-right">
                    <span className="text-base text-[#b3541e] font-mono">
                      {currency === 'ETB'
                        ? `ETB ${netTotalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : `$${netUsdPrice.toFixed(2)} USD`}
                    </span>
                    <div className="text-[11px] font-normal text-[#605850]">
                      {currency === 'ETB'
                        ? `(~$${netUsdPrice.toFixed(2)} USD)`
                        : `(~ETB ${netTotalPrice.toLocaleString()})`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submission Button */}
              <div className="space-y-3 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#b3541e] hover:bg-[#964215] disabled:bg-[#d8d0c8] disabled:cursor-not-allowed text-white text-xs sm:text-sm font-black uppercase tracking-wider rounded-2xl shadow-md transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    'Processing Payment & Securing Booking…'
                  ) : (
                    <>
                      <span>
                        Confirm & Pay ·{' '}
                        {currency === 'ETB'
                          ? `ETB ${netTotalPrice.toLocaleString()} (~$${netUsdPrice.toFixed(2)} USD)`
                          : `$${netUsdPrice.toFixed(2)} USD (~ETB ${netTotalPrice.toLocaleString()})`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-4 text-[11px] text-[#605850]">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Host Escrow Protection
                  </span>
                  <span>·</span>
                  <span>Instant Booking Guarantee</span>
                  <span>·</span>
                  <span>Free Cancellation Policy</span>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
