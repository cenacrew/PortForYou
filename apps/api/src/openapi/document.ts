import { z } from 'zod';
import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  type RouteConfig,
} from '@asteasolutions/zod-to-openapi';
import { orderCreateSchema, TEMPLATE_SLUGS, SITE_STATUSES } from '@portforyou/shared';
import { config } from '../config.js';

// Active `.openapi()` sur l'instance zod du monorepo. Note zod v4 : les méthodes
// de prototype sont figées à la construction du schéma, donc seuls les schémas
// créés APRÈS cet appel exposent `.openapi()`. Les schémas de `packages/shared`
// sont construits à leur import (bien avant ici) : on ne peut pas les nommer via
// `.openapi()` directement — on les passe donc en ligne au générateur (qui lit
// leur structure zod, sans dépendre de `.openapi()`), et pour les nommer comme
// composants réutilisables on ré-emballe leur `.shape` (mêmes définitions de
// champs, source de vérité — aucune duplication) dans une instance post-extension.
extendZodWithOpenApi(z);

// ---------------------------------------------------------------------------
// Schémas de réponse (dérivés des routes réelles, cf. apps/api/src/routes/*)
// ---------------------------------------------------------------------------

const ErrorResponse = z
  .object({
    error: z.string(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
    requestId: z.string().optional(),
  })
  .openapi('ErrorResponse');

const HealthResponse = z
  .object({
    ok: z.boolean(),
    service: z.literal('portforyou-api'),
    commit: z.string().optional(),
    payment: z.string().optional(),
    provisioner: z.string().optional(),
    error: z.string().optional(),
  })
  .openapi('HealthResponse');

const TemplateItem = z.object({
  slug: z.enum(TEMPLATE_SLUGS),
  name: z.string(),
  tagline: z.string(),
  description: z.string(),
  demoUrl: z.string().url().nullable(),
  available: z.boolean(),
});

const TemplatesResponse = z
  .object({
    items: z.array(TemplateItem),
    techniques: z.record(z.string(), z.string()),
  })
  .openapi('TemplatesResponse');

const SlugCheckResponse = z
  .object({
    slug: z.string(),
    available: z.boolean(),
    reason: z.string().optional(),
  })
  .openapi('SlugCheckResponse');

const ContactBody = z
  .object({
    name: z.string().min(1).max(120),
    email: z.string().email().max(200),
    projectType: z.string().max(120).optional(),
    budget: z.string().max(60).optional(),
    message: z.string().min(10).max(5000),
  })
  .openapi('ContactRequest');

const OkResponse = z.object({ ok: z.boolean() }).openapi('OkResponse');

const CredentialsBody = z
  .object({ email: z.string().email().max(200), password: z.string().min(8).max(200) })
  .openapi('Credentials');

const RegisterBody = CredentialsBody.extend({ name: z.string().min(1).max(120) }).openapi(
  'RegisterRequest',
);

const PublicUser = z
  .object({
    uid: z.string(),
    email: z.string().email(),
    displayName: z.string(),
    emailVerified: z.boolean(),
    role: z.enum(['client', 'admin']).optional(),
  })
  .openapi('PublicUser');

const AuthSession = z.object({ accessToken: z.string(), user: PublicUser }).openapi('AuthSession');

const OrderCreatedResponse = z
  .object({ orderId: z.string(), checkoutUrl: z.string().url() })
  .openapi('OrderCreatedResponse');

const Site = z
  .object({
    id: z.string(),
    slug: z.string(),
    templateSlug: z.enum(TEMPLATE_SLUGS),
    artistName: z.string(),
    status: z.enum(SITE_STATUSES),
    urls: z.record(z.string(), z.string()).nullable(),
    plannedUrl: z.string().optional(),
    adminEmail: z.string().email().nullable(),
    createdAt: z.string().datetime().nullable(),
    liveAt: z.string().datetime().nullable(),
  })
  .openapi('Site');

const SitesListResponse = z.object({ items: z.array(Site) }).openapi('SitesListResponse');

const AdminOverviewResponse = z
  .object({
    clients: z.number(),
    sites: z.number(),
    sitesByStatus: z.record(z.string(), z.number()),
    failedDeployments: z.number(),
  })
  .openapi('AdminOverviewResponse');

// ---------------------------------------------------------------------------
// Registre : schémas partagés + chemins des routes principales
// ---------------------------------------------------------------------------

function buildRegistry(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();

  const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });
  const auth = [{ [bearerAuth.name]: [] as string[] }];

  // Composant nommé dérivé du schéma partagé `orderCreateSchema` : on ré-emballe
  // son `.shape` (mêmes champs, source unique) dans une instance post-extension
  // pour pouvoir l'exposer sous `components.schemas.OrderCreateInput`.
  const OrderCreateInput = registry.register(
    'OrderCreateInput',
    z.object(orderCreateSchema.shape).openapi('OrderCreateInput'),
  );

  const json = (schema: z.ZodTypeAny) => ({ 'application/json': { schema } });

  const path = (route: RouteConfig) => registry.registerPath(route);

  // ---- Public -------------------------------------------------------------
  path({
    method: 'get',
    path: '/api/v1/health',
    tags: ['public'],
    summary: 'État de santé de l’API (lecture Firestore légère).',
    responses: {
      200: { description: 'API et Firestore joignables', content: json(HealthResponse) },
      503: { description: 'Firestore injoignable', content: json(HealthResponse) },
    },
  });

  path({
    method: 'get',
    path: '/api/v1/templates',
    tags: ['public'],
    summary: 'Catalogue des templates de portfolio.',
    responses: {
      200: {
        description: 'Liste des templates + libellés de techniques',
        content: json(TemplatesResponse),
      },
    },
  });

  path({
    method: 'get',
    path: '/api/v1/slugs/check',
    tags: ['public'],
    summary: 'Vérifie la disponibilité d’un slug de site.',
    request: { query: z.object({ slug: z.string() }) },
    responses: {
      200: { description: 'Résultat de disponibilité', content: json(SlugCheckResponse) },
    },
  });

  path({
    method: 'post',
    path: '/api/v1/contact',
    tags: ['public'],
    summary: 'Demande de devis personnalisé (sans compte).',
    request: { body: { content: json(ContactBody) } },
    responses: {
      201: { description: 'Demande enregistrée', content: json(OkResponse) },
      400: { description: 'Formulaire invalide', content: json(ErrorResponse) },
    },
  });

  // ---- Authentification ---------------------------------------------------
  path({
    method: 'post',
    path: '/api/v1/auth/register',
    tags: ['auth'],
    summary: 'Création de compte (email + mot de passe).',
    request: { body: { content: json(RegisterBody) } },
    responses: {
      201: { description: 'Compte créé, session ouverte', content: json(AuthSession) },
      400: { description: 'Entrée invalide', content: json(ErrorResponse) },
      409: { description: 'Email déjà utilisé', content: json(ErrorResponse) },
    },
  });

  path({
    method: 'post',
    path: '/api/v1/auth/login',
    tags: ['auth'],
    summary: 'Connexion (email + mot de passe).',
    request: { body: { content: json(CredentialsBody) } },
    responses: {
      200: { description: 'Session ouverte', content: json(AuthSession) },
      401: { description: 'Identifiants invalides', content: json(ErrorResponse) },
      403: { description: 'Compte Google (utiliser OAuth)', content: json(ErrorResponse) },
    },
  });

  path({
    method: 'post',
    path: '/api/v1/auth/refresh',
    tags: ['auth'],
    summary: 'Rotation du refresh token (cookie httpOnly).',
    responses: {
      200: { description: 'Nouveau token d’accès', content: json(AuthSession) },
      401: { description: 'Session absente ou expirée', content: json(ErrorResponse) },
    },
  });

  path({
    method: 'post',
    path: '/api/v1/auth/logout',
    tags: ['auth'],
    summary: 'Déconnexion (révoque la session courante).',
    responses: { 200: { description: 'Déconnecté', content: json(OkResponse) } },
  });

  path({
    method: 'post',
    path: '/api/v1/auth/forgot-password',
    tags: ['auth'],
    summary: 'Demande de réinitialisation de mot de passe.',
    request: { body: { content: json(z.object({ email: z.string().email().max(200) })) } },
    responses: {
      200: { description: 'Toujours 200 (anti-énumération)', content: json(OkResponse) },
    },
  });

  path({
    method: 'post',
    path: '/api/v1/auth/reset-password',
    tags: ['auth'],
    summary: 'Réinitialise le mot de passe via un token à usage unique.',
    request: {
      body: {
        content: json(
          z.object({ token: z.string().min(10), password: z.string().min(8).max(200) }),
        ),
      },
    },
    responses: {
      200: { description: 'Mot de passe changé', content: json(OkResponse) },
      400: { description: 'Lien invalide ou expiré', content: json(ErrorResponse) },
    },
  });

  path({
    method: 'post',
    path: '/api/v1/auth/verify-email',
    tags: ['auth'],
    summary: 'Vérifie l’adresse email via un token à usage unique.',
    request: { body: { content: json(z.object({ token: z.string().min(10) })) } },
    responses: {
      200: { description: 'Email vérifié', content: json(OkResponse) },
      400: { description: 'Lien invalide ou expiré', content: json(ErrorResponse) },
    },
  });

  // ---- Commandes & paiement ----------------------------------------------
  path({
    method: 'post',
    path: '/api/v1/orders',
    tags: ['orders'],
    summary: 'Crée une commande et sa session de paiement.',
    security: auth,
    request: { body: { content: json(OrderCreateInput) } },
    responses: {
      201: { description: 'Commande créée', content: json(OrderCreatedResponse) },
      401: { description: 'Non authentifié', content: json(ErrorResponse) },
      403: { description: 'Email non vérifié ou quota atteint', content: json(ErrorResponse) },
      409: { description: 'Slug déjà pris', content: json(ErrorResponse) },
    },
  });

  path({
    method: 'post',
    path: '/api/v1/payments/fake/confirm',
    tags: ['payments'],
    summary: 'Confirme un paiement simulé (mode PAYMENT_DRIVER=fake uniquement).',
    security: auth,
    request: { body: { content: json(z.object({ orderId: z.string().min(1) })) } },
    responses: {
      200: {
        description: 'Paiement confirmé, provisioning déclenché',
        content: json(z.object({ ok: z.boolean(), siteId: z.string() })),
      },
      403: { description: 'Paiement simulé désactivé', content: json(ErrorResponse) },
      404: { description: 'Commande introuvable', content: json(ErrorResponse) },
    },
  });

  // ---- Espace client (/me) ------------------------------------------------
  path({
    method: 'get',
    path: '/api/v1/me/sites',
    tags: ['me'],
    summary: 'Liste les sites du client connecté.',
    security: auth,
    responses: {
      200: { description: 'Sites du client', content: json(SitesListResponse) },
      401: { description: 'Non authentifié', content: json(ErrorResponse) },
    },
  });

  path({
    method: 'get',
    path: '/api/v1/me/sites/{id}',
    tags: ['me'],
    summary: 'Détail d’un site + dernier déploiement.',
    security: auth,
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: {
        description: 'Site et dernier déploiement',
        content: json(
          z.object({ site: Site, lastDeployment: z.record(z.string(), z.unknown()).nullable() }),
        ),
      },
      404: { description: 'Site introuvable ou non possédé', content: json(ErrorResponse) },
    },
  });

  path({
    method: 'post',
    path: '/api/v1/me/sites/{id}/retry',
    tags: ['me'],
    summary: 'Relance le déploiement d’un site en échec.',
    security: auth,
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: {
        description: 'Déploiement relancé',
        content: json(z.object({ ok: z.boolean(), deploymentId: z.string() })),
      },
      409: { description: 'Le site n’est pas en échec', content: json(ErrorResponse) },
    },
  });

  path({
    method: 'post',
    path: '/api/v1/me/sites/{id}/regenerate-password',
    tags: ['me'],
    summary: 'Régénère le mot de passe back-office du tenant (rendu une seule fois).',
    security: auth,
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: {
        description: 'Nouveau mot de passe',
        content: json(z.object({ ok: z.boolean(), password: z.string() })),
      },
      409: { description: 'Le site doit être en ligne', content: json(ErrorResponse) },
    },
  });

  path({
    method: 'delete',
    path: '/api/v1/me/account',
    tags: ['me'],
    summary: 'Suppression RGPD du compte (anonymisation + suspension des sites).',
    security: auth,
    responses: {
      200: {
        description: 'Compte supprimé',
        content: json(z.object({ ok: z.boolean(), suspendedSites: z.number() })),
      },
    },
  });

  // ---- Admin plateforme ---------------------------------------------------
  path({
    method: 'get',
    path: '/api/v1/admin/overview',
    tags: ['admin'],
    summary: 'Vue d’ensemble plateforme (réservé aux admins).',
    security: auth,
    responses: {
      200: { description: 'Agrégats plateforme', content: json(AdminOverviewResponse) },
      403: { description: 'Réservé aux admins', content: json(ErrorResponse) },
    },
  });

  path({
    method: 'get',
    path: '/api/v1/admin/sites',
    tags: ['admin'],
    summary: 'Liste tous les sites (réservé aux admins).',
    security: auth,
    responses: {
      200: {
        description: 'Tous les sites',
        content: json(z.object({ items: z.array(z.record(z.string(), z.unknown())) })),
      },
      403: { description: 'Réservé aux admins', content: json(ErrorResponse) },
    },
  });

  path({
    method: 'delete',
    path: '/api/v1/admin/sites/{id}',
    tags: ['admin'],
    summary: 'Déprovisionne et supprime un site (réservé aux admins).',
    security: auth,
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: { description: 'Site supprimé', content: json(OkResponse) },
      404: { description: 'Site introuvable', content: json(ErrorResponse) },
    },
  });

  return registry;
}

