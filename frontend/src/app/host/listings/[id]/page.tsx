'use client';

import { useParams } from 'next/navigation';

/**
 * /host/listings/[id]
 * Listing detail view — implemented in Step 5C.
 */
export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();

  return (
    <div className="p-6 md:p-10">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-black text-[#000000] mb-2">Listing Detail</h1>
        <p className="text-[#64748B] text-sm mb-2">ID: <code className="font-mono text-xs">{params.id}</code></p>
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-10 text-center mt-6">
          <div className="w-14 h-14 rounded-2xl bg-[#E3EAF5] flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🏠</span>
          </div>
          <h2 className="text-lg font-bold text-[#000000] mb-2">Listing Detail View</h2>
          <p className="text-sm text-[#64748B]">
            Coming in the next step — full listing detail with status management,
            availability, and reservation overview.
          </p>
        </div>
      </div>
    </div>
  );
}
