import { Router } from "express";
import { prisma } from "../lib/prisma";
import { mockAuth } from "../middleware/mockAuth";

const router = Router();
router.use(mockAuth);

// GET /api/favorites
router.get("/", async (req, res) => {
  const favorites = await prisma.favorite.findMany({
    where: { guestId: req.userId },
    include: { property: { include: { images: true } } },
  });
  res.json(favorites);
});

// POST /api/favorites/:propertyId  (toggle)
router.post("/:propertyId", async (req, res) => {
  const propertyId = Number(req.params.propertyId);
  const existing = await prisma.favorite.findUnique({
    where: { guestId_propertyId: { guestId: req.userId!, propertyId } },
  });

  if (existing) {
    await prisma.favorite.delete({
      where: { guestId_propertyId: { guestId: req.userId!, propertyId } },
    });
    return res.json({ favorited: false });
  }

  await prisma.favorite.create({ data: { guestId: req.userId!, propertyId } });
  res.json({ favorited: true });
});

export default router;
