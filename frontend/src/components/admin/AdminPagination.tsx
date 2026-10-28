import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AdminPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
  itemLabel?: string;
}

export default function AdminPagination({
  page,
  totalPages,
  total,
  onChange,
  itemLabel = 'items',
}: AdminPaginationProps) {
  if (total === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#d8d0c8] px-3 py-2.5 text-xs text-[#605850]">
      <p className="admin-numeric">
        {total.toLocaleString('en-US')} {itemLabel} · page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="admin-btn admin-btn-secondary h-8 min-h-8 px-2.5"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-secondary h-8 min-h-8 px-2.5"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
