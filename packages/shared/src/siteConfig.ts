import { z } from 'zod';

export const pressItemSchema = z.object({
  title: z.string().min(1).max(300),
  source: z.string().max(200).optional(),
  date: z.string().max(50).optional(),
  url: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  excerpt: z.string().max(2000).optional(),
});

export const newsItemSchema = z.object({
  title: z.string().min(1).max(300),
  date: z.string().max(50).optional(),
  text: z.string().max(5000).optional(),
  imageUrl: z.string().url().optional(),
  url: z.string().url().optional(),
});

/** Champs autorisés du document tenants/{slug}/site_config/main — mise à jour partielle. */
export const siteConfigSchema = z
  .object({
    heroImageUrl: z.string().url(),
    techniqueImages: z.record(z.string().url()),
    biographyText: z.string().max(20000),
    biographyImageUrl: z.string().url(),
    pressItems: z.array(pressItemSchema).max(100),
    newsItems: z.array(newsItemSchema).max(100),
    contactEmail: z.string().email(),
    socialInstagram: z.string().url().or(z.literal('')),
    socialFacebook: z.string().url().or(z.literal('')),
  })
  .partial();

export type SiteConfig = z.infer<typeof siteConfigSchema>;
