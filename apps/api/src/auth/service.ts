import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { Response } from 'express';
import { db, usersCol } from '../lib/firebase.js';
import { config } from '../config.js';

/**
 * Authentification maison :
 * - access token JWT court (15 min), porté en Authorization: Bearer
 * - refresh token opaque rotatif (30 j), cookie httpOnly — seul son hash
 *   est stocké ; la réutilisation d'un ancien token révoque la session.
 */

const ACCESS_TTL = '15m';
const REFRESH_TTL_MS = 30 * 24 * 3600 * 1000;
export const REFRESH_COOKIE = 'pfy_rt';

export interface PublicUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
}

const sessionsCol = () => db.collection('sessions');
const emailsCol = () => db.collection('user_emails');
const resetsCol = () => db.collection('password_resets');
const verificationsCol = () => db.collection('email_verifications');

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

// ---- Utilisateurs ---------------------------------------------------------

export function toPublicUser(uid: string, data: FirebaseFirestore.DocumentData): PublicUser {
  return {
    uid,
    email: data.email,
    displayName: data.displayName ?? '',
    role: data.role === 'admin' ? 'admin' : 'user',
    emailVerified: data.emailVerified === true,
  };
}

export async function findUserByEmail(email: string) {
  const pointer = await emailsCol().doc(email.toLowerCase()).get();
  const uid = pointer.data()?.uid as string | undefined;
  if (!uid) return null;
  const snap = await usersCol().doc(uid).get();
  return snap.exists ? { uid, data: snap.data()! } : null;
}

