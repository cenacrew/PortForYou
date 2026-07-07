import { Router, type CookieOptions } from 'express';
import bcrypt from 'bcryptjs';
import { signToken } from '../middleware/auth.js';

const router: Router = Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
let passwordHash = process.env.ADMIN_PASSWORD_HASH || null;

if (!passwordHash) {
  console.warn(
    '\n⚠️  ADMIN_PASSWORD_HASH non défini — identifiants de développement utilisés (admin@example.com / admin123).\n' +
      "   En production, générez un hash : node -e \"console.log(require('bcryptjs').hashSync('votremdp',10))\"\n",
  );
  passwordHash = bcrypt.hashSync('admin123', 10);
}

const adminUser = { id: 'admin', email: ADMIN_EMAIL, role: 'admin', passwordHash };

const COOKIE_OPTS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 60 * 60 * 1000,
};

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }
  if (email.toLowerCase() !== adminUser.email.toLowerCase()) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }
  const ok = await bcrypt.compare(password, adminUser.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Identifiants invalides' });

  const token = signToken(adminUser);
  res.cookie('token', token, COOKIE_OPTS);
  return res.json({
    ok: true,
    user: { id: adminUser.id, email: adminUser.email, role: adminUser.role },
  });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', COOKIE_OPTS);
  return res.json({ ok: true });
});

export default router;
