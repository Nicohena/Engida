import { Router } from "express";
import { prisma } from "../lib/prisma";
import { mockAuth } from "../middleware/mockAuth";

const router = Router();
router.use(mockAuth);

// GET /api/profile
router.get("/", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// PUT /api/profile   body: { firstName, lastName, email, phone, language }
router.put("/", async (req, res) => {
  const { firstName, lastName, email, phone, language } = req.body;
  const updated = await prisma.user.update({
    where: { id: req.userId },
    data: {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(email && { email }),
      ...(phone && { phone }),
      ...(language && { language }),
    },
  });
  res.json(updated);
});

export default router;
