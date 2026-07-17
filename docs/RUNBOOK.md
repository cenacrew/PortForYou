# Runbook — Port'ForYou

## Dev local (zéro compte externe)

```bash
pnpm install
pnpm dev    # tout-en-un : émulateurs Docker + shared (watch) + API (8081) + vitrine (3000)
```

Ou dans VSCode : `Ctrl+Shift+B` (task « Dev », un terminal par service).
Lancement service par service si besoin : `pnpm emulators:docker`,
`pnpm --filter @portforyou/api dev`, `pnpm --filter @portforyou/web dev`.

Les émulateurs (Firestore 8090, Storage 9199, UI 4000) tournent dans une image
Docker dédiée (`infra/docker/emulators.Dockerfile`) : le JRE et les binaires sont figés dans
l'image, démarrage en quelques secondes, `docker compose down` pour arrêter.
Sans Docker : `pnpm emulators` (exige Java sur la machine).

Variables utiles (déjà par défaut) : `FIRESTORE_EMULATOR_HOST=localhost:8090`,
`FIREBASE_AUTH_EMULATOR_HOST=localhost:9099` pour l'API ;
`NEXT_PUBLIC_USE_EMULATORS=1` pour la vitrine. Pour les uploads d'images en local,
ajouter `FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199` au back du tenant.

Alternative conteneurisée : `docker compose up` (émulateurs + API + vitrine).

**Flow démo local** : créer un compte sur http://localhost:3000/signup → commander
(template, slug, paiement simulé) → suivre le déploiement en temps réel → le tenant est
seedé dans l'émulateur. Pour visiter le site du tenant en local :

```bash
pnpm --filter @portforyou/template-back-core build   # ou `dev` (tsc --watch) si vous itérez dessus
cd templates/atelier
TENANT_ID=<slug> FIRESTORE_EMULATOR_HOST=localhost:8090 pnpm --filter @portforyou/atelier-back dev   # port 8080
pnpm --filter @portforyou/atelier-front dev                                                          # port 3000 (proxy /api → 8080)
```

Le back des templates est TypeScript (`packages/template-back-core`, compilé en `dist/`) : la
commande `dev` de chaque template (`node src/index.js`) importe le package déjà compilé, donc un
premier `build` (ou un `dev` en watch dans un terminal séparé) est requis avant de le lancer.