// ---------------------------------------------------------------------------
// Génération du document (mémoïsé) — les routes /internal/* sont volontairement
// absentes (surface machine-à-machine OIDC, hors contrat public).
// ---------------------------------------------------------------------------

let cached: ReturnType<OpenApiGeneratorV3['generateDocument']> | null = null;

export function getOpenApiDocument(): ReturnType<OpenApiGeneratorV3['generateDocument']> {
  if (cached) return cached;
  const generator = new OpenApiGeneratorV3(buildRegistry().definitions);
  cached = generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'Port’ForYou — API plateforme',
      version: config.COMMIT_SHA || '0.1.0',
      description:
        'Contrat public de l’API plateforme Port’ForYou, dérivé des schémas zod de ' +
        '`packages/shared` (source de vérité). Les endpoints internes `/internal/*` ' +
        '(surface machine-à-machine OIDC) ne sont pas documentés ici.',
    },
    servers: [{ url: '/', description: 'Même origine que l’API' }],
    tags: [
      { name: 'public', description: 'Endpoints publics (sans authentification).' },
      { name: 'auth', description: 'Inscription, connexion, sessions.' },
      { name: 'orders', description: 'Commandes et checkout.' },
      { name: 'payments', description: 'Paiement (mode simulé et webhook Stripe).' },
      { name: 'me', description: 'Espace client authentifié.' },
      { name: 'admin', description: 'Administration plateforme (rôle admin requis).' },
    ],
  });
  return cached;
}
