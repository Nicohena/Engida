import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { api, formatETB, formatDate } from "../lib/api";
import type { Booking } from "../types";

type Tab = "upcoming" | "completed" | "cancelled";

export default function MyTrips() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [loading, setLoading] = useState(true);
  const [reviewFor, setReviewFor] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  function load() {
    setLoading(true);
    api.getBookings().then(setBookings).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const grouped = {
    upcoming: bookings.filter((b) => b.status === "CONFIRMED" || b.status === "PENDING"),
    completed: bookings.filter((b) => b.status === "COMPLETED"),
    cancelled: bookings.filter((b) => b.status === "CANCELLED"),
  };

  async function handleCancel(id: number) {
    await api.cancelBooking(id);
    load();
  }

  async function submitReview() {
    if (!reviewFor) return;
    await api.createReview({ bookingId: reviewFor.id, rating, comment });
    setReviewFor(null);
    setComment("");
    setRating(5);
    load();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">My Trips</h1>

      <div className="mb-6 flex gap-2 border-b border-slate-200">
        {(["upcoming", "completed", "cancelled"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-2 text-sm font-medium capitalize transition ${
              tab === t ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t} ({grouped[t].length})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading trips…</p>
      ) : grouped[tab].length === 0 ? (
        <Card className="p-10 text-center text-slate-500">No {tab} trips yet.</Card>
      ) : (
        <div className="space-y-4">
          {grouped[tab].map((b) => (
            <Card key={b.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              {b.property?.images?.[0] && (
                <img src={b.property.images[0].imageUrl} className="h-28 w-full rounded-xl object-cover sm:h-24 sm:w-32" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{b.property?.title}</h3>
                  <Badge
                    variant={
                      b.status === "CONFIRMED" ? "success" : b.status === "CANCELLED" ? "danger" : b.status === "COMPLETED" ? "primary" : "warning"
                    }
                  >
                    {b.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDate(b.checkIn)} → {formatDate(b.checkOut)} · {b.nights} nights
                </p>
                <p className="mt-1 text-sm font-semibold text-primary">{formatETB(b.totalPrice)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link to={`/property/${b.propertyId}`}>
                  <Button variant="outline" size="sm">View Details</Button>
                </Link>
                {tab === "upcoming" && b.status === "CONFIRMED" && (
                  <Button variant="ghost" size="sm" onClick={() => handleCancel(b.id)}>Cancel</Button>
                )}
                {tab === "completed" && !b.review && (
                  <Button size="sm" onClick={() => setReviewFor(b)}>Leave Review</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Review modal */}
      {reviewFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md p-6">
            <h2 className="mb-1 font-bold text-slate-900">Review your stay</h2>
            <p className="mb-4 text-sm text-slate-500">{reviewFor.property?.title}</p>
            <div className="mb-4 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)}>
                  <Star size={26} className={n <= rating ? "fill-accent text-accent" : "text-slate-300"} />
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience…"
              rows={4}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-primary"
            />
            <div className="mt-4 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setReviewFor(null)}>Cancel</Button>
              <Button className="flex-1" onClick={submitReview}>Submit Review</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