**Scan de secrets local (optionnel)** : le hook Husky `pre-commit` lance `gitleaks protect --staged`
si le binaire est installé (`.gitleaks.toml` à la racine) — ceinture-et-bretelles en complément du
secret scanning + push protection GitHub, déjà actifs côté serveur sur ce dépôt public. Installer
gitleaks (`brew install gitleaks`, ou binaire depuis https://github.com/gitleaks/gitleaks/releases)
est recommandé mais pas requis pour committer.

**Email de vérification** : en local (`RESEND_API_KEY` absent), les emails sont loggés dans la
console de l'API au lieu d'être envoyés — récupérer le lien `/verify-email?token=...` dans les
logs après une inscription. `REQUIRE_VERIFIED_EMAIL=0` par défaut en dev (la commande n'est pas
bloquée) ; mettre `1` pour tester le blocage comme en prod.

**Devenir admin plateforme** (dashboard /admin) — après s'être inscrit sur la vitrine :

```bash
FIRESTORE_EMULATOR_HOST=localhost:8090 pnpm --filter @portforyou/api set-admin -- vous@exemple.fr
```

Se déconnecter/reconnecter pour que le JWT porte le nouveau rôle.

**Tests** : `pnpm test` (unitaires) ; `pnpm --filter @portforyou/api test:emu` (intégration,
démarre son propre émulateur — utilisé par la CI ; sous Windows préférer un émulateur déjà
lancé + `vitest run`) ; `pnpm --filter @portforyou/web test:e2e` (Playwright : flow démo
complet — démarre ou réutilise émulateurs + API + vitrine automatiquement ; les ports
8090/9099/3000/8081 doivent être libres ou occupés par la stack complète).

## Stripe (mode test)

Une seule commande, idempotente, crée produit + meter + les 3 prix :

```bash
cd apps/api && STRIPE_SECRET_KEY=sk_test_... pnpm stripe-setup
```

Reporter les `STRIPE_PRICE_*` affichés dans `.env` (local) et dans le workflow de déploiement.
La clé secrète vit dans Secret Manager (`pfy-stripe-secret`). Bascule réelle :
`PAYMENT_DRIVER=stripe` + configurer le webhook Stripe → `https://<url-api>/api/v1/stripe/webhook`
(events `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`)
et poser `STRIPE_WEBHOOK_SECRET`. La facturation de la consommation part chaque 1er du mois
(job Scheduler `pfy-billing-cycle`).

## Première mise en production (projet portforyou-vsp)

1. `gcloud auth login` puis `bash infra/scripts/setup-gcp.sh portforyou-vsp`
   (APIs, buckets, queue, service accounts, WIF ; relancer après l'étape 4 pour Scheduler).
2. Renseigner les variables GitHub du repo : `GCP_WIF_PROVIDER`, `GCP_CI_SERVICE_ACCOUNT`
   (affichées par le script).
3. `firebase deploy --only firestore:rules,firestore:indexes`
4. Lancer le workflow **Release Templates** (images + builds statiques des 3 templates),
   puis **Deploy Platform** (API + vitrine sur Cloud Run).
5. (Optionnel) OAuth Google : console.cloud.google.com → Identifiants → « ID client OAuth »
   (application Web), URI de redirection `https://<url-pfy-api>/api/v1/auth/google/callback` ;
   poser `GOOGLE_OAUTH_CLIENT_ID`/`GOOGLE_OAUTH_CLIENT_SECRET` sur le service `pfy-api`.
6. Donner le rôle admin : `pnpm --filter @portforyou/api set-admin -- vous@exemple.fr`
   (avec ADC sur le projet), après inscription sur la vitrine.
7. Tenants de démo : `PROVISIONER_DRIVER=gcp pnpm --filter @portforyou/api seed-demos`
   (seed + déploiement des 3 instances), poser `DEMO_MODE=1` sur leurs services Cloud Run,
   puis renseigner `demoUrl` dans `apps/web/src/lib/templates.ts` et le catalogue API.
   En local : `FIRESTORE_EMULATOR_HOST=localhost:8090 pnpm --filter @portforyou/api seed-demos`.

## Cloud Monitoring

Dashboard `infra/monitoring/dashboard.json` (créé/mis à jour par `setup-gcp.sh`, idempotent —
relancer le script après modification du fichier pour le pousser) : requêtes/erreurs/latence
`pfy-api` et `pfy-web`, agrégat + détail par service pour les `tenant-*` (requêtes, erreurs 5xx,
instances actives, latence p95), opérations Firestore, profondeur et tentatives de la queue Cloud
Tasks `provisioning`, exécutions des jobs Cloud Scheduler. Mise à jour manuelle sans relancer tout
le script : `gcloud monitoring dashboards update <NAME> --config-from-file=infra/monitoring/dashboard.json`.

**Alertes 5xx** (`infra/monitoring/alert-5xx.json`) : policy Cloud Monitoring, également créée/mise
à jour par `setup-gcp.sh` — canal de notification email (`ALERT_EMAIL`, par défaut
`valetnina.sp@gmail.com`) + policy à 2 conditions (`pfy-api`/`pfy-web`, `tenant-*`), seuil >1 req/s
en 5xx sur 5 min. Mise à jour manuelle : régénérer le fichier avec le nom du canal
(`gcloud alpha monitoring channels list`) puis `gcloud alpha monitoring policies update <NAME>
--policy-from-file=...`. Nécessite le composant `gcloud alpha` (`gcloud components install alpha`).

**Uptime checks** (`infra/scripts/setup-uptime-checks.sh`) : les alertes 5xx ne voient que les
erreurs _avec du trafic_ — un service totalement down et silencieux ne déclenche rien. 4 uptime
checks gratuits (limite 100) pingent `/api/v1/health` de `pfy-api` et des 3 tenants de démo
(`demo-atelier`, `demo-monolith`, `demo-papier`), avec une alerte (`infra/monitoring/alert-uptime.json`)
branchée sur le même canal email que les alertes 5xx. Nécessite le composant `gcloud beta`
(`gcloud components install beta`) et, comme pour les alertes 5xx, `gcloud alpha` pour la policy.
À lancer après `setup-gcp.sh` (réutilise son canal de notification) et après le premier déploiement
de `pfy-api` et des tenants de démo (`seed-demos`).

## Coûts & rétention

**Budget** : `setup-gcp.sh` crée/met à jour un budget Cloud Billing (`portforyou-budget`,
`MONTHLY_BUDGET_EUR`, 20 € par défaut) avec alertes email à 50/90/100 % de consommation — nécessite
`BILLING_ACCOUNT_ID` (action manuelle : `gcloud billing accounts list`, ou console.cloud.google.com
→ Facturation) passé en variable d'environnement au script (non déductible automatiquement, aucune
API ne le lie au projet de façon fiable en amont de sa liaison).

**Rétention Artifact Registry** : chaque déploiement (CI + `release-templates.yml`) pousse une
image taguée par SHA dans le repo `pfy` sans rien purger. `setup-gcp.sh` pose une cleanup policy
(`AR_KEEP_VERSIONS=10` versions les plus récentes conservées par package, `AR_MAX_AGE_DAYS=90` —
purge des images plus vieilles) pour éviter l'accumulation de stockage payant. Mise à jour manuelle
sans relancer tout le script : `gcloud artifacts repositories set-cleanup-policies pfy
--location=europe-west1 --policy=<fichier>`.

## Rotation des secrets tenants

Le `JWT_SECRET` de chaque tenant live tourne automatiquement (Cloud Scheduler `pfy-rotate-secrets`,
trimestriel, 1er jour du mois tous les 3 mois à 04h Europe/Paris → `POST /internal/rotate-secrets`) :
nouvelle valeur poussée en Secret Manager puis nouvelle révision Cloud Run forcée pour la recharger.
Effet visible : les sessions back-office en cours sur les tenants concernés retombent (reconnexion
nécessaire), sans impact sur l'artiste ni son mot de passe. Le mot de passe admin, lui, ne tourne
jamais automatiquement — seule la régénération manuelle depuis le dashboard client (§ ci-dessus,
« Site tenant 401 sur /admin ») le change, pour ne jamais couper l'accès sans prévenir.

## Restauration Firestore

Deux mécanismes de sauvegarde, complémentaires :

- **PITR (Point-in-Time Recovery)** : activé par `setup-gcp.sh` (`gcloud firestore databases
update --enable-pitr`), retour arrière possible à n'importe quel instant sur les **7 derniers
  jours**. Couvre l'erreur récente (bug, mauvaise commande, compromission).
- **Exports GCS hebdomadaires** : `infra/scripts/setup-backups.sh` crée un bucket dédié
  (`gs://portforyou-firestore-backups`, purge automatique > 180 j) et un job Cloud Scheduler
  (`pfy-firestore-export`, dimanche 03h00 Europe/Paris) qui appelle l'API REST Firestore
  `:exportDocuments`. Couvre l'archive longue durée, au-delà de la fenêtre PITR.

### Procédure — restauration PITR (< 7 jours)

1. Identifier l'instant cible (avant l'incident) : `gcloud firestore operations list` et les logs
   Cloud Audit peuvent aider à dater précisément l'écriture fautive.
