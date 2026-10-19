import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input, Label } from "../components/ui/Input";
import { api, formatETB, formatDate } from "../lib/api";
import type { Property, Profile } from "../types";

const SERVICE_FEE = 350;
const DEFAULT_NIGHTS = 3;

export default function Booking() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [guests, setGuests] = useState(2);

  const today = new Date();
  const checkIn = new Date(today);
  checkIn.setDate(checkIn.getDate() + 7);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + DEFAULT_NIGHTS);

  useEffect(() => {
    if (!propertyId) return;
    Promise.all([api.getProperty(propertyId), api.getProfile()]).then(([p, prof]) => {
      setProperty(p);
      setProfile(prof);
      setFullName(`${prof.firstName} ${prof.lastName}`);
      setPhone(prof.phone);
      setEmail(prof.email);
    });
  }, [propertyId]);

  if (!property || !profile) {
    return <div className="mx-auto max-w-4xl px-4 py-12 text-slate-500 sm:px-6">Loading booking details…</div>;
  }

  const roomTotal = property.price * DEFAULT_NIGHTS;
  const tax = 0;
  const total = roomTotal + SERVICE_FEE + tax;

  async function handleContinue() {
    if (!agree) {
      setError("Please agree to the cancellation policy to continue.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const booking = await api.createBooking({
        propertyId: property!.id,
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        guests,
      });
      navigate(`/payment/${booking.id}`);
    } catch (e: any) {
      setError(e.message || "Could not create booking.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Confirm and pay</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-4 font-bold text-slate-900">Guest Information</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label>Guests</Label>
                <Input type="number" min={1} value={guests} onChange={(e) => setGuests(Number(e.target.value))} />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 font-bold text-slate-900">Booking Summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Property</dt><dd className="font-medium text-slate-800">{property.title}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Room</dt><dd className="font-medium text-slate-800">Standard</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Guests</dt><dd className="font-medium text-slate-800">{guests}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Check-in</dt><dd className="font-medium text-slate-800">{formatDate(checkIn.toISOString())}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Check-out</dt><dd className="font-medium text-slate-800">{formatDate(checkOut.toISOString())}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Nights</dt><dd className="font-medium text-slate-800">{DEFAULT_NIGHTS}</dd></div>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-bold text-slate-900">Cancellation Policy</h2>
            <p className="text-sm text-slate-600">Free cancellation up to 48 hours before check-in.</p>
            <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="accent-primary" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              I agree to the cancellation policy.
            </label>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </Card>
        </div>

        <Card className="h-fit p-5">
          <h2 className="mb-3 font-bold text-slate-900">Price Breakdown</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Room</dt><dd>{formatETB(roomTotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Service Fee</dt><dd>{formatETB(SERVICE_FEE)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Tax</dt><dd>{formatETB(tax)}</dd></div>
            <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-900"><dt>Total</dt><dd>{formatETB(total)}</dd></div>
          </dl>
          <Button className="mt-5 w-full" size="lg" disabled={submitting} onClick={handleContinue}>
            {submitting ? "Processing…" : "Continue to Payment"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
