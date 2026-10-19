import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Loader2, Smartphone } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input, Label } from "../components/ui/Input";
import { api, formatETB } from "../lib/api";
import type { Booking, PaymentMethod } from "../types";

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "TELEBIRR", label: "Telebirr" },
  { value: "CHAPA", label: "Chapa" },
  { value: "CBE", label: "Commercial Bank" },
  { value: "DASHEN", label: "Dashen Bank" },
];

type Stage = "form" | "loading" | "success";

export default function Payment() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("TELEBIRR");
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [stage, setStage] = useState<Stage>("form");
  const [confirmedPayment, setConfirmedPayment] = useState<{ transactionId?: string } | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    api.getBooking(bookingId).then(setBooking);
  }, [bookingId]);

  async function handlePay() {
    if (!booking) return;
    setStage("loading");
    try {
      const payment = await api.initiatePayment({
        bookingId: booking.id,
        method,
        phoneNumber: phone,
        transactionReference: reference || undefined,
      });
      // Simulated verification — always succeeds
      const result = await api.verifyPayment(payment.id);
      setConfirmedPayment(result.payment);
      setStage("success");
    } catch (e) {
      setStage("form");
    }
  }

  if (!booking) return <div className="mx-auto max-w-3xl px-4 py-12 text-slate-500 sm:px-6">Loading…</div>;

  if (stage === "success") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center sm:px-6">
        <CheckCircle2 size={64} className="text-emerald-500" />
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Booking Confirmed</h1>
        <p className="mt-2 text-slate-500">Your stay at {booking.property?.title} is all set.</p>

        <Card className="mt-6 w-full p-5 text-left text-sm">
          <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Booking ID</span><span className="font-semibold">#{booking.id}</span></div>
          <div className="flex justify-between pt-2"><span className="text-slate-500">Transaction ID</span><span className="font-semibold">{confirmedPayment?.transactionId}</span></div>
        </Card>

        <div className="mt-6 flex w-full gap-3">
          <Button className="flex-1" variant="secondary" onClick={() => window.print()}>Download Receipt</Button>
          <Button className="flex-1" onClick={() => (window.location.href = "/trips")}>View My Trips</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Payment</h1>

      <Card className="mb-6 flex items-center gap-4 p-4">
        {booking.property?.images?.[0] && (
          <img src={booking.property.images[0].imageUrl} className="h-16 w-20 rounded-xl object-cover" />
        )}
        <div className="flex-1">
          <p className="font-semibold text-slate-900">{booking.property?.title}</p>
          <p className="text-sm text-slate-500">{booking.nights} nights · {booking.guests} guests</p>
        </div>
        <p className="font-bold text-primary">{formatETB(booking.totalPrice)}</p>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-bold text-slate-900">Payment Method</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {METHODS.map((m) => (
            <label
              key={m.value}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-sm font-medium transition ${
                method === m.value ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-600"
              }`}
            >
              <input type="radio" className="hidden" checked={method === m.value} onChange={() => setMethod(m.value)} />
              {m.label}
            </label>
          ))}
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <Label>Phone Number</Label>
            <div className="flex items-center gap-2">
              <Smartphone size={18} className="text-slate-400" />
              <Input placeholder="+251 9xx xxx xxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Transaction Reference (optional)</Label>
            <Input placeholder="Optional reference code" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
        </div>

        <Button className="mt-6 w-full" size="lg" disabled={stage === "loading"} onClick={handlePay}>
          {stage === "loading" ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Processing payment…
            </>
          ) : (
            `Pay ${formatETB(booking.totalPrice)}`
          )}
        </Button>
        <p className="mt-3 text-center text-xs text-slate-400">
          This is a simulated payment flow — no real payment provider is integrated.
        </p>
      </Card>
    </div>
  );
}
