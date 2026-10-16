import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma";
import { mockAuth } from "../middleware/mockAuth";

const router = Router();
router.use(mockAuth);

// ── Storage: save to backend/public/avatars/<userId>-<timestamp>.webp ────────
const AVATARS_DIR = path.join(process.cwd(), "public", "avatars");
if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATARS_DIR),
  filename: (req, _file, cb) => {
    const ext = ".png"; // we always receive PNG from the canvas export
    cb(null, `avatar-${req.userId}-${Date.now()}${ext}`);
  },
});

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type. Please upload a JPEG, PNG, or WebP image."));
    }
  },
});

// ── POST /api/profile/avatar ────────────────────────────────────────────────
router.post("/", upload.single("avatar"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file received." });
    }

    const fileUrl = `/avatars/${req.file.filename}`;

    // Remove old avatar file from disk if it exists
    const existing = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { avatar: true },
    });

    if (existing?.avatar) {
      const oldFilename = existing.avatar.replace("/avatars/", "");
      const oldPath = path.join(AVATARS_DIR, oldFilename);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch { /* ignore */ }
      }
    }

    // Persist URL to user record
    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: { avatar: fileUrl },
    });

    return res.json({ avatarUrl: updated.avatar });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Upload failed." });
  }
});

// ── DELETE /api/profile/avatar ───────────────────────────────────────────────
router.delete("/", async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { avatar: true },
    });

    if (user?.avatar) {
      const oldFilename = user.avatar.replace("/avatars/", "");
      const oldPath = path.join(AVATARS_DIR, oldFilename);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch { /* ignore */ }
      }
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: { avatar: null },
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Delete failed." });
  }
});

export default router;
