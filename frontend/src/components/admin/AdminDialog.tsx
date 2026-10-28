'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface AdminDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'md' | 'lg';
}

export default function AdminDialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'md',
}: AdminDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      'input:not([type="hidden"]), textarea, select, button',
    );
    focusable?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="admin-sheet-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-dialog-title"
        className={`admin-sheet ${width === 'lg' ? 'sm:max-w-[52rem]' : ''}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#d8d0c8] pb-4">
          <div className="min-w-0">
            <h2 id="admin-dialog-title" className="admin-sheet-title">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-xs leading-5 text-[#605850]">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="admin-btn admin-btn-ghost -mr-2 -mt-1 h-9 w-9 shrink-0 p-0"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>
        <div className="py-4">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#d8d0c8] pt-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
