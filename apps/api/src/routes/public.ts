import { Router } from 'express';
import { z } from 'zod';
import { slugSchema, TECHNIQUE_LABELS } from '@portforyou/shared';
import { isSlugAvailable } from '../orders/service.js';
import { config } from '../config.js';
import { contactRequestsCol, db } from '../lib/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { sendMail, quoteRequestEmail } from '../emails/mailer.js';
import { sendError } from '../lib/apiError.js';

const router: Router = Router();

router.get('/health', async (_req, res) => {
  // Lecture Firestore légère : un souci d'IAM/connexion (SA mal configuré,
  // réseau) doit sortir la révision du pool, pas répondre 200 à vide.
  try {
    await db.collection('_health').limit(1).get();
  } catch (err) {
    console.error('Healthcheck Firestore KO:', err);
    return res.status(503).json({
      ok: false,
      service: 'portforyou-api',
      commit: config.COMMIT_SHA,
      error: 'firestore_unreachable',
    });
  }
  res.json({
    ok: true,
    service: 'portforyou-api',
    commit: config.COMMIT_SHA,
    payment: config.PAYMENT_DRIVER,
    provisioner: config.PROVISIONER_DRIVER,
  });
});

/** Catalogue des templates (méta statiques ; les visuels vivent dans la vitrine). */
const TEMPLATE_CATALOG = [
  {
    slug: 'atelier',
    name: 'Atelier',
    tagline: 'Élégante et intemporelle — celle qui a tout commencé.',
    description:
      "La template originelle de Port'ForYou, éprouvée en production. Galerie par technique, " +
      'biographie, presse, actualités et back-office complet.',
    demoUrl: 'https://pfy-demo-atelier.web.app',
    available: true,
  },
  {
    slug: 'monolith',
    name: 'Monolith',
    tagline: 'Sombre, immersive, monumentale.',
    description:
      'Typographie massive, œuvres plein écran, navigation immersive. Pour les univers ' +
      'graphiques affirmés.',
    demoUrl: 'https://pfy-demo-monolith.web.app',
    available: true,
  },
  {
    slug: 'papier',
    name: 'Papier',
    tagline: 'Claire, éditoriale, délicate.',
    description:
      'Grille masonry, cartels de musée, ambiance papier. Pour les aquarellistes et ' +
      'dessinateurs.',
    demoUrl: 'https://pfy-demo-papier.web.app',
    available: true,
  },
];

router.get('/templates', (_req, res) => {
  res.json({ items: TEMPLATE_CATALOG, techniques: TECHNIQUE_LABELS });
});

router.get('/slugs/check', async (req, res) => {
  const parsed = z.object({ slug: slugSchema }).safeParse({ slug: req.query.slug });
  if (!parsed.success) {
    return res.json({
      slug: String(req.query.slug || ''),
      available: false,
      reason: parsed.error.issues[0]?.message ?? 'Slug invalide',
    });
  }
  const available = await isSlugAvailable(parsed.data.slug);
  return res.json({
    slug: parsed.data.slug,
    available,
    ...(available ? {} : { reason: 'Ce nom est déjà pris' }),
  });
});

/**
 * POST /contact — demande de devis personnalisé (public, sans compte).
 * Journalise la demande et notifie l'équipe par email (Resend).
 */
router.post('/contact', async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(1).max(120),
      email: z.string().email().max(200),
      projectType: z.string().max(120).optional(),
      budget: z.string().max(60).optional(),
      message: z.string().min(10).max(5000),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 400, 'validation_failed', 'Formulaire invalide', {
      details: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  const data = parsed.data;

  // Trace la demande (dashboard admin / suivi).
  await contactRequestsCol()
    .add({ ...data, status: 'new', createdAt: FieldValue.serverTimestamp() })
    .catch((err) => console.error('contact_requests add:', err));

  // Notifie l'équipe. Répond OK même si l'email échoue (la demande est tracée).
  const inbox = config.CONTACT_INBOX || config.MAIL_FROM;
  if (inbox) {
    await sendMail({ to: inbox, type: 'quote_request', ...quoteRequestEmail(data) });
  }
  return res.status(201).json({ ok: true });
});

export default router;
export { TEMPLATE_CATALOG };
