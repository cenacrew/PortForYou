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
cd templates/atelier
TENANT_ID=<slug> FIRESTORE_EMULATOR_HOST=localhost:8090 pnpm --filter @portforyou/atelier-back dev   # port 8080
pnpm --filter @portforyou/atelier-front dev                                                          # port 3000 (proxy /api → 8080)
```

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
