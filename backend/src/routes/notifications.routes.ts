import { Router } from "express";
import { prisma } from "../lib/prisma";
import { mockAuth } from "../middleware/mockAuth";

const router = Router();
router.use(mockAuth);

// GET /api/notifications
router.get("/", async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
  });
  res.json(notifications);
});

// PUT /api/notifications/:id/read
router.put("/:id/read", async (req, res) => {
  const updated = await prisma.notification.update({
    where: { id: Number(req.params.id) },
    data: { isRead: true },
  });
  res.json(updated);
});

// PUT /api/notifications/read-all
router.put("/read-all", async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.userId, isRead: false },
    data: { isRead: true },
  });
  res.json({ success: true });
});

export default router;
