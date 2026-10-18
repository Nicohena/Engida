import type { Review } from '../../types';

interface Props { reviews: Review[] }

export default function PropertyReviews({ reviews }: Props) {
  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length
    : null;

  return (
    <section aria-labelledby="property-reviews-title" className="border-b border-slate-100 py-8">
      <div className="mb-5">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#2563eb]">Guest feedback</p>
        <h2 id="property-reviews-title" className="mt-1 text-xl font-extrabold text-slate-900 sm:text-2xl">
          Reviews {average !== null && <span className="text-base font-semibold text-slate-500">· {average.toFixed(1)} / 5 · {reviews.length}</span>}
        </h2>
      </div>
      {reviews.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No guest reviews have been submitted for this listing.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-5">
          {reviews.map((review) => (
            <li key={review.id} className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{review.user?.name || 'Guest'}</p>
                <p className="text-sm font-bold text-amber-600" aria-label={`${review.rating} out of 5 stars`}>
                  {'★'.repeat(Math.max(0, Math.min(5, Number(review.rating))))}{'☆'.repeat(5 - Math.max(0, Math.min(5, Number(review.rating))))}
                  <span className="ml-2 text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                </p>
              </div>
              {review.comment && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{review.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
