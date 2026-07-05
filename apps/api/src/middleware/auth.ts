import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../auth/service.js';

function authenticate(req: Request, token: string | undefined): boolean {
  if (!token) return false;
  try {
    const user = verifyAccessToken(token);
    req.user = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      admin: user.role === 'admin',
    };
    return true;
  } catch {
    return false;
  }
}

/** Vérifie l'access token maison (header Authorization: Bearer). */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !authenticate(req, token)) {
    return res.status(401).json({ error: 'Authentification requise' });
  }
  next();
}

/**
 * Variante pour les flux SSE : EventSource ne peut pas poser de header,
 * le token passe donc en query (?token=...), vérifié à l'identique.
 */
export function requireAuthSse(req: Request, res: Response, next: NextFunction) {
  const token =
    typeof req.query.token === 'string'
      ? req.query.token
      : (req.headers.authorization || '').replace('Bearer ', '');
  if (!authenticate(req, token)) {
    return res.status(401).json({ error: 'Authentification requise' });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.admin) {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
}
