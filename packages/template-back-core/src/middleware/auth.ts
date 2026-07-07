import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.token;
  const authHeader = req.headers['authorization'] || '';
  const [, headerToken] = authHeader.split(' ');
  const token = cookieToken || headerToken;

  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET) as TenantUser;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function signToken(user: { id: string; email: string; role: string }) {
  const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}
