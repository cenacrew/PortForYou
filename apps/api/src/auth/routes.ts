import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { usersCol } from '../lib/firebase.js';
import { sendMail, verificationEmail } from '../emails/mailer.js';
import { config } from '../config.js';
import {
  REFRESH_COOKIE,
  createUser,
  findUserByEmail,
  hashPassword,
  verifyPassword,
  signAccessToken,
  createSession,
  rotateSession,
  revokeSession,
  revokeAllSessions,
  setRefreshCookie,
  clearRefreshCookie,
  createPasswordReset,
  consumePasswordReset,
  createEmailVerification,
  consumeEmailVerification,
  toPublicUser,
  type PublicUser,
} from './service.js';
import { googleEnabled, googleAuthUrl, checkState, exchangeCode } from './google.js';

async function sendVerificationEmail(uid: string, displayName: string, email: string) {
  const token = await createEmailVerification(uid);
  const { subject, text } = verificationEmail(
    displayName,
    `${config.WEB_ORIGIN}/verify-email?token=${token}`,
  );
  await sendMail({ to: email, type: 'email_verification', subject, text });
}

const router: Router = Router();

async function issueTokens(res: Parameters<typeof setRefreshCookie>[0], user: PublicUser) {
  const refreshToken = await createSession(user.uid);
  setRefreshCookie(res, refreshToken);
  return { accessToken: signAccessToken(user), user };
}

const credentialsSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
});

// ---- Inscription / connexion ----------------------------------------------

router.post(
  '/auth/register',
  validateBody(credentialsSchema.extend({ name: z.string().min(1).max(120) })),
  async (req, res) => {
    try {
      const user = await createUser({
        email: req.body.email,
        displayName: req.body.name,
        passwordHash: await hashPassword(req.body.password),
        provider: 'password',
        emailVerified: false,
      });
      await sendVerificationEmail(user.uid, user.displayName, user.email);
      return res.status(201).json(await issueTokens(res, user));
    } catch (err) {
      if (err instanceof Error && err.message === 'EMAIL_TAKEN') {
        const existing = await findUserByEmail(req.body.email);
        const viaGoogle = existing != null && !existing.data.passwordHash;
        return res.status(409).json({
          error: viaGoogle
            ? 'Cet email est déjà associé à un compte Google. Connectez-vous avec Google.'
            : 'Un compte existe déjà avec cet email',
        });
      }
      throw err;
    }
  },
);

router.post('/auth/login', validateBody(credentialsSchema), async (req, res) => {
  const found = await findUserByEmail(req.body.email);
  // Compte créé via Google (aucun mot de passe) : message explicite plutôt que
  // « mot de passe incorrect » trompeur. On oriente vers le bon moyen.
  if (found && !found.data.passwordHash) {
    return res.status(403).json({
      error: 'Ce compte utilise la connexion Google. Cliquez sur « Continuer avec Google ».',
      provider: 'google',
    });
  }
  // Réponse identique que l'email existe ou non (pas d'énumération).
  if (!found?.data.passwordHash) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }
  const ok = await verifyPassword(req.body.password, found.data.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

  return res.json(await issueTokens(res, toPublicUser(found.uid, found.data)));
});

// ---- Session : refresh rotatif, logout -------------------------------------

router.post('/auth/refresh', async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) return res.status(401).json({ error: 'Aucune session' });

  const rotated = await rotateSession(token);
  if (!rotated) {
    clearRefreshCookie(res);
    return res.status(401).json({ error: 'Session expirée' });
  }

  const snap = await usersCol().doc(rotated.uid).get();
  if (!snap.exists) {
    clearRefreshCookie(res);
    return res.status(401).json({ error: 'Compte introuvable' });
  }
  const user = toPublicUser(rotated.uid, snap.data()!);
  setRefreshCookie(res, rotated.newToken);
  return res.json({ accessToken: signAccessToken(user), user });
});

