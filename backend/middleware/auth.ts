import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt';

type AuthenticatedUser = {
  uid: string;
  role: string;
};
declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
    }
  }
}
function getBearerToken(req: Request) {
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Bearer ')) {
    return null;
  }
  return header.slice('Bearer '.length).trim();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Authorization token is required' });
  }
  try {
    const payload = verifyAccessToken(token);
    req.authUser = {
      uid: payload.sub,
      role: payload.role,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ error: error instanceof Error ? error.message : 'Invalid token' });
  }
}
