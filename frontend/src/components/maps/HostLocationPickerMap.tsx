'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Loader2, MapPin } from 'lucide-react';
import type { LocationSelectedData } from './HostLocationPickerMapInner';

export type { LocationSelectedData };

interface HostLocationPickerMapProps {
  initialLat?: number | null;
  initialLng?: number | null;
  initialAddress?: string;
  initialCity?: string;
  initialSubCity?: string;
  initialNeighborhood?: string;
  onLocationChange: (data: LocationSelectedData) => void;
}

// Next.js dynamic import with ssr: false to prevent Leaflet window is undefined errors
const HostLocationPickerMapInner = dynamic(
  () => import('./HostLocationPickerMapInner'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-80 rounded-2xl border border-[#E5E0D5] bg-[#F8F5ED] flex flex-col items-center justify-center gap-3 text-center p-6 animate-pulse">
        <div className="w-12 h-12 rounded-2xl bg-[#234B36]/10 flex items-center justify-center">
          <MapPin className="w-6 h-6 text-[#234B36]" />
        </div>
        <div>
          <p className="text-xs font-bold text-[#252923] flex items-center justify-center gap-2">
            <Loader2 className="w-3.5 h-3.5 text-[#234B36] animate-spin" />
            Loading Interactive Property Map…
          </p>
          <p className="text-[11px] text-[#73776F] mt-0.5">Connecting to real Ethiopian street & landmark coordinates</p>
        </div>
      </div>
    ),
  }
);

export default function HostLocationPickerMap(props: HostLocationPickerMapProps) {
  return <HostLocationPickerMapInner {...props} />;
}
