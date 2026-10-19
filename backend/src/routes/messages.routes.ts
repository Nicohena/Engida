import { Router } from "express";
import { prisma } from "../lib/prisma";
import { mockAuth } from "../middleware/mockAuth";

const router = Router();
router.use(mockAuth);

// GET /api/messages  -> list conversations (grouped by booking) for the guest
router.get("/", async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where: { guestId: req.userId },
    include: {
      property: { include: { images: true, host: true } },
      messages: { orderBy: { sentAt: "desc" }, take: 1 },
    },
  });

  const conversations = bookings
    .filter((b) => b.messages.length > 0)
    .map((b) => ({
      bookingId: b.id,
      propertyName: b.property.title,
      propertyImage: b.property.images[0]?.imageUrl || null,
      hostName: `${b.property.host.firstName} ${b.property.host.lastName}`,
      hostAvatar: b.property.host.avatar,
      lastMessage: b.messages[0]?.message || "",
      lastMessageTime: b.messages[0]?.sentAt || b.createdAt,
    }));

  res.json(conversations);
});

// GET /api/messages/:bookingId -> full thread for a booking
router.get("/:bookingId", async (req, res) => {
  const bookingId = Number(req.params.bookingId);
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, guestId: req.userId },
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const messages = await prisma.message.findMany({
    where: { bookingId },
    orderBy: { sentAt: "asc" },
  });
  res.json(messages);
});

// POST /api/messages/send  body: { bookingId, receiverId, message }
router.post("/send", async (req, res) => {
  const { bookingId, receiverId, message } = req.body;
  if (!bookingId || !receiverId || !message) {
    return res.status(400).json({ error: "bookingId, receiverId and message are required" });
  }

  const booking = await prisma.booking.findFirst({
    where: { id: Number(bookingId), guestId: req.userId },
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const created = await prisma.message.create({
    data: {
      bookingId: booking.id,
      senderId: req.userId!,
      receiverId: Number(receiverId),
      message: String(message),
    },
  });

  res.status(201).json(created);
});

export default router;
