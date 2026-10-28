import React from 'react';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const TONES: Record<Tone, string> = {
  neutral: 'border-[#d8d0c8] bg-[#f2ece4] text-[#605850]',
  accent: 'border-[#e7c9b4] bg-[#f8e9dd] text-[#934313]',
  success: 'border-[#d6dfcd] bg-[#edf1e8] text-[#536b4a]',
  warning: 'border-[#ecd9c2] bg-[#f7ebda] text-[#95631f]',
  danger: 'border-[#ebd0c9] bg-[#f8e9e5] text-[#9a3f33]',
};

interface AdminStatusBadgeProps {
  label: string;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}

export default function AdminStatusBadge({
  label,
  tone = 'neutral',
  dot = false,
  className = '',
}: AdminStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${TONES[tone]} ${className}`}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {label}
    </span>
  );
}
