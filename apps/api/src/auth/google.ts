import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';

/**
 * OAuth Google fait main (Authorization Code, côté serveur) :
 * 1. /auth/google → redirection vers le consentement Google (state signé)
 * 2. /auth/google/callback → échange code contre tokens, vérification de
 *    l'id_token, puis session Port'ForYou classique.
 * Aucun SDK client, aucune dépendance Firebase.
 */

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

export const googleEnabled = () =>
  Boolean(config.GOOGLE_OAUTH_CLIENT_ID && config.GOOGLE_OAUTH_CLIENT_SECRET);

const redirectUri = () => `${config.API_PUBLIC_URL}/api/v1/auth/google/callback`;

/** State anti-CSRF : jeton signé à courte durée de vie. */
export function makeState(): string {
  return jwt.sign({ nonce: crypto.randomBytes(8).toString('hex') }, config.JWT_SECRET, {
    expiresIn: '10m',
    issuer: 'portforyou-oauth',
  });
}

export function checkState(state: string): boolean {
  try {
    jwt.verify(state, config.JWT_SECRET, { issuer: 'portforyou-oauth' });
    return true;
  } catch {
    return false;
  }
}

export function googleAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: config.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state: makeState(),
    prompt: 'select_account',
  });
  return `${AUTH_ENDPOINT}?${params}`;
}

export interface GoogleProfile {
  email: string;
  name: string;
  emailVerified: boolean;
}

/** Échange le code contre un id_token, puis le vérifie (signature + audience). */
export async function exchangeCode(code: string): Promise<GoogleProfile> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: config.GOOGLE_OAUTH_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Échange OAuth Google: HTTP ${res.status}`);
  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) throw new Error('id_token absent de la réponse Google');

  const client = new OAuth2Client(config.GOOGLE_OAUTH_CLIENT_ID);
  const ticket = await client.verifyIdToken({
    idToken: id_token,
    audience: config.GOOGLE_OAUTH_CLIENT_ID!,
  });
  const payload = ticket.getPayload();
  if (!payload?.email) throw new Error('Email absent du profil Google');

  return {
    email: payload.email,
    name: payload.name ?? payload.email.split('@')[0]!,
    emailVerified: payload.email_verified === true,
  };
}
