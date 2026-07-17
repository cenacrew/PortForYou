import type { MetadataRoute } from 'next';
import { TEMPLATES } from '@/lib/templates';
import { SITE_URL } from '@/lib/site';

type SitemapEntry = MetadataRoute.Sitemap[number];
type ChangeFrequency = SitemapEntry['changeFrequency'];

const STATIC_PAGES: Array<{ path: string; changeFrequency: ChangeFrequency; priority: number }> = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/templates', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/cgv', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/mentions-legales', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/confidentialite', changeFrequency: 'yearly', priority: 0.2 },
];

/** Sitemap de la vitrine : pages marketing publiques + fiche de chaque template. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map(
    ({ path, changeFrequency, priority }) => ({
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    }),
  );

  const templateEntries: MetadataRoute.Sitemap = TEMPLATES.map((t) => ({
    url: `${SITE_URL}/templates/${t.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticEntries, ...templateEntries];
}
