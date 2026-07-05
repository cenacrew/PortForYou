import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

export function authMiddleware(req, res, next) {
  const cookieToken = req.cookies?.token;
  const authHeader = req.headers['authorization'] || '';
  const [, headerToken] = authHeader.split(' ');
  const token = cookieToken || headerToken;

  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function signToken(user) {
  const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}
