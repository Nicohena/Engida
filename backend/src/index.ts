import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { prisma } from "./lib/prisma";

import propertiesRoutes from "./routes/properties.routes";
import bookingsRoutes from "./routes/bookings.routes";
import paymentsRoutes from "./routes/payments.routes";
import reviewsRoutes from "./routes/reviews.routes";
import messagesRoutes from "./routes/messages.routes";
import profileRoutes from "./routes/profile.routes";
import avatarRoutes from "./routes/avatar.routes";
import notificationsRoutes from "./routes/notifications.routes";
import favoritesRoutes from "./routes/favorites.routes";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Serve uploaded avatars as static files: GET /avatars/<filename>
app.use("/avatars", express.static(path.join(process.cwd(), "public", "avatars")));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/properties", propertiesRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/profile/avatar", avatarRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/favorites", favoritesRoutes);

// GET /api/properties/:id/reviews  (spec-required path, delegates to reviews controller logic)
app.get("/api/properties/:id/reviews", async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { propertyId: Number(req.params.id) },
    include: { guest: { select: { firstName: true, lastName: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(reviews);
});

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

app.listen(PORT, () => {
  console.log(`GUZO (ENGIDA) API running on http://localhost:${PORT}`);
});
