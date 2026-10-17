import Link from 'next/link';
import {
  Building2,
  CalendarCheck,
  CalendarOff,
  ChartNoAxesCombined,
  ImageUp,
  ListChecks,
} from 'lucide-react';

const HOST_FEATURES = [
  {
    title: 'Create and manage listings',
    description: 'Create rental or sale listings, save drafts, and manage their publication status.',
    icon: Building2,
  },
  {
    title: 'Upload property photos',
    description: 'Add cover and gallery photos from the listing editor using the connected media service.',
    icon: ImageUp,
  },
  {
    title: 'Control rental availability',
    description: 'Add or remove date blocks for rental properties and prevent overlapping blocks.',
    icon: CalendarOff,
  },
  {
    title: 'Manage reservations',
    description: 'Review reservations for your own properties and apply allowed status changes.',
    icon: CalendarCheck,
  },
  {
    title: 'Track host activity',
    description: 'View listing, reservation, and booking-value summaries in the host dashboard.',
    icon: ChartNoAxesCombined,
  },
  {
    title: 'Keep account and host roles together',
    description: 'Use one ENGIDA user account as both a guest and a host; host access is linked to your host profile.',
    icon: ListChecks,
  },
];

export default function HostEarningsSection() {
  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#2563eb] text-xs font-bold mb-3">
          <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
          <span>Host tools available in ENGIDA</span>
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
          Manage your property from one host portal
        </h2>
        <p className="mt-2.5 text-xs sm:text-sm text-slate-500 font-normal leading-relaxed">
          Create and manage property listings, availability, photos, and reservations. ENGIDA does not currently process host payouts or provide earnings forecasts.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {HOST_FEATURES.map(({ title, description, icon: Icon }) => (
          <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#2563eb]">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">{description}</p>
          </article>
        ))}
      </div>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/become-a-host" className="rounded-xl bg-[#2563eb] px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-blue-700 shadow-sm shadow-blue-500/20">
          Start hosting
        </Link>
        <Link href="/host/dashboard" className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          Open host portal
        </Link>
      </div>
    </section>
  );
}
