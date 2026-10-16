import { Router } from "express";
import { prisma } from "../lib/prisma";
import { mockAuth } from "../middleware/mockAuth";

const router = Router();
router.use(mockAuth);

const SERVICE_FEE = 350;

function nightsBetween(checkIn: Date, checkOut: Date) {
  const ms = checkOut.getTime() - checkIn.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

// GET /api/bookings  (all bookings for the mocked guest)
router.get("/", async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where: { guestId: req.userId },
    include: { property: { include: { images: true } }, payment: true, review: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(bookings);
});

// GET /api/bookings/:id
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const booking = await prisma.booking.findFirst({
    where: { id, guestId: req.userId },
    include: { property: { include: { images: true } }, payment: true, review: true },
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  res.json(booking);
});

// POST /api/bookings
// body: { propertyId, checkIn, checkOut, guests }
router.post("/", async (req, res) => {
  try {
    const { propertyId, checkIn, checkOut, guests } = req.body;
    if (!propertyId || !checkIn || !checkOut || !guests) {
      return res.status(400).json({ error: "propertyId, checkIn, checkOut and guests are required" });
    }

    const property = await prisma.property.findUnique({ where: { id: Number(propertyId) } });
    if (!property || !property.published) {
      return res.status(404).json({ error: "Property not available" });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ error: "checkOut must be after checkIn" });
    }

    // Rule: unavailable dates cannot be selected
    const unavailable = await prisma.availability.findFirst({
      where: {
        propertyId: property.id,
        date: { gte: checkInDate, lt: checkOutDate },
        available: false,
      },
    });
    if (unavailable) {
      return res.status(409).json({ error: "Selected dates include unavailable dates" });
    }

    // Rule: booking cannot overlap another CONFIRMED booking
    const overlap = await prisma.booking.findFirst({
      where: {
        propertyId: property.id,
        status: "CONFIRMED",
        checkIn: { lt: checkOutDate },
        checkOut: { gt: checkInDate },
      },
    });
    if (overlap) {
      return res.status(409).json({ error: "Property already booked for these dates" });
    }

    const nights = nightsBetween(checkInDate, checkOutDate);
    const totalPrice = property.price * nights + SERVICE_FEE;

    const booking = await prisma.booking.create({
      data: {
        guestId: req.userId!,
        propertyId: property.id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests: Number(guests),
        nights,
        totalPrice,
        status: "PENDING",
      },
    });

    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// PUT /api/bookings/:id/cancel
router.put("/:id/cancel", async (req, res) => {
  const id = Number(req.params.id);
  const booking = await prisma.booking.findFirst({ where: { id, guestId: req.userId } });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.status === "COMPLETED") {
    return res.status(400).json({ error: "Completed bookings cannot be cancelled" });
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  await prisma.notification.create({
    data: {
      userId: req.userId!,
      title: "Booking cancelled",
      body: `Your booking #${id} has been cancelled.`,
      type: "BOOKING_CANCELLED",
    },
  });

  res.json(updated);
});

export default router;
