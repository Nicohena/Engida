import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Star, ShieldCheck, MapPin, Wifi, Car, UtensilsCrossed, Tv, ShowerHead,
  Briefcase, DoorOpen, Coffee, Waves, Wind,
} from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { api, formatETB } from "../lib/api";
import type { Property } from "../types";

const AMENITY_ICONS: Record<string, any> = {
  wifi: Wifi,
  car: Car,
  coffee: Coffee,
  waves: Waves,
  utensils: UtensilsCrossed,
  wind: Wind,
  tv: Tv,
  "shower-head": ShowerHead,
  briefcase: Briefcase,
  "door-open": DoorOpen,
};

const NIGHTS_DEFAULT = 3;
const SERVICE_FEE = 350;

export default function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .getProperty(id)
      .then(setProperty)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-12 text-slate-500 sm:px-6">Loading property…</div>;
  if (!property) return <div className="mx-auto max-w-7xl px-4 py-12 text-slate-500 sm:px-6">Property not found.</div>;

  const nights = NIGHTS_DEFAULT;
  const roomTotal = property.price * nights;
  const total = roomTotal + SERVICE_FEE;
  const isVerified = property.trustScore >= 80;
  const images = property.images.length ? property.images : [{ id: 0, imageUrl: "" }];

  // Static demo dates: today+ a range with a few "unavailable" blocked out for the calendar preview
  const today = new Date();
  const calendarDays = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return { date: d, unavailable: i === 2 || i === 8 };
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Gallery */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:grid-rows-2">
        <div className="sm:col-span-2 sm:row-span-2">
          <img
            src={images[activeImage]?.imageUrl}
            alt={property.title}
            className="h-64 w-full rounded-2xl object-cover sm:h-full"
          />
        </div>
        {images.slice(0, 4).map((img, i) => (
          <button key={img.id} onClick={() => setActiveImage(i)} className="hidden sm:block">
            <img src={img.imageUrl} alt="" className="h-full max-h-32 w-full rounded-2xl object-cover" />
          </button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        {/* Main info */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{property.title}</h1>
              <p className="mt-1 flex items-center gap-1 text-slate-500">
                <MapPin size={15} /> {property.address}, {property.city}, {property.region}
              </p>
            </div>
            {isVerified && (
              <Badge variant="primary">
                <ShieldCheck size={13} /> Verified
              </Badge>
            )}
          </div>

          <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-1 font-semibold text-slate-800">
              <Star size={15} className="fill-accent text-accent" /> {property.rating.toFixed(1)}
            </span>
            <span>{property.reviews?.length ?? 0} reviews</span>
            <span>Trust score: {property.trustScore}</span>
          </div>

          <hr className="my-6 border-slate-100" />

          <h2 className="mb-2 text-lg font-bold text-slate-900">About this property</h2>
          <p className="leading-relaxed text-slate-600">{property.description}</p>

          <hr className="my-6 border-slate-100" />

          <h2 className="mb-3 text-lg font-bold text-slate-900">Amenities</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {property.amenities.map(({ amenity }) => {
              const Icon = AMENITY_ICONS[amenity.icon] || Wifi;
              return (
                <div key={amenity.id} className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2.5 text-sm text-slate-700">
                  <Icon size={16} className="text-primary" /> {amenity.name}
                </div>
              );
            })}
          </div>

          <hr className="my-6 border-slate-100" />

          <h2 className="mb-3 text-lg font-bold text-slate-900">House Rules</h2>
          <ul className="space-y-1.5 text-sm text-slate-600">
            <li>Check-in: 2:00 PM</li>
            <li>Check-out: 11:00 AM</li>
            <li>No smoking</li>
            <li>No pets</li>
          </ul>

          <hr className="my-6 border-slate-100" />

          <h2 className="mb-3 text-lg font-bold text-slate-900">Availability</h2>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map(({ date, unavailable }) => (
              <div
                key={date.toISOString()}
                className={`rounded-lg py-2 text-center text-xs font-medium ${
                  unavailable ? "cursor-not-allowed bg-slate-100 text-slate-300 line-through" : "bg-primary/10 text-primary"
                }`}
              >
                {date.getDate()}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">Highlighted dates are available. Greyed-out dates are already booked.</p>

          {property.reviews && property.reviews.length > 0 && (
            <>
              <hr className="my-6 border-slate-100" />
              <h2 className="mb-3 text-lg font-bold text-slate-900">Reviews</h2>
              <div className="space-y-4">
                {property.reviews.slice(0, 4).map((r) => (
                  <div key={r.id} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-800">
                        {r.guest?.firstName} {r.guest?.lastName}
                      </p>
                      <span className="flex items-center gap-1 text-sm text-slate-600">
                        <Star size={13} className="fill-accent text-accent" /> {r.rating}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{r.comment}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Price card */}
        <Card className="h-fit p-5 lg:sticky lg:top-24">
          <p className="text-2xl font-extrabold text-slate-900">
            {formatETB(property.price)} <span className="text-sm font-normal text-slate-500">/night</span>
          </p>
          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Nightly Price</span>
              <span>{formatETB(property.price)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Nights</span>
              <span>{nights}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Service Fee</span>
              <span>{formatETB(SERVICE_FEE)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-900">
              <span>Total</span>
              <span>{formatETB(total)}</span>
            </div>
          </div>
          <Button className="mt-5 w-full" size="lg" onClick={() => navigate(`/booking/${property.id}`)}>
            Reserve Now
          </Button>
        </Card>
      </div>
    </div>
  );
}
