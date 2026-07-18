import { SITE_STATUSES, type SiteStatus } from './platform.js';

/**
 * Machine à états du cycle de vie d'un site (`sites/{id}.status`).
 *
 * Un site naît `provisioning` (créé par `confirmPaidOrder` à la commande
 * payée). Toutes les transitions ultérieures passent par un événement nommé,
 * ce qui rend impossible un état incohérent (un `live` qui repasse
 * `provisioning` sans redéploiement explicite, un retry sur un site sain…).
 *
 * ```
 *                ┌──────────────── redeploy (admin) ───────────────┐
 *                │                                                 │
 *   (création)   ▼                                                 │
 *  ───────▶ provisioning ──provision_succeeded──▶ live ────────────┤
 *                │  ▲                              │                │
 *   provision_   │  │ retry (client, depuis error)│ suspend        │
 *     failed     ▼  │                              ▼                │
 *              error ──────── suspend ────────▶ suspended ──redeploy┘
 *                │                                 ▲
 *                └────────────── suspend ──────────┘
 * ```
 *
 * `redeploy` est l'override admin (permissif : réinstancie depuis n'importe
 * quel état, y compris `suspended` = réactivation). `suspend` est idempotent.
 */

/** État initial d'un site à sa création. */
export const INITIAL_SITE_STATUS: SiteStatus = 'provisioning';

export const SITE_EVENTS = [
  'provision_succeeded',
  'provision_failed',
  'retry',
  'redeploy',
  'suspend',
] as const;

export type SiteEvent = (typeof SITE_EVENTS)[number];

/** Table des transitions légales : état courant → (événement → état cible). */
const TRANSITIONS: Record<SiteStatus, Partial<Record<SiteEvent, SiteStatus>>> = {
  provisioning: {
    provision_succeeded: 'live',
    provision_failed: 'error',
    redeploy: 'provisioning',
    suspend: 'suspended',
  },
  live: {
    redeploy: 'provisioning',
    suspend: 'suspended',
  },
  error: {
    retry: 'provisioning',
    redeploy: 'provisioning',
    suspend: 'suspended',
  },
  suspended: {
    // Override admin uniquement : redéployer un site suspendu le réactive.
    redeploy: 'provisioning',
    suspend: 'suspended',
  },
};

/** Levée quand une transition demandée n'est pas légale. */
export class InvalidSiteTransitionError extends Error {
  constructor(
    public readonly from: SiteStatus,
    public readonly event: SiteEvent,
  ) {
    super(`Transition illégale : ${from} --${event}--> (interdit)`);
    this.name = 'InvalidSiteTransitionError';
  }
}

/**
 * Calcule l'état cible d'un site pour un événement donné. Lève
 * `InvalidSiteTransitionError` si la transition n'est pas autorisée.
 */
export function siteTransition(current: SiteStatus, event: SiteEvent): SiteStatus {
  const next = TRANSITIONS[current]?.[event];
  if (!next) throw new InvalidSiteTransitionError(current, event);
  return next;
}

/** Indique sans lever si une transition est légale (utile pour un pré-check). */
export function canTransition(current: SiteStatus, event: SiteEvent): boolean {
  return Boolean(TRANSITIONS[current]?.[event]);
}

/** Normalise une valeur de statut lue en base ; lève si inconnue. */
export function assertSiteStatus(value: unknown): SiteStatus {
  if (typeof value === 'string' && (SITE_STATUSES as readonly string[]).includes(value)) {
    return value as SiteStatus;
  }
  throw new Error(`Statut de site inconnu : ${String(value)}`);
}
