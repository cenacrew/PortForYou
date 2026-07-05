import { z } from 'zod';

/** Slugs interdits pour les sites clients. */
export const SLUG_BLACKLIST = [
  'admin',
  'api',
  'app',
  'auth',
  'billing',
  'dashboard',
  'demo',
  'docs',
  'help',
  'mail',
  'portforyou',
  'pfy',
  'root',
  'staging',
  'status',
  'support',
  'test',
  'www',
] as const;

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/, {
    message: '3 à 30 caractères : minuscules, chiffres et tirets (pas en début/fin)',
  })
  .refine((slug) => !SLUG_BLACKLIST.includes(slug as (typeof SLUG_BLACKLIST)[number]), {
    message: 'Ce nom est réservé',
  })
  .refine((slug) => !slug.startsWith('demo-'), { message: 'Le préfixe demo- est réservé' });

export const TEMPLATE_SLUGS = ['atelier', 'monolith', 'papier'] as const;
export type TemplateSlug = (typeof TEMPLATE_SLUGS)[number];

export const orderCreateSchema = z.object({
  templateSlug: z.enum(TEMPLATE_SLUGS),
  siteSlug: slugSchema,
  artistName: z.string().min(1).max(120),
  contactEmail: z.string().email(),
});
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;

export const SITE_STATUSES = ['provisioning', 'live', 'error', 'suspended'] as const;
export type SiteStatus = (typeof SITE_STATUSES)[number];

export const DEPLOYMENT_STEP_IDS = [
  'validation',
  'database',
  'secrets',
  'backend',
  'frontend',
  'checks',
  'finalize',
] as const;
export type DeploymentStepId = (typeof DEPLOYMENT_STEP_IDS)[number];

export const DEPLOYMENT_STEP_LABELS: Record<DeploymentStepId, string> = {
  validation: 'Validation de la commande',
  database: 'Préparation du contenu',
  secrets: 'Génération des accès sécurisés',
  backend: 'Déploiement de votre API',
  frontend: 'Mise en ligne de votre site',
  checks: 'Vérifications finales',
  finalize: 'Finalisation',
};

export type StepStatus = 'pending' | 'running' | 'done' | 'failed';

export interface DeploymentStep {
  id: DeploymentStepId;
  label: string;
  status: StepStatus;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

/** URL publique du front d'un tenant (site Firebase Hosting). */
export function tenantFrontUrl(slug: string): string {
  return `https://pfy-${slug}.web.app`;
}

/** Nom du service Cloud Run du back d'un tenant. */
export function tenantServiceName(slug: string): string {
  return `tenant-${slug}`;
}
