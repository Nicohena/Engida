import { Router } from "express";
import { prisma } from "../lib/prisma";
import { mockAuth } from "../middleware/mockAuth";

const router = Router();
router.use(mockAuth);

function fakeTransactionId() {
  return "TXN-" + Math.random().toString(36).slice(2, 10).toUpperCase();
}

// POST /api/payments/initiate
// body: { bookingId, method, phoneNumber, transactionReference? }
router.post("/initiate", async (req, res) => {
  const { bookingId, method, transactionReference } = req.body;
  const booking = await prisma.booking.findFirst({
    where: { id: Number(bookingId), guestId: req.userId },
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const payment = await prisma.payment.upsert({
    where: { bookingId: booking.id },
    update: {
      method,
      transactionId: transactionReference || fakeTransactionId(),
      status: "PENDING",
    },
    create: {
      bookingId: booking.id,
      amount: booking.totalPrice,
      method,
      transactionId: transactionReference || fakeTransactionId(),
      status: "PENDING",
    },
  });

  res.status(201).json(payment);
});

// POST /api/payments/verify
// body: { paymentId }  -> simulates provider callback, always succeeds
router.post("/verify", async (req, res) => {
  const { paymentId } = req.body;
  const payment = await prisma.payment.findUnique({ where: { id: Number(paymentId) } });
  if (!payment) return res.status(404).json({ error: "Payment not found" });

  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "SUCCESS", paidAt: new Date() },
  });

  const booking = await prisma.booking.update({
    where: { id: payment.bookingId },
    data: { status: "CONFIRMED" },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: req.userId!,
        title: "Payment successful",
        body: `Your payment of ETB ${payment.amount.toLocaleString()} was successful.`,
        type: "PAYMENT_SUCCESSFUL",
      },
      {
        userId: req.userId!,
        title: "Booking confirmed",
        body: `Your booking #${booking.id} is confirmed.`,
        type: "BOOKING_CONFIRMED",
      },
    ],
  });

  res.json({ payment: updatedPayment, booking });
});

// GET /api/payments/:id
router.get("/:id", async (req, res) => {
  const payment = await prisma.payment.findUnique({
    where: { id: Number(req.params.id) },
    include: { booking: { include: { property: true } } },
  });
  if (!payment) return res.status(404).json({ error: "Payment not found" });
  res.json(payment);
});

export default router;
