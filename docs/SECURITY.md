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
| Vérification d'email                  | Token à usage unique (24 h) envoyé à l'inscription (`POST /auth/verify-email`, renvoi via `/auth/resend-verification`) ; `REQUIRE_VERIFIED_EMAIL=1` en prod bloque la commande tant que l'email n'est pas confirmé — comptes Google vérifiés d'office                                        |

## Firestore

- `firestore.rules` : **deny-all intégral** — le navigateur ne parle jamais à Firestore,
  tous les accès passent par l'API (Admin SDK). Le temps réel est servi en SSE.

## Secrets

- **Aucun secret dans le repo, les images Docker ou les workflows.**
- Prod : Secret Manager exclusivement (`tenant-<slug>-admin-hash`, `tenant-<slug>-jwt`),
  injectés par référence dans les services Cloud Run.
- Le mot de passe back-office est envoyé une seule fois par email, jamais stocké en clair.
- CI : Workload Identity Federation (aucune clé de service account exportée).
- **Rotation** : `tenant-<slug>-jwt` tourne automatiquement (Cloud Scheduler `pfy-rotate-secrets`,
  trimestriel → `POST /internal/rotate-secrets`) — force une nouvelle révision Cloud Run pour
  recharger le secret, invalide les sessions back-office en cours (reconnexion requise), sans
  impact pour l'artiste. Le mot de passe admin reste à rotation manuelle (régénération depuis le
  dashboard client) pour ne jamais couper l'accès sans prévenir.

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

- Email de vérification requis avant commande en prod (`REQUIRE_VERIFIED_EMAIL=1`), plafond de
  sites par compte (`MAX_SITES_PER_USER=3`).
- Honeypot sur le formulaire de contact des tenants.
- Analytics sans cookie ni PII : hash journalier salé non réversible, jamais persisté brut.

## Observabilité & alerting

- Dashboard Cloud Monitoring (`infra/monitoring/dashboard.json`) : requêtes/latence/erreurs/CPU
  de `pfy-api`/`pfy-web`, agrégat + détail par tenant, opérations Firestore, queue de provisioning.
- **Alertes 5xx** (`infra/monitoring/alert-5xx.json`, policy Cloud Monitoring déployée par
  `setup-gcp.sh`) : notifie par email dès qu'un taux de 5xx soutenu (5 min) est détecté sur
  `pfy-api`/`pfy-web` ou sur un ou plusieurs `tenant-*`.
- **Error tracking (Sentry/GlitchTip)** : capture des stack traces agrégées sur `pfy-api`, la
  vitrine et les backs templates. No-op sans DSN (aucun envoi en dev/CI). `beforeSend` scrube
  systématiquement avant envoi : en-têtes d'auth (`Authorization`, `Cookie`, `X-Api-Key`…),
  cookies parsés, et toute clé de query/corps matchant `pass|password|token|secret|jwt|api_key`
  → `[redacted]`. `sendDefaultPii: false` (pas d'IP ni de cookies attachés d'office). DSN et
  `SENTRY_AUTH_TOKEN` via Secret Manager en prod, jamais commités.

## Couverture OWASP Top 10 (2021)

Correspondance explicite entre les catégories de l'[OWASP Top 10](https://owasp.org/Top10/)
et les mesures déjà décrites ci-dessus — aucune mesure nouvelle, juste la
mise en correspondance qui manquait.

