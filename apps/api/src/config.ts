import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(8081),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  /** SHA du commit déployé (injecté au deploy Cloud Run), exposé par /health. */
  COMMIT_SHA: z.string().default('dev'),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  GCP_PROJECT_ID: z.string().default('portforyou-vsp'),
  GCP_REGION: z.string().default('europe-west1'),
  PAYMENT_DRIVER: z.enum(['fake', 'stripe']).default('fake'),
  PROVISIONER_DRIVER: z.enum(['fake', 'gcp']).default('fake'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  /** Prix Stripe (créés par `pnpm stripe-setup`) : fixe, domaine, metered infra. */
  STRIPE_PRICE_BASE: z.string().optional(),
  STRIPE_PRICE_DOMAIN: z.string().optional(),
  STRIPE_PRICE_INFRA: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  /** Adresse qui reçoit les demandes de devis du formulaire de contact. */
  CONTACT_INBOX: z.string().optional(),
  /** Nombre maximum de sites par compte (anti-abus). */
  MAX_SITES_PER_USER: z.coerce.number().default(3),
  /** Bucket GCS des builds statiques des fronts de templates. */
  TEMPLATE_BUILDS_BUCKET: z.string().default('portforyou-template-builds'),
  /** Bucket GCS des uploads des tenants. */
  UPLOADS_BUCKET: z.string().default('portforyou-uploads'),
  /** Image Docker des backs de templates ({template} est substitué). */
  TEMPLATE_IMAGE_PATTERN: z
    .string()
    .default('europe-west1-docker.pkg.dev/portforyou-vsp/pfy/{template}-back:latest'),
  /** URL publique de l'API (audience OIDC des Cloud Tasks). */
  API_PUBLIC_URL: z.string().default('http://localhost:8081'),
  /** Service account utilisé par Cloud Tasks pour appeler /internal/provision. */
  TASKS_SERVICE_ACCOUNT: z.string().default('pfy-api@portforyou-vsp.iam.gserviceaccount.com'),
  /** SA d'exécution (moindre privilège) des services Cloud Run tenant. */
  TENANT_RUNTIME_SA: z.string().default('pfy-tenant@portforyou-vsp.iam.gserviceaccount.com'),
  /** 1 = le provisioning passe par Cloud Tasks (prod) au lieu du process local. */
  PROVISIONING_VIA_TASKS: z.coerce.number().default(0),
  /** 1 = exiger un email vérifié avant de commander (prod). */
  REQUIRE_VERIFIED_EMAIL: z.coerce.number().default(0),
  /** Secret de signature des JWT (access tokens + states OAuth). */
  JWT_SECRET: z.string().default('dev_secret_change_me'),
  /** OAuth Google fait main — vides = bouton Google inactif. */
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  /** Error tracking Sentry/GlitchTip — vide = no-op (aucun envoi réseau). */
  SENTRY_DSN: z.string().optional(),
  /** Environnement rapporté à Sentry (défaut : NODE_ENV). */
  SENTRY_ENVIRONMENT: z.string().optional(),
  /** Taux d'échantillonnage des traces de perf (0 = aucune, défaut). */
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),
});

export const config = envSchema.parse(process.env);

if (config.PAYMENT_DRIVER === 'stripe' && !config.STRIPE_SECRET_KEY) {
  throw new Error('PAYMENT_DRIVER=stripe exige STRIPE_SECRET_KEY');
}

if (config.NODE_ENV === 'production' && config.JWT_SECRET === 'dev_secret_change_me') {
  throw new Error('JWT_SECRET doit être défini en production');
}
