import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface JwtPayload {
  userId: string;
  email: string;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'חסר טוקן אימות' });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    (req as Request & { user: JwtPayload }).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'טוקן לא תקין או שפג תוקפו' });
  }
}
