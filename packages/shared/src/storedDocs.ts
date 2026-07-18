import { z } from 'zod';
import { SITE_STATUSES, TEMPLATE_SLUGS, DEPLOYMENT_STEP_IDS } from './platform.js';

/**
 * Schémas des documents Firestore du domaine plateforme, tels que STOCKÉS.
 *
 * Contrairement aux schémas d'entrée (validation des requêtes), ceux-ci
 * décrivent la forme lue en base et servent aux frontières de LECTURE via
 * `parseDoc` (`apps/api/src/lib/parseDoc.ts`) : un document corrompu ou d'un
 * ancien format devient une erreur explicite et localisée au lieu de traverser
 * le code avec un type mensonger (`snap.data() as X`).
 *
 * Ils sont volontairement « loose » (`z.looseObject`) :
 * - seuls les champs d'identité/statut critiques sont validés strictement ;
 * - les champs annexes (urls, facturation…) et surtout les `Timestamp`
 *   Firestore (createdAt, liveAt…) traversent tels quels — le code appelant
 *   continue de faire `data.createdAt?.toDate?.()`.
 */

const templateSlugField = z.enum(TEMPLATE_SLUGS);
const siteStatusField = z.enum(SITE_STATUSES);

export const storedUserSchema = z.looseObject({
  email: z.string(),
  displayName: z.string().optional(),
  role: z.enum(['user', 'admin']).optional(),
  emailVerified: z.boolean().optional(),
  provider: z.enum(['password', 'google']).optional(),
  passwordHash: z.string().optional(),
});
export type StoredUser = z.infer<typeof storedUserSchema>;

export const storedOrderSchema = z.looseObject({
  uid: z.string(),
  siteSlug: z.string(),
  templateSlug: templateSlugField,
  status: z.string(),
  siteId: z.string().optional(),
  artistName: z.string(),
  contactEmail: z.string(),
  clientEmail: z.string(),
});
export type StoredOrder = z.infer<typeof storedOrderSchema>;

export const storedSiteSchema = z.looseObject({
  uid: z.string(),
  slug: z.string(),
  templateSlug: templateSlugField,
  status: siteStatusField,
  artistName: z.string(),
  contactEmail: z.string(),
  clientEmail: z.string(),
});
export type StoredSite = z.infer<typeof storedSiteSchema>;

export const storedDeploymentStepSchema = z.looseObject({
  id: z.enum(DEPLOYMENT_STEP_IDS),
  status: z.enum(['pending', 'running', 'done', 'failed']),
});

export const storedDeploymentSchema = z.looseObject({
  siteId: z.string(),
  uid: z.string(),
  status: z.enum(['running', 'done', 'failed']),
  trigger: z.string().optional(),
  steps: z.array(storedDeploymentStepSchema).optional(),
});
export type StoredDeployment = z.infer<typeof storedDeploymentSchema>;
