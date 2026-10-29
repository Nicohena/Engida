'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { apiFetch } from '../../../lib/api';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import {
  CouponDiscountType,
  CouponItem,
  CouponRedemptionItem,
} from '../../../types/admin-growth';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal for new/edit coupon
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    code: '',
    description: '',
    discountType: 'PERCENTAGE' as CouponDiscountType,
    discountValue: 10,
    minBookingAmountMinor: 100000, // 1,000 ETB
    maxDiscountAmountMinor: 250000, // 2,500 ETB cap
    startsAt: new Date().toISOString().slice(0, 16),
    expiresAt: '',
    maxRedemptions: 100,
    perUserLimit: 1,
    isActive: true,
  });

  // Drawer for inspecting redemptions
  const [inspectingCoupon, setInspectingCoupon] = useState<CouponItem | null>(null);

  const loadCoupons = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<CouponItem[]>('/admin/coupons');
      setCoupons(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load promotional coupons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const handleToggleActive = async (id: string) => {
    try {
      await apiFetch(`/admin/coupons/${id}/toggle-active`, { method: 'POST' });
      await loadCoupons();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error updating coupon state');
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete promo code "${code}"?`)) return;
    try {
      await apiFetch(`/admin/coupons/${id}`, { method: 'DELETE' });
      await loadCoupons();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete coupon');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Record<string, unknown> = {
        code: form.code.trim().toUpperCase(),
        description: form.description || null,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minBookingAmountMinor: Number(form.minBookingAmountMinor),
        maxDiscountAmountMinor: form.maxDiscountAmountMinor
          ? Number(form.maxDiscountAmountMinor)
          : null,
        startsAt: form.startsAt ? new Date(form.startsAt) : new Date(),
        expiresAt: form.expiresAt ? new Date(form.expiresAt) : null,
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
        perUserLimit: Number(form.perUserLimit),
        isActive: form.isActive,
      };

      await apiFetch('/admin/coupons', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setModalOpen(false);
      await loadCoupons();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create coupon');
    }
  };

  // Performance calculations
  const totalRedemptions = coupons.reduce((sum, c) => sum + (c.redemptionsCount || 0), 0);
  const activeCount = coupons.filter((c) => c.isActive).length;

  const filteredCoupons = coupons.filter((c) => {
    const matchesSearch =
      searchQuery === '' ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter =
      filterActive === 'ALL' ||
      (filterActive === 'ACTIVE' && c.isActive) ||
      (filterActive === 'INACTIVE' && !c.isActive);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Coupons & Promotional Discounts"
        description="Configure promo codes, percentage or fixed-amount discounts, and automated redemption constraints."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadCoupons()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#605850] bg-white border border-[#d8d0c8] rounded-lg hover:text-[#3a302a] hover:bg-[#faf5ee] transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => {
                setForm({
                  code: '',
                  description: '',
                  discountType: 'PERCENTAGE',
                  discountValue: 10,
                  minBookingAmountMinor: 100000,
                  maxDiscountAmountMinor: 250000,
                  startsAt: new Date().toISOString().slice(0, 16),
                  expiresAt: '',
                  maxRedemptions: 100,
                  perUserLimit: 1,
                  isActive: true,
                });
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#b3541e] rounded-lg hover:bg-[#964215] transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Promo Code
            </button>
          </div>
        }
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-[#d8d0c8] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#605850]">
            <span className="font-semibold uppercase tracking-wider">Active Campaigns</span>
            <Tag className="w-4 h-4 text-[#b3541e]" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-[#3a302a]">
              {activeCount}
            </span>
            <span className="text-xs text-[#605850]">of {coupons.length} codes</span>
          </div>
        </div>

        <div className="bg-white border border-[#d8d0c8] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#605850]">
            <span className="font-semibold uppercase tracking-wider">Total Redemptions</span>
            <Users className="w-4 h-4 text-[#b3541e]" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-[#3a302a]">
              {totalRedemptions}
            </span>
            <span className="text-xs text-emerald-600 font-medium">Applied to bookings</span>
          </div>
        </div>

        <div className="bg-white border border-[#d8d0c8] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#605850]">
            <span className="font-semibold uppercase tracking-wider">Default Currency</span>
            <Sparkles className="w-4 h-4 text-[#b3541e]" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-bold text-[#3a302a]">ETB</span>
            <span className="text-xs text-[#605850]">Ethiopian Birr</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-[#d8d0c8] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#605850]" />
          <input
            type="text"
            placeholder="Search coupon codes or descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#faf5ee] border border-[#d8d0c8] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterActive(filter)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                filterActive === filter
                  ? 'bg-[#3a302a] text-white'
                  : 'bg-[#faf5ee] text-[#605850] hover:text-[#3a302a]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white border border-[#d8d0c8] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#faf5ee] border-b border-[#d8d0c8] text-[#605850] uppercase tracking-wider font-semibold text-[11px]">
                <th className="py-3 px-4">Coupon Code</th>
                <th className="py-3 px-4">Discount</th>
                <th className="py-3 px-4">Usage Progress</th>
                <th className="py-3 px-4">Min. Booking</th>
                <th className="py-3 px-4">Validity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2ece4]">
              {filteredCoupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-[#faf5ee]/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-[#3a302a] bg-[#faf5ee] border border-[#d8d0c8] px-2 py-0.5 rounded">
                        {coupon.code}
                      </span>
                    </div>
                    {coupon.description && (
                      <p className="mt-1 text-[#605850] text-[11px] max-w-xs truncate">
                        {coupon.description}
                      </p>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#b3541e]">
                    {coupon.discountType === 'PERCENTAGE' ? (
                      <span>{coupon.discountValue}% OFF</span>
                    ) : (
                      <span>
                        {(Number(coupon.discountValue) / 100).toFixed(2)} {coupon.currency}
                      </span>
                    )}
                    {coupon.maxDiscountAmountMinor && coupon.discountType === 'PERCENTAGE' && (
                      <span className="block text-[10px] text-[#605850] font-normal">
                        Max: {(Number(coupon.maxDiscountAmountMinor) / 100).toFixed(2)} ETB
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="space-y-1 max-w-[140px]">
                      <div className="flex justify-between text-[11px] text-[#605850]">
                        <span>{coupon.redemptionsCount} redeemed</span>
                        {coupon.maxRedemptions && <span>/ {coupon.maxRedemptions}</span>}
                      </div>
                      {coupon.maxRedemptions && (
                        <div className="w-full bg-[#f2ece4] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#b3541e] h-full rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                (coupon.redemptionsCount / coupon.maxRedemptions) * 100,
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-[#605850]">
                    {Number(coupon.minBookingAmountMinor) > 0 ? (
                      <span>
                        {(Number(coupon.minBookingAmountMinor) / 100).toFixed(2)}{' '}
                        {coupon.currency}
                      </span>
                    ) : (
                      <span className="text-zinc-400">No minimum</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-[#605850]">
                    <div className="text-[11px]">
                      {coupon.expiresAt ? (
                        <span>
                          Expires {new Date(coupon.expiresAt).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium">No expiry</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => handleToggleActive(coupon.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                        coupon.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200'
                      }`}
                    >
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setInspectingCoupon(coupon)}
                        className="px-2.5 py-1 text-xs font-semibold text-[#b3541e] hover:bg-[#faf5ee] border border-[#d8d0c8] rounded-lg transition-colors"
                      >
                        Redemptions
                      </button>
                      <button
                        onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                        className="p-1 text-[#605850] hover:text-red-600 transition-colors"
                        title="Delete code"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCoupons.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#605850]">
                    No promotional coupons found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL: CREATE COUPON ================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#d8d0c8] p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#f2ece4] pb-4">
              <h3 className="font-serif text-xl font-bold text-[#3a302a]">
                Create Promotional Code
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#605850] hover:text-[#3a302a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCoupon} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#3a302a] block mb-1">
                    Coupon Code (Uppercase)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ENQUTATASH26"
                    value={form.code}
                    onChange={(e) =>
                      setForm({ ...form, code: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] uppercase font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#3a302a] block mb-1">
                    Discount Type
                  </label>
                  <select
                    value={form.discountType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        discountType: e.target.value as CouponDiscountType,
                      })
                    }
                    className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed Amount (ETB)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#3a302a] block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. 15% discount on all holiday reservations in Bishoftu"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#3a302a] block mb-1">
                    {form.discountType === 'PERCENTAGE'
                      ? 'Discount Percentage (%)'
                      : 'Discount Value (in minor units, e.g. 50000 = 500 ETB)'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={form.discountType === 'PERCENTAGE' ? 100 : undefined}
                    value={form.discountValue}
                    onChange={(e) =>
                      setForm({ ...form, discountValue: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#3a302a] block mb-1">
                    Min Booking Spend (minor, e.g. 100000 = 1000 ETB)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.minBookingAmountMinor}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        minBookingAmountMinor: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#3a302a] block mb-1">
                    Maximum Total Redemptions (Optional)
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 100"
                    value={form.maxRedemptions || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        maxRedemptions: e.target.value ? Number(e.target.value) : 100,
                      })
                    }
                    className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#3a302a] block mb-1">
                    Per-User Limit
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.perUserLimit}
                    onChange={(e) =>
                      setForm({ ...form, perUserLimit: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#3a302a] block mb-1">
                  Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className="w-full px-3 py-2 border border-[#d8d0c8] rounded-lg bg-[#faf5ee] focus:outline-none focus:ring-1 focus:ring-[#b3541e]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#f2ece4]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-[#d8d0c8] rounded-lg text-[#605850] hover:bg-[#faf5ee]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#b3541e] text-white rounded-lg hover:bg-[#964215] font-semibold"
                >
                  Save Promo Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: REDEMPTIONS INSPECTOR ================= */}
      {inspectingCoupon && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-[#d8d0c8] p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#f2ece4] pb-4">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#3a302a]">
                  Redemptions: {inspectingCoupon.code}
                </h3>
                <p className="text-xs text-[#605850]">
                  Track guest bookings that successfully applied this promotion.
                </p>
              </div>
              <button
                onClick={() => setInspectingCoupon(null)}
                className="text-[#605850] hover:text-[#3a302a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 max-h-80 overflow-y-auto divide-y divide-[#f2ece4]">
              {inspectingCoupon.redemptions && inspectingCoupon.redemptions.length > 0 ? (
                inspectingCoupon.redemptions.map((r) => (
                  <div key={r.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[#3a302a]">
                        {r.user?.firstName} {r.user?.lastName}
                      </span>
                      <span className="block text-[11px] text-[#605850]">
                        User ID: {r.userId}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {new Date(r.redeemedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[#b3541e]">
                        -{(Number(r.discountAmountMinor) / 100).toFixed(2)} ETB
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-[#605850]">
                  No redemptions recorded for this promotional code yet.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-[#f2ece4]">
              <button
                onClick={() => setInspectingCoupon(null)}
                className="px-4 py-2 border border-[#d8d0c8] rounded-lg text-[#605850] hover:bg-[#faf5ee] text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
