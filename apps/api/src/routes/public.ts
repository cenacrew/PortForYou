import { Router } from 'express';
import { z } from 'zod';
import { slugSchema, TECHNIQUE_LABELS } from '@portforyou/shared';
import { isSlugAvailable } from '../orders/service.js';
import { config } from '../config.js';

const router: Router = Router();

router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'portforyou-api',
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
    demoUrl: null,
    available: true,
  },
  {
    slug: 'monolith',
    name: 'Monolith',
    tagline: 'Sombre, immersive, monumentale.',
    description:
      'Typographie massive, œuvres plein écran, navigation immersive. Pour les univers ' +
      'graphiques affirmés.',
    demoUrl: null,
    available: true,
  },
  {
    slug: 'papier',
    name: 'Papier',
    tagline: 'Claire, éditoriale, délicate.',
    description:
      'Grille masonry, cartels de musée, ambiance papier. Pour les aquarellistes et ' +
      'dessinateurs.',
    demoUrl: null,
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

export default router;
export { TEMPLATE_CATALOG };