| Catégorie OWASP                                      | Mesure appliquée                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A01 — Broken Access Control**                      | Ownership systématique sur `/me/sites/:id` (`site.uid == token.uid`) ; Firestore deny-all (aucun accès client direct) ; IAM moindre privilège par service account ; OIDC sur `/internal/*` ; IDOR testé en pentest réel (§ pentest ci-dessous), aucune faille trouvée.                                                                                                                                                                             |
| **A02 — Cryptographic Failures**                     | bcrypt (11 rounds) pour tous les mots de passe ; JWT signé HS256, jamais en localStorage ; cookies httpOnly + `Secure` + `SameSite` ; secrets exclusivement en Secret Manager (jamais en clair, repo ou images) ; TLS de bout en bout (Cloud Run/Hosting).                                                                                                                                                                                         |
| **A03 — Injection**                                  | Validation zod systématique sur 100 % des entrées API (bodies/params/queries), listes blanches de champs (`site_config`) ; Firestore accédé via SDK (pas de requêtes construites par concaténation de chaînes) ; types MIME uploads vérifiés par magic bytes.                                                                                                                                                                                      |
| **A04 — Insecure Design**                            | Rate limiting différencié par sensibilité (login, contact, `slugs/check`, `track`) ; anti-abus (email vérifié avant commande, plafond de sites/compte, honeypot contact) ; réservation de slug avec TTL + garde-fou Hosting (nom déjà pris ailleurs, voir `docs/ARCHITECTURE.md`) ; pipeline de provisioning idempotent à chaque étape.                                                                                                            |
| **A05 — Security Misconfiguration**                  | helmet sur tous les services Express ; CSP stricte avec nonces par requête sur la vitrine ; CORS à origine unique explicite par service ; Firestore rules deny-all ; aucun secret dans les images Docker/workflows CI ; permissions GitHub Actions minimales par défaut, élargies job par job.                                                                                                                                                     |
| **A06 — Vulnerable and Outdated Components**         | `pnpm audit --audit-level high` bloquant en CI (`security.yml`) ; Renovate (mises à jour automatisées, dashboard de dépendances) ; `dependency-review.yml` sur chaque PR ; CodeQL (SAST) ; actions GitHub épinglées par SHA (pas de tag mobile) ; image de base Docker épinglée par digest.                                                                                                                                                        |
| **A07 — Identification and Authentication Failures** | Refresh token opaque rotatif avec détection de réutilisation (révocation globale des sessions) ; access token courte durée (15 min) ; state signé anti-CSRF sur l'OAuth Google fait main ; vérification d'email obligatoire avant commande en prod ; token de reset mot de passe à usage unique (1 h), réponse identique compte existant ou non (pas d'énumération).                                                                               |
| **A08 — Software and Data Integrity Failures**       | CI/CD via Workload Identity Federation (aucune clé de service account exportée) ; signature Stripe vérifiée sur raw body avant tout traitement de webhook ; idempotence des événements webhook (écriture atomique `.create()`) ; scan Trivy des images Docker avant déploiement (`CRITICAL,HIGH`, bloquant).                                                                                                                                       |
| **A09 — Security Logging and Monitoring Failures**   | Logs structurés JSON (pino) vers Cloud Logging, jamais de secrets/tokens dans les logs ; dashboard Cloud Monitoring (requêtes/latence/erreurs/CPU) ; alertes 5xx automatiques ; error tracking Sentry avec scrubbing systématique des données sensibles avant envoi (`beforeSend`).                                                                                                                                                                |
| **A10 — Server-Side Request Forgery (SSRF)**         | Surface d'exposition minimale : aucun endpoint ne récupère une URL fournie par un utilisateur pour la plateforme elle-même. Les seules requêtes sortantes server-side vers des URLs "dynamiques" sont les health checks (`verify()`, `/internal/health-checks`), qui ciblent exclusivement des URLs de tenants déjà provisionnés par notre propre pipeline (jamais une entrée utilisateur arbitraire) — pas de proxy ni de fetch générique exposé. |

## Dépendances & CI

- `pnpm audit --audit-level high` bloquant en CI.
- Lint + tests + build obligatoires avant tout déploiement.
- Secret scanning + push protection GitHub (natif, dépôt public) en première ligne de défense ;
  complété localement par `gitleaks` en hook `pre-commit` (`.gitleaks.toml`, ceinture-et-bretelles
  — scan si l'outil est installé sur le poste, non bloquant sinon).

## À faire avant une mise en production commerciale

- [x] Email de vérification à l'inscription (`REQUIRE_VERIFIED_EMAIL=1` en prod ; comptes Google vérifiés d'office)
- [x] CSP stricte avec nonces par requête (`apps/web/src/middleware.ts`)
- [x] Budget GCP avec alertes 50/90/100 % (`setup-gcp.sh`, variable `BILLING_ACCOUNT_ID`)
- [x] Alertes 5xx Cloud Monitoring (`infra/monitoring/alert-5xx.json`)
- [x] Rotation périodique des secrets tenants (JWT_SECRET, trimestriel — mot de passe admin en rotation manuelle assumée)
- [x] Test de pénétration du flow de provisioning (revue de code + exploitation réelle contre l'API locale, `apps/api/src/__tests__/pentest.provisioning.int.test.ts`)
  - **Faille trouvée et corrigée** : `confirmPaidOrder` faisait un read-check-create non transactionnel — un rejeu concurrent du webhook Stripe (ou double appel) pouvait créer deux sites pour la même commande. Corrigé par une transaction Firestore (`apps/api/src/orders/service.ts`) ; l'idempotence de la réclamation d'événement webhook est également passée en écriture atomique (`.create()` au lieu de get-puis-set). Les deux tiennent désormais sous contention réelle (testé avec 10 requêtes concurrentes sur le même slug, et un rejeu concurrent du paiement).
  - IDOR, auth OIDC des routes `/internal/*` et réservation de slug : aucune faille trouvée, protections validées empiriquement (pas seulement à la lecture du code).
