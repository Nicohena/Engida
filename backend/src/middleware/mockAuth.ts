import { Request, Response, NextFunction } from "express";

// Real auth (JWT) is owned by another team. Until it lands, every
// request is treated as an authenticated guest with a fixed userId.
// Swap this out for real `req.user = decodedJwt` once auth ships.
const MOCK_GUEST_ID = Number(process.env.MOCK_GUEST_ID || 1);

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export function mockAuth(req: Request, _res: Response, next: NextFunction) {
  req.userId = MOCK_GUEST_ID;
  next();
}
