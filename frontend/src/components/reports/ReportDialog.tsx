'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Flag, Loader2, X } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import {
  REPORT_REASON_LABELS,
  type ReportReason,
  type ReportTargetType,
} from '../../types/admin';

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel?: string;
}

const REASONS = Object.keys(REPORT_REASON_LABELS) as ReportReason[];

export default function ReportDialog({
  open,
  onClose,
  targetType,
  targetId,
  targetLabel,
}: ReportDialogProps) {
  const [reason, setReason] = useState<ReportReason>('MISREPRESENTATION');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('MISREPRESENTATION');
      setDetails('');
      setSubmitting(false);
      setError(null);
      setSuccess(false);
    }
  }, [open, targetId, targetType]);

  if (!open) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (reason === 'OTHER' && details.trim().length < 5) {
      setError('Please describe the issue when selecting “Something else”.');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/reports', {
        method: 'POST',
        body: JSON.stringify({
          targetType,
          targetId,
          reason,
          details: details.trim() || undefined,
        }),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close report dialog"
        className="absolute inset-0 bg-[#252923]/50 backdrop-blur-[2px]"
        onClick={() => {
          if (!submitting) onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-dialog-heading"
        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E5E0D5]/70 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[#EEF3EF] p-2 text-[#a84d16]">
              <Flag className="h-5 w-5" />
            </div>
            <div>
              <h2 id="report-dialog-heading" className="text-base font-bold text-[#252923]">
                Report this {targetType === 'LISTING' ? 'listing' : 'review'}
              </h2>
              <p className="mt-0.5 text-xs text-[#73776F]">
                {targetLabel ? `About ${targetLabel}` : 'Our trust and safety team will review it.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-1.5 text-[#73776F] hover:bg-[#F8F5ED] disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="px-5 py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-[#252923]">Report received</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[#73776F]">
              Thank you. Our trust and safety team will review the {targetType === 'LISTING' ? 'listing' : 'review'} and take action if needed. You will not be identified to the other party.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-xl bg-[#b2531b] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#994413]"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col overflow-hidden">
            <div className="space-y-4 overflow-y-auto px-5 py-5">
              <div>
                <label htmlFor="report-reason" className="text-xs font-bold text-[#252923]">
                  What is wrong? <span className="text-rose-500">*</span>
                </label>
                <select
                  id="report-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value as ReportReason)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-[#E5E0D5] bg-[#F8F5ED]/60 px-3 text-sm text-[#252923] outline-none focus:border-[#b2531b] focus:bg-white focus:ring-2 focus:ring-[#b2531b]/15"
                >
                  {REASONS.map((value) => (
                    <option key={value} value={value}>
                      {REPORT_REASON_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="report-details" className="text-xs font-bold text-[#252923]">
                  Details{' '}
                  {reason === 'OTHER' ? (
                    <span className="text-rose-500">*</span>
                  ) : (
                    <span className="font-normal text-[#73776F]">(optional)</span>
                  )}
                </label>
                <textarea
                  id="report-details"
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Tell us what you noticed. Include any details that can help us investigate."
                  className="mt-1.5 w-full resize-none rounded-xl border border-[#E5E0D5] bg-[#F8F5ED]/60 px-3 py-2.5 text-sm text-[#252923] outline-none focus:border-[#b2531b] focus:bg-white focus:ring-2 focus:ring-[#b2531b]/15"
                />
                <div className="mt-1 flex justify-between text-[11px] text-[#73776F]">
                  <span>Reports are private and reviewed by admins.</span>
                  <span>{details.length}/2000</span>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#E5E0D5]/70 bg-[#F8F5ED]/50 px-5 py-3.5">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl border border-[#E5E0D5] bg-white px-4 py-2 text-sm font-semibold text-[#73776F] transition hover:bg-[#F8F5ED] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#b2531b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#994413] disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Flag className="h-4 w-4" />
                )}
                Submit report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
