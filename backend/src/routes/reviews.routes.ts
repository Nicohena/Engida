import { Router } from "express";
import { prisma } from "../lib/prisma";
import { mockAuth } from "../middleware/mockAuth";

const router = Router();

// POST /api/reviews   body: { bookingId, rating, comment }
router.post("/", mockAuth, async (req, res) => {
  const { bookingId, rating, comment } = req.body;
  if (!bookingId || !rating) {
    return res.status(400).json({ error: "bookingId and rating are required" });
  }
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: "rating must be between 1 and 5" });
  }

  const booking = await prisma.booking.findFirst({
    where: { id: Number(bookingId), guestId: req.userId },
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  // Rule: only completed bookings can be reviewed
  if (booking.status !== "COMPLETED") {
    return res.status(400).json({ error: "Only completed bookings can be reviewed" });
  }

  const existing = await prisma.review.findUnique({ where: { bookingId: booking.id } });
  if (existing) return res.status(409).json({ error: "Booking already reviewed" });

  const review = await prisma.review.create({
    data: {
      bookingId: booking.id,
      guestId: req.userId!,
      propertyId: booking.propertyId,
      rating: Number(rating),
      comment: comment || "",
    },
  });

  // Recalculate property's average rating
  const agg = await prisma.review.aggregate({
    where: { propertyId: booking.propertyId },
    _avg: { rating: true },
  });
  await prisma.property.update({
    where: { id: booking.propertyId },
    data: { rating: Math.round((agg._avg.rating || 0) * 10) / 10 },
  });

  res.status(201).json(review);
});

// GET /api/properties/:id/reviews  -- mounted separately in index.ts under /api/properties/:id/reviews
router.get("/property/:propertyId", async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { propertyId: Number(req.params.propertyId) },
    include: { guest: { select: { firstName: true, lastName: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(reviews);
});

export default router;