router.post('/auth/logout', async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) await revokeSession(token);
  clearRefreshCookie(res);
  return res.json({ ok: true });
});

// ---- Mot de passe oublié ----------------------------------------------------

router.post(
  '/auth/forgot-password',
  validateBody(z.object({ email: z.string().email().max(200) })),
  async (req, res) => {
    const found = await findUserByEmail(req.body.email);
    if (found?.data.passwordHash) {
      const token = await createPasswordReset(found.uid);
      await sendMail({
        to: found.data.email,
        type: 'password_reset',
        subject: 'Réinitialisation de votre mot de passe Port’ForYou',
        text:
          `Bonjour,\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 h) :\n` +
          `${config.WEB_ORIGIN}/reset-password?token=${token}\n\n` +
          `Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
      });
    }
    // Toujours 200 : ne révèle pas l'existence du compte.
    return res.json({ ok: true });
  },
);

router.post(
  '/auth/reset-password',
  validateBody(z.object({ token: z.string().min(10), password: z.string().min(8).max(200) })),
  async (req, res) => {
    const uid = await consumePasswordReset(req.body.token);
    if (!uid) return res.status(400).json({ error: 'Lien invalide ou expiré' });

    await usersCol()
      .doc(uid)
      .update({ passwordHash: await hashPassword(req.body.password) });
    await revokeAllSessions(uid); // toutes les sessions retombent
    return res.json({ ok: true });
  },
);

// ---- Vérification d'email ---------------------------------------------------

router.post(
  '/auth/verify-email',
  validateBody(z.object({ token: z.string().min(10) })),
  async (req, res) => {
    const uid = await consumeEmailVerification(req.body.token);
    if (!uid) return res.status(400).json({ error: 'Lien invalide ou expiré' });
    await usersCol().doc(uid).update({ emailVerified: true });
    return res.json({ ok: true });
  },
);

router.post('/auth/resend-verification', requireAuth, async (req, res) => {
  const user = req.user!;
  if (user.emailVerified) return res.json({ ok: true });
  const snap = await usersCol().doc(user.uid).get();
  await sendVerificationEmail(user.uid, snap.data()?.displayName ?? '', user.email);
  return res.json({ ok: true });
});

// ---- OAuth Google (fait main) ----------------------------------------------

router.get('/auth/google', (_req, res) => {
  if (!googleEnabled()) {
    return res.redirect(`${config.WEB_ORIGIN}/login?error=google_disabled`);
  }
  return res.redirect(googleAuthUrl());
});

router.get('/auth/google/callback', async (req, res) => {
  try {
    if (!googleEnabled()) throw new Error('OAuth Google désactivé');
    const { code, state } = req.query as { code?: string; state?: string };
    if (!code || !state || !checkState(state)) throw new Error('state invalide');

    const profile = await exchangeCode(code);
    let found = await findUserByEmail(profile.email);
    // Un compte email/mot de passe existe déjà pour cet email : on refuse le
    // lien automatique et on renvoie vers la connexion classique (symétrique
    // du refus côté login mot de passe).
    if (found && found.data.passwordHash) {
      return res.redirect(`${config.WEB_ORIGIN}/login?error=use_password`);
    }
    if (!found) {
      const created = await createUser({
        email: profile.email,
        displayName: profile.name,
        provider: 'google',
        emailVerified: profile.emailVerified,
      });
      found = { uid: created.uid, data: { ...created, passwordHash: undefined } };
    }

    const snap = await usersCol().doc(found.uid).get();
    const user = toPublicUser(found.uid, snap.data()!);
    const refreshToken = await createSession(user.uid);
    setRefreshCookie(res, refreshToken);
    return res.redirect(`${config.WEB_ORIGIN}/dashboard`);
  } catch (err) {
    console.error('OAuth Google échoué:', err);
    return res.redirect(`${config.WEB_ORIGIN}/login?error=google_failed`);
  }
});

export default router;
