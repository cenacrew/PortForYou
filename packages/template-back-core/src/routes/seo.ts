import { Router, type Request } from 'express';
import { db } from '../lib/firebaseAdmin.js';
import { artworksCol, TENANT_ID } from '../lib/tenant.js';

const router: Router = Router();

/** Nombre max d'œuvres listées dans le sitemap (garde-fou). */
const SITEMAP_ARTWORK_LIMIT = 2000;

/** Pages statiques du template, avec leur priorité indicative. */
const STATIC_PATHS: Array<{ path: string; priority: string; changefreq: string }> = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/galerie', priority: '0.9', changefreq: 'weekly' },
  { path: '/biographie', priority: '0.6', changefreq: 'monthly' },
  { path: '/presse', priority: '0.5', changefreq: 'monthly' },
  { path: '/contact', priority: '0.4', changefreq: 'yearly' },
];

/**
 * URL de base publique du site du tenant. Derrière le rewrite Firebase Hosting,
 * la requête arrive avec l'hôte public (`pfy-<slug>.web.app` ou domaine
 * personnalisé) : on le reconstruit depuis la requête. Repli sur `SITE_URL`
 * puis sur la convention `pfy-<TENANT_ID>.web.app`.
 */
function siteBaseUrl(req: Request): string {
  const host = req.get('host');
  if (host) return `${req.protocol}://${host}`;
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '');
  return `https://pfy-${TENANT_ID}.web.app`;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Convertit une date Firestore (Timestamp | ISO | Date) en date ISO (YYYY-MM-DD). */
function toIsoDate(value: unknown): string | null {
  try {
    if (!value) return null;
    if (typeof value === 'object' && value !== null && 'toDate' in value) {
      const d = (value as { toDate: () => Date }).toDate();
      return d.toISOString().slice(0, 10);
    }
    const d = new Date(value as string | number);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

// GET /sitemap.xml — pages statiques + fiche de chaque œuvre du tenant.
router.get('/sitemap.xml', async (req, res) => {
  const base = siteBaseUrl(req);
  const urls: string[] = [];

  for (const { path, priority, changefreq } of STATIC_PATHS) {
    urls.push(
      `<url><loc>${xmlEscape(base + path)}</loc>` +
        `<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`,
    );
  }

  try {
    if (db) {
      const snapshot = await artworksCol()
        .orderBy('createdAt', 'desc')
        .limit(SITEMAP_ARTWORK_LIMIT)
        .get();
      for (const doc of snapshot.docs) {
        const data = doc.data() as { updatedAt?: unknown };
        const lastmod = toIsoDate(data.updatedAt);
        urls.push(
          `<url><loc>${xmlEscape(`${base}/galerie/${doc.id}`)}</loc>` +
            (lastmod ? `<lastmod>${lastmod}</lastmod>` : '') +
            `<changefreq>monthly</changefreq><priority>0.7</priority></url>`,
        );
      }
    }
  } catch (err) {
    // Un sitemap partiel (pages statiques seules) vaut mieux qu'une 500.
    console.error('Failed to list artworks for sitemap:', err);
  }

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.join('\n') +
    '\n</urlset>\n';

  res.set('Content-Type', 'application/xml; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600');
  return res.status(200).send(body);
});

// GET /robots.txt — autorise le crawl, référence le sitemap, exclut le back-office.
router.get('/robots.txt', (req, res) => {
  const base = siteBaseUrl(req);
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    '',
    `Sitemap: ${base}/sitemap.xml`,
    '',
  ].join('\n');
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=86400');
  return res.status(200).send(body);
});

export default router;
