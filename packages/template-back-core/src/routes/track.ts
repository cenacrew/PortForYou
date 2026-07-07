import { Router, type Request } from 'express';
import crypto from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../lib/firebaseAdmin.js';
import { analyticsDailyCol } from '../lib/tenant.js';

const router: Router = Router();

// Sel journalier en mémoire : le hash visiteur n'est jamais persisté brut et
// change chaque jour → aucune donnée personnelle stockée, dédup approximative.
let daySalt = { day: '', salt: '' };
function visitorHash(req: Request, day: string) {
  if (daySalt.day !== day) {
    daySalt = { day, salt: crypto.randomBytes(16).toString('hex') };
  }
  const raw = `${daySalt.salt}|${req.ip}|${req.headers['user-agent'] || ''}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

/**
 * POST /api/v1/track — beacon first-party, sans cookie ni PII.
 * Body : { path: string, artworkId?: string }
 */
router.post('/track', async (req, res) => {
  // Toujours répondre 204 vite : un beacon ne doit jamais gêner la navigation.
  res.status(204).end();
  try {
    if (!db) return;
    const { path, artworkId } = req.body || {};
    if (typeof path !== 'string' || path.length > 200 || path.includes('/admin')) return;

    const day = new Date().toISOString().slice(0, 10);
    const visitor = visitorHash(req, day);
    const pathKey = path.replace(/[.$[\]#/]/g, '_') || '_';

    const update: Record<string, unknown> = {
      pageViews: FieldValue.increment(1),
      [`paths.${pathKey}`]: FieldValue.increment(1),
      // Approximation des visiteurs uniques : union de hashes journaliers (suffisant à l'échelle d'un portfolio).
      visitors: FieldValue.arrayUnion(visitor),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (typeof artworkId === 'string' && artworkId.length <= 40) {
      update[`artworkViews.${artworkId.replace(/[.$[\]#/]/g, '_')}`] = FieldValue.increment(1);
    }
    await analyticsDailyCol().doc(day).set(update, { merge: true });
  } catch (err) {
    console.error('track failed:', err instanceof Error ? err.message : err);
  }
});

export default router;
