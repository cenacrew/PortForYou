# Sécurité — Port'ForYou

Mesures appliquées, par couche. Référence : PortForYou.md §9.

## Validation d'entrée

- **API plateforme** : zod sur tous les bodies (`middleware/validate.ts`), schémas partagés
  dans `@portforyou/shared` (source de vérité des types via `z.infer`).
- **Backs templates** : listes blanches de champs (`site_config`), enum des techniques,
  types MIME vérifiés sur upload, noms de fichiers régénérés (UUID).
- Slugs : regex stricte + blacklist + préfixe `demo-` réservé (`packages/shared/src/platform.ts`).

## Authentification & autorisation

| Surface                               | Mécanisme                                                                                                                                                                                                                                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plateforme (vitrine/dashboards)       | **Auth maison** : bcrypt (11 rounds), access token JWT 15 min (mémoire navigateur uniquement), refresh token opaque **rotatif** 30 j en cookie httpOnly (`SameSite=None+Secure` en prod, sous-domaines run.app distincts) — la réutilisation d'un ancien refresh révoque toutes les sessions |
| OAuth Google                          | Authorization Code **fait main**, côté serveur : state signé anti-CSRF, id_token vérifié (signature + audience), aucun SDK client                                                                                                                                                            |
| Reset mot de passe                    | Token à usage unique (1 h), hash stocké, réponse identique compte existant ou non                                                                                                                                                                                                            |
| Rôle admin plateforme                 | Champ `role` du document `users` (script `set-admin`), porté par le JWT — re-login requis                                                                                                                                                                                                    |
| Suivi temps réel                      | SSE servi par l'API (Admin SDK côté serveur) ; token en query pour EventSource, vérifié comme un Bearer                                                                                                                                                                                      |
| Back-office tenant                    | Bcrypt + JWT cookie httpOnly `SameSite` ; secrets par tenant dans Secret Manager                                                                                                                                                                                                             |
| `/internal/*` (Cloud Tasks/Scheduler) | Token OIDC Google vérifié : audience = URL de l'API, émetteur = service account `pfy-api`                                                                                                                                                                                                    |
| Ownership                             | Toute route `/me/sites/:id` vérifie `site.uid == token.uid`                                                                                                                                                                                                                                  |

## Firestore

- `firestore.rules` : **deny-all intégral** — le navigateur ne parle jamais à Firestore,
  tous les accès passent par l'API (Admin SDK). Le temps réel est servi en SSE.

## Secrets

- **Aucun secret dans le repo, les images Docker ou les workflows.**
- Prod : Secret Manager exclusivement (`tenant-<slug>-admin-hash`, `tenant-<slug>-jwt`),
  injectés par référence dans les services Cloud Run.
- Le mot de passe back-office est envoyé une seule fois par email, jamais stocké en clair.
- CI : Workload Identity Federation (aucune clé de service account exportée).

## Réseau & HTTP

- helmet sur tous les services Express ; headers de sécurité sur la vitrine (next.config.ts).
- CORS : origine unique explicite par service.
- Rate limiting : global 100/min/IP ; login tenant 10/15 min ; contact 5/15 min ;
  `slugs/check` 30/min ; `track` 120/min.
- Webhook Stripe : signature vérifiée sur raw body + idempotence (`stripe_events`).

## IAM (moindre privilège)

- `pfy-api` : provisioning des tenants uniquement (run.admin, hosting, secrets, tasks).
- `pfy-ci` : push d'images + deploy des services plateforme, rien d'autre.
- Voir `infra/scripts/setup-gcp.sh` pour la liste exacte des rôles.

## Anti-abus

- Vérification d'email non requise en démo mais champ prévu (`MAX_SITES_PER_USER=3`).
- Honeypot sur le formulaire de contact des tenants.
- Analytics sans cookie ni PII : hash journalier salé non réversible, jamais persisté brut.

## Dépendances & CI

- `pnpm audit --audit-level high` bloquant en CI.
- Lint + tests + build obligatoires avant tout déploiement.

## À faire avant une mise en production commerciale

- [ ] Email de vérification à l'inscription (le flag `REQUIRE_VERIFIED_EMAIL` existe mais reste off tant que l'envoi n'est pas implémenté ; les comptes Google sont vérifiés d'office)
- [x] CSP stricte avec nonces par requête (`apps/web/src/middleware.ts`)
- [x] Budget GCP avec alertes (`setup-gcp.sh`, variable `BILLING_ACCOUNT`)
- [ ] Alertes 5xx Cloud Monitoring
- [ ] Rotation périodique des secrets tenants
- [ ] Pénétration test du flow de provisioning