2. **Restaurer vers une base de secours** (jamais directement sur la base de prod, pour pouvoir
   comparer/valider avant bascule) :
   ```bash
   gcloud firestore databases restore \
     --source-database="projects/portforyou-vsp/databases/(default)" \
     --destination-database="restore-verif" \
     --snapshot-time="2026-07-15T10:00:00Z"
   ```
3. Vérifier les données restaurées sur `restore-verif` (console ou script de contrôle).
4. Bascule : soit ré-export sélectif des documents corrigés vers `(default)`, soit — si la
   restauration complète est nécessaire — coordonner une fenêtre de maintenance (l'API et les
   tenants pointent tous sur `(default)` : un remplacement de base implique un arrêt du trafic
   d'écriture pendant la bascule).
5. Supprimer la base `restore-verif` une fois la vérification terminée (`gcloud firestore
databases delete --database=restore-verif`) — une base Firestore restée en place a un coût.

### Procédure — import depuis un export GCS (> 7 jours ou récupération sélective)

1. Lister les exports disponibles : `gcloud storage ls gs://portforyou-firestore-backups`.
2. Repérer l'export voulu (préfixe horodaté par Firestore, ex.
   `gs://portforyou-firestore-backups/2026-07-13T03:00:00_00001/`).
3. Import complet (écrase les documents existants aux mêmes chemins, n'efface pas les documents
   absents de l'export) :
   ```bash
   gcloud firestore import gs://portforyou-firestore-backups/2026-07-13T03:00:00_00001/
   ```
4. Import ciblé sur une collection (ex. restaurer uniquement `sites` après une purge accidentelle) :
   ```bash
   gcloud firestore import gs://portforyou-firestore-backups/2026-07-13T03:00:00_00001/ \
     --collection-ids=sites
   ```
5. Suivre l'opération : `gcloud firestore operations list` (l'import est asynchrone).

**Impératif** : tester au moins une fois chacune des deux procédures (restauration PITR vers une
base de secours, et import d'un export GCS) avant d'en avoir besoin en urgence — une procédure de
restauration jamais exécutée n'est qu'une hypothèse.

## Purge automatique des jetons d'auth (TTL Firestore)

`setup-gcp.sh` active une policy TTL native Firestore sur le champ `expiresAt` des collections
`sessions`, `password_resets` et `email_verifications` (`apps/api/src/auth/service.ts`) : Firestore
supprime lui-même les documents expirés, en général sous 24h après expiration (best-effort, pas de
garantie de délai exact — l'app vérifie déjà l'expiration à la lecture, la TTL n'est qu'un ménage
de fond gratuit). Rien à opérer côté application.

## Incidents courants

| Symptôme                                             | Cause probable                           | Remède                                                         |
| ---------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------- |
| Déploiement bloqué à « Mise en ligne de votre site » | Artefacts front absents du bucket        | Lancer Release Templates, puis retry admin                     |
| `SLUG_TAKEN` sur un slug censé être libre            | Réservation orpheline                    | Job `cleanup-slugs` (ou suppression manuelle dans `slugs/`)    |
| Site tenant 401 sur /admin                           | Secret régénéré sans redeploy            | Dashboard client → régénérer le mot de passe (redeploy inclus) |
| Health check rouge                                   | Service tenant supprimé/instable         | Admin → Redéployer le site                                     |
| Webhook Stripe 400                                   | `STRIPE_WEBHOOK_SECRET` absent/incorrect | Vérifier le secret dans la config Cloud Run                    |

## Suppression d'un tenant

Dashboard admin → Supprimer : appelle `deprovision` (service Cloud Run, site Hosting,
secrets, données `tenants/{slug}`), libère le slug. Action irréversible.