/** Crée un utilisateur ; l'unicité de l'email est garantie par transaction. */
export async function createUser(input: {
  email: string;
  displayName: string;
  passwordHash?: string;
  provider: 'password' | 'google';
  emailVerified: boolean;
}): Promise<PublicUser> {
  const emailKey = input.email.toLowerCase();
  const userRef = usersCol().doc();

  await db.runTransaction(async (tx) => {
    const pointer = await tx.get(emailsCol().doc(emailKey));
    if (pointer.exists) throw new Error('EMAIL_TAKEN');
    tx.set(emailsCol().doc(emailKey), { uid: userRef.id });
    tx.set(userRef, {
      email: emailKey,
      displayName: input.displayName,
      ...(input.passwordHash ? { passwordHash: input.passwordHash } : {}),
      provider: input.provider,
      role: 'user',
      emailVerified: input.emailVerified,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return {
    uid: userRef.id,
    email: emailKey,
    displayName: input.displayName,
    role: 'user',
    emailVerified: input.emailVerified,
  };
}

export const hashPassword = (password: string) => bcrypt.hash(password, 11);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

// ---- Access token ---------------------------------------------------------

export function signAccessToken(user: PublicUser): string {
  return jwt.sign(
    {
      sub: user.uid,
      email: user.email,
      name: user.displayName,
      role: user.role,
      email_verified: user.emailVerified,
    },
    config.JWT_SECRET,
    { expiresIn: ACCESS_TTL, issuer: 'portforyou' },
  );
}

export function verifyAccessToken(token: string): PublicUser {
  const payload = jwt.verify(token, config.JWT_SECRET, { issuer: 'portforyou' }) as jwt.JwtPayload;
  return {
    uid: String(payload.sub),
    email: String(payload.email ?? ''),
    displayName: String(payload.name ?? ''),
    role: payload.role === 'admin' ? 'admin' : 'user',
    emailVerified: payload.email_verified === true,
  };
}

// ---- Sessions & refresh tokens rotatifs -----------------------------------

function newRefreshToken(sessionId: string) {
  return `${sessionId}.${crypto.randomBytes(48).toString('base64url')}`;
}

export async function createSession(uid: string): Promise<string> {
  const ref = sessionsCol().doc();
  const token = newRefreshToken(ref.id);
  await ref.set({
    uid,
    tokenHash: sha256(token),
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + REFRESH_TTL_MS),
  });
  return token;
}

/**
 * Rotation : le token présenté est remplacé par un nouveau. Un token déjà
 * consommé (vol probable) révoque toutes les sessions de l'utilisateur.
 */
export async function rotateSession(
  token: string,
): Promise<{ uid: string; newToken: string } | null> {
  const [sessionId] = token.split('.');
  if (!sessionId) return null;
  const ref = sessionsCol().doc(sessionId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const session = snap.data()!;

  if (session.revokedAt || session.expiresAt.toMillis() < Date.now()) return null;

  if (session.tokenHash !== sha256(token)) {
    // Réutilisation d'un ancien token de cette session : compromission.
    const all = await sessionsCol().where('uid', '==', session.uid).get();
    const batch = db.batch();
    all.docs.forEach((doc) => batch.update(doc.ref, { revokedAt: FieldValue.serverTimestamp() }));
    await batch.commit();
    console.warn(`Refresh token réutilisé — sessions de ${session.uid} révoquées`);
    return null;
  }

  const newToken = newRefreshToken(sessionId);
  await ref.update({
    tokenHash: sha256(newToken),
    rotatedAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + REFRESH_TTL_MS),
  });
  return { uid: session.uid, newToken };
}

export async function revokeSession(token: string): Promise<void> {
  const [sessionId] = token.split('.');
  if (!sessionId) return;
  await sessionsCol()
    .doc(sessionId)
    .update({ revokedAt: FieldValue.serverTimestamp() })
    .catch(() => {});
}

export async function revokeAllSessions(uid: string): Promise<void> {
  const all = await sessionsCol().where('uid', '==', uid).get();
  const batch = db.batch();
  all.docs.forEach((doc) => batch.update(doc.ref, { revokedAt: FieldValue.serverTimestamp() }));
  await batch.commit();
}

// ---- Cookie du refresh token ----------------------------------------------

export function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    // En prod, web et api vivent sur des sous-domaines run.app distincts
    // (sites différents) : None+Secure est requis pour que le cookie circule.
    sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/api/v1/auth',
    maxAge: REFRESH_TTL_MS,
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
}

// ---- Réinitialisation de mot de passe --------------------------------------

export async function createPasswordReset(uid: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url');
  await resetsCol().add({
    uid,
    tokenHash: sha256(token),
    expiresAt: Timestamp.fromMillis(Date.now() + 3600 * 1000),
    usedAt: null,
    createdAt: FieldValue.serverTimestamp(),
  });
  return token;
}

export async function consumePasswordReset(token: string): Promise<string | null> {
  const snap = await resetsCol().where('tokenHash', '==', sha256(token)).limit(1).get();
  const doc = snap.docs[0];
  if (!doc) return null;
  const reset = doc.data();
  if (reset.usedAt || reset.expiresAt.toMillis() < Date.now()) return null;
  await doc.ref.update({ usedAt: FieldValue.serverTimestamp() });
  return reset.uid as string;
}

// ---- Vérification d'email ---------------------------------------------------

const VERIFICATION_TTL_MS = 24 * 3600 * 1000;

export async function createEmailVerification(uid: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('base64url');
  await verificationsCol().add({
    uid,
    tokenHash: sha256(token),
    expiresAt: Timestamp.fromMillis(Date.now() + VERIFICATION_TTL_MS),
    usedAt: null,
    createdAt: FieldValue.serverTimestamp(),
  });
  return token;
}

export async function consumeEmailVerification(token: string): Promise<string | null> {
  const snap = await verificationsCol().where('tokenHash', '==', sha256(token)).limit(1).get();
  const doc = snap.docs[0];
  if (!doc) return null;
  const verification = doc.data();
  if (verification.usedAt || verification.expiresAt.toMillis() < Date.now()) return null;
  await doc.ref.update({ usedAt: FieldValue.serverTimestamp() });
  return verification.uid as string;
}
