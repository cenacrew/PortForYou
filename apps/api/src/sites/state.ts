import {
  siteTransition,
  assertSiteStatus,
  type SiteEvent,
  type SiteStatus,
} from '@portforyou/shared';

/**
 * Applique un événement de cycle de vie à un site : valide la transition
 * (`siteTransition` de `packages/shared`) PUIS écrit le nouveau statut. C'est
 * l'unique point de mutation de `sites/{id}.status` — un état incohérent
 * (un `live` qui repasse `provisioning`, un retry sur un site sain…) est rejeté
 * avant toute écriture, par une `InvalidSiteTransitionError`.
 *
 * `extra` porte les champs annexes propres à la transition (urls + liveAt au
 * passage `live`, suspendedAt à la suspension…), écrits atomiquement avec le
 * statut.
 */
export async function transitionSite(
  ref: FirebaseFirestore.DocumentReference,
  currentStatus: unknown,
  event: SiteEvent,
  extra: Record<string, unknown> = {},
): Promise<SiteStatus> {
  const to = siteTransition(assertSiteStatus(currentStatus), event);
  await ref.update({ status: to, ...extra });
  return to;
}
