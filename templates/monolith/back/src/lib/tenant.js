import { db } from './firebaseAdmin.js';

/**
 * Identifiant du tenant servi par cette instance.
 * Injecté par le provisioning Port'ForYou (service Cloud Run tenant-<slug>).
 * En dev local, `dev` par défaut.
 */
export const TENANT_ID = process.env.TENANT_ID || 'dev';

/** Instance de démo : le back-office est visitable mais toute mutation est refusée. */
export const DEMO_MODE = process.env.DEMO_MODE === '1';

/** Racine Firestore du tenant : tenants/{TENANT_ID}. */
export function tenantDoc() {
  return db.collection('tenants').doc(TENANT_ID);
}

/** Collection du tenant : tenants/{TENANT_ID}/{name}. */
export function tenantCol(name) {
  return tenantDoc().collection(name);
}

export function artworksCol() {
  return tenantCol('artworks');
}

export function siteConfigDoc() {
  return tenantCol('site_config').doc('main');
}

export function analyticsDailyCol() {
  return tenantCol('analytics_daily');
}

export function contactMessagesCol() {
  return tenantCol('contact_messages');
}

/** Préfixe Storage des uploads du tenant. */
export function storagePath(relativePath) {
  return `tenants/${TENANT_ID}/uploads/${relativePath}`;
}

/** Middleware : bloque les mutations sur les instances de démo. */
export function demoGuard(req, res, next) {
  if (DEMO_MODE && req.method !== 'GET') {
    return res.status(403).json({
      error:
        'Instance de démonstration : les modifications sont désactivées. Commandez votre propre site sur Port’ForYou pour gérer votre contenu.',
    });
  }
  next();
}
