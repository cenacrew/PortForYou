# Incident coûts GCP — services mis en pause le 2026-07-23

## Contexte

Coût Cloud Run constaté d'environ 3,5-4 €/jour sur le projet `portforyou-vsp`,
y compris les 21 et 22 juillet 2026 — jours sans aucun développement ni
déploiement. Investigation menée le 2026-07-23.

## Causes identifiées

1. **Doublons d'uptime checks** — `infra/scripts/setup-uptime-checks.sh`
   vérifiait l'idempotence en filtrant sur `displayName`, qui contient un
   tiret cadratin (`—`). Ce filtre ne matchait jamais de façon fiable
   (constaté sous Windows/Git Bash), donc chaque relance du script recréait
   un doublon au lieu de détecter l'existant. Résultat : `pfy-demo-atelier`
   et `pfy-demo-monolith` avaient chacun 2 uptime checks actifs au lieu d'1,
   doublant leur trafic de health-check (toutes les 5 min, depuis ~6 régions
   par défaut). **Corrigé** : doublons supprimés manuellement, script
   modifié pour filtrer sur le host (ASCII stable) au lieu du displayName.
2. **`tenant-test1`** — un tenant de test provisionné le 2026-07-05,
   jamais nettoyé, resté `status: live` pendant ~18 jours. Pingé en continu
   par le Cloud Scheduler `pfy-health-checks` (toutes les 10 min) comme
   n'importe quel site "live" légitime. **Nettoyé** : service Cloud Run,
   site Firebase Hosting, secrets (`tenant-test1-admin-hash`,
   `tenant-test1-jwt`) et données Firestore (`sites`, `orders`,
   `deployments`, `slugs/test1`) supprimés.
3. Le reste du coût "always-on" restait néanmoins plus élevé que ces deux
   points seuls ne l'expliquent pleinement — voir la synthèse de
   l'investigation plus poussée (postes CPU/ressources par service, volume
   de requêtes réel, Cloud Tasks) au moment de cet incident.

## Action prise : tous les services Cloud Run mis en pause

**À la demande explicite de l'utilisateur**, pour arrêter immédiatement
l'accumulation de coût pendant l'investigation et entre deux sessions de
travail sur le projet :

- **Accès public révoqué** (`roles/run.invoker` pour `allUsers` retiré) sur
  les 5 services Cloud Run actifs : `pfy-api`, `pfy-web`,
  `tenant-demo-atelier`, `tenant-demo-monolith`, `tenant-demo-papier`.
  Toute requête entrante est désormais rejetée en **403** directement par
  l'infrastructure Cloud Run, **avant** qu'un conteneur ne démarre — donc
  sans aucun coût de calcul, contrairement à une simple mise en pause du
  trafic qui laisserait les instances démarrer puis répondre.
- **Cloud Scheduler mis en pause** : `pfy-health-checks`,
  `pfy-cleanup-slugs`, `pfy-billing-cycle`, `pfy-firestore-export` — pour
  qu'ils cessent de tenter d'invoquer des services désormais inaccessibles
  (évite aussi des échecs/alertes parasites).

**Conséquence pour la démo/le rendu** : la vitrine, l'API plateforme et les
3 sites tenants de démonstration sont **actuellement inaccessibles**
(403 sur toute URL). Ce n'est pas une panne — c'est une pause volontaire et
réversible.

## Comment reprendre le service

```bash
# Ré-autoriser l'accès public sur chaque service
for svc in pfy-api pfy-web tenant-demo-atelier tenant-demo-monolith tenant-demo-papier; do
  gcloud run services add-iam-policy-binding "$svc" \
    --region=europe-west1 --project=portforyou-vsp \
    --member="allUsers" --role="roles/run.invoker"
done

# Réactiver les jobs planifiés
for job in pfy-health-checks pfy-cleanup-slugs pfy-billing-cycle pfy-firestore-export; do
  gcloud scheduler jobs resume "$job" --project=portforyou-vsp --location=europe-west1
done

# Réactiver les alertes (désactivées le 2026-08-04 pour stopper le spam de mails
# pendant la pause — sinon "uptime check en échec" se déclenche en continu tant
# que les services répondent 403)
for policy in 1622271028847440026 8761326429789270927; do
  gcloud alpha monitoring policies update "projects/portforyou-vsp/alertPolicies/$policy" \
    --project=portforyou-vsp --enabled
done
```

## Suivi

- [x] Doublons d'uptime checks supprimés + script corrigé
      (`infra/scripts/setup-uptime-checks.sh`).
- [x] `tenant-test1` nettoyé (Cloud Run, Hosting, secrets, Firestore).
- [x] Tous les services Cloud Run mis en pause (accès public révoqué).
- [x] Tous les jobs Cloud Scheduler mis en pause.
- [x] Investigation complémentaire sur le détail exact des postes de coût
      restants — **cause principale identifiée : `cpuIdle`**. Les services
      tenants sont créés via l'API Cloud Run **v2**, dont le défaut est
      `cpuIdle: false` (CPU alloué en permanence, facturé 24/7) ; l'annotation
      v1 `run.googleapis.com/cpu-throttling` utilisée jusque-là y est
      silencieusement ignorée. Corrigé dans `apps/api/src/provisioning/gcp.ts`
      (`resources.cpuIdle: true`) et appliqué aux tenants existants.

## Reprise du service — 2026-07-24

- [x] `cpuIdle: true` **vérifié via l'API v2** (le champ qui fait autorité) sur
      les 5 services, avec `minInstanceCount: 0` — facturation à la requête et
      scale-to-zero confirmés avant remise en ligne.
- [x] Accès public rétabli sur les 5 services, 4 jobs Cloud Scheduler réactivés.
- [x] Plateforme redéployée ; le déploiement de `pfy-web` a d'abord été **bloqué
      par le scan Trivy** (CVE `next` 16.2.10 et `sharp` 0.34.5) — le garde-fou
      a joué son rôle. Débloqué par `next` 16.2.11 (#60) et un override
      `sharp >= 0.35.3` (#61).
- [x] **Fréquence de sondage réduite** pour limiter les réveils de conteneurs :
      uptime checks 5 min → **15 min** (maximum autorisé) et régions ~6 → **3**
      (minimum) ⇒ ~288 → ~48 req/h ; `pfy-health-checks` `*/10` → `*/30`
      ⇒ ~42 → ~14 req/h. Contrepartie assumée : détection d'une panne en 15 min
      au lieu de 5.

## Suivi — 2026-08-04 : nouvelle pause + alertes oubliées

Les services ont été re-mis en pause manuellement entre le 24/07 et le 04/08
(accès public révoqué sur les 5 services, 4 jobs Scheduler en pause —
confirmé par les Cloud Audit Logs). Un tenant de test (`tenant-vangogh`,
créé/nettoyé le 24/07 durant la vérification du fix `cpuIdle`) n'a rien à
voir avec le coût constaté — il a été entièrement supprimé le jour même.

Vérifications faites le 2026-08-04 :

- **Compute confirmé à zéro** : métrique
  `run.googleapis.com/container/billable_instance_time` = 0 sur le 1er-4 août
  (hors 6,1s le 28/07, négligeable). La pause Cloud Run/Scheduler fonctionne
  toujours correctement.
- **Cause réelle du coût résiduel** (identifiée après lecture du détail par
  SKU sur la facture — pas du Cloud Run comme il semblait de prime abord) :
  SKU **« Artifact Registry Network Internet Egress Europe to Europe »**.
  Le job `Release Templates` (build + push + scan Trivy des 3 images
  atelier/monolith/papier) échoue en boucle depuis le **2026-07-27**
  (3 runs consécutifs ratés : 27/07, 31/07, 03/08 — le 3 août étant un lundi,
  jour du `schedule` Renovate, ce qui explique le run supplémentaire ce
  jour-là) à cause d'un **CVE-2026-14257** (HIGH) sur `brace-expansion@2.1.2`,
  dépendance transitive profonde de `firebase-admin` (via `google-gax` →
  `glob` → `minimatch`). Le scan Trivy bloque le workflow _après_ le build
  et le push de l'image (garde-fou attendu), donc chaque run raté pousse
  quand même l'image vers Artifact Registry avant de la rejeter — d'où
  l'egress facturé à chaque tentative, sans lien avec Cloud Run ni avec la
  pause. **Corrigé** : override pnpm (`pnpm-workspace.yaml`), même pattern
  que le fix `sharp` précédent — deux entrées bornées par lignée majeure
  (`brace-expansion` coexiste en 1.x/2.x/5.x dans l'arbre) pour éviter
  qu'une plage trop large n'écrase une lignée par une autre :
  `>=2.0.0 <2.1.3 → ^2.1.3` et `>=5.0.0 <5.0.8 → ^5.0.8`. Vérifié : build +
  tests de `@portforyou/template-back-core` verts après le bump, `pnpm lint`
  inchangé.
- Les ressources hors périmètre de la pause du 23/07 (Firestore
  point-in-time recovery, images Artifact Registry déjà poussées, secrets,
  buckets, sites Firebase Hosting publics) restent, elles, des coûts de
  stockage de base normaux — pas la source du problème signalé, mais à
  garder en tête si un arrêt plus complet est un jour souhaité.
- **Cause distincte trouvée pour le flot de mails** : les 2 alert policies
  Cloud Monitoring (« Uptime check en échec », « Erreurs 5xx ») étaient
  restées actives et envoient à `valetnina.sp@gmail.com` — comme les
  services renvoient volontairement 403 pendant la pause, l'uptime check
  échoue en continu et déclenche une alerte en boucle. La pause du 23/07
  avait mis en pause le Cloud Scheduler pour cette même raison
  (« évite aussi des échecs/alertes parasites ») mais avait oublié le
  monitoring. **Corrigé** : les 2 alert policies ont été désactivées
  (`gcloud alpha monitoring policies update --no-enabled`) le 2026-08-04.
  À réactiver dans la procédure de reprise ci-dessous.

## Suivi — 2026-09-15 : la vraie cause du coût qui a continué malgré la pause

Reprise du projet pour préparer une démo. Avant de relancer quoi que ce soit,
vérification de l'état réel (GCP + GitHub) plutôt que de se fier à ce
document : **la pause Cloud Run/Scheduler/alertes du 04/08 était toujours en
place et fonctionnait correctement** (les 5 services renvoyaient bien 403,
aucun binding `allUsers` sur l'IAM policy d'aucun service). Ce n'était donc
pas elle qui avait laissé filer du coût.

**Découverte** : le fix `brace-expansion` documenté ci-dessus comme
« corrigé » le 2026-08-04 n'avait **jamais atteint `origin/main`** — il ne
vivait que dans un arbre de travail local jamais commité, sur un `main`
local qui avait en plus 27 commits de retard sur origin (rattrapés par
fast-forward le 2026-09-15, sans conflit). Conséquence concrète : le job
`deploy` de `ci.yml` (images `pfy-api`/`pfy-web`) et `Release Templates`
(3 templates) ont continué à échouer au scan Trivy **à chaque merge
Renovate depuis fin juillet** (dernier échec confirmé le 14/09, la veille de
cette reprise) — Trivy bloque _après_ le build + push de l'image vers
Artifact Registry, donc chaque tentative ratée facturait de l'egress,
**indépendamment de l'état de la pause Cloud Run**. `renovate.json` automerge
les patches/pins/digests chaque lundi, ce qui rouvrait ce problème
chaque semaine.

Causes réelles identifiées dans les logs Trivy du 14-15/09 (4 CVE distinctes,
sur les 5 images) :

- `brace-expansion` (CVE-2026-14257 + CVE-2026-69152, qui contourne le
  correctif de la première) — trois lignées vulnérables dans l'arbre
  (1.1.16, 2.1.2, 5.0.7)
- `ip-address@10.2.0` (CVE-2026-69192) — dépendance **directe** (pas
  seulement transitive) de `@portforyou/api` et `@portforyou/template-back-core`
  via `express-rate-limit`
- `libpcre2-8-0@10.42-1` (CVE-2026-86145/89161) — paquet Debian de l'image de
  base `node:24.18.1-slim`, dont le digest figé ne contenait pas encore le
  correctif upstream
- `next@16.2.11` (CVE-2026-75604, **CRITICAL**, RCE non authentifiée) — sur
  l'image `pfy-web` uniquement

**Corrigé** (4 PR, mergées et vérifiées vertes sur `main` le 2026-09-15) :

- [#95](https://github.com/cenacrew/PortForYou/pull/95) — overrides pnpm
  `brace-expansion`/`ip-address` (même pattern que l'override `sharp`
  existant, bornes par lignée majeure)
- [#96](https://github.com/cenacrew/PortForYou/pull/96) — `RUN apt-get
update && apt-get upgrade -y` ajouté dans l'étage final des 5 Dockerfiles
  (`apps/api`, `apps/web`, 3 templates back) — patche les paquets Debian sans
  casser le pin du digest de base
- [#90](https://github.com/cenacrew/PortForYou/pull/90) et
  [#92](https://github.com/cenacrew/PortForYou/pull/92) — deux PR Renovate
  de sécurité qui restaient ouvertes faute d'automerge (`multer` → 2.3.0,
  `next` → 16.3.3)

**Vérifié** : `Release Templates` (`workflow_dispatch`) vert sur les 3
templates ; `ci.yml` `deploy` vert avec build + scan Trivy + déploiement
Cloud Run réels pour `pfy-api` et `pfy-web` (le seul échec résiduel du run,
le smoke test santé API, était le 403 attendu de la pause — pas un bug).

**Non lié à cet incident, découvert au passage** : GitHub signale 46
vulnérabilités Dependabot sur `main` avant ce nettoyage (2 critiques, 20
HIGH, 22 moderate, 2 low) — seules les 4 ci-dessus bloquaient réellement le
déploiement ; le reste est un backlog de sécurité plus large, hors périmètre
de cette reprise.

### Reprise du service pour la démo — 2026-09-15

- [x] Accès public rétabli sur les 5 services Cloud Run (vérifié : 200 sur
      les 5 URLs `*.run.app` et sur les 4 URLs `*.web.app` publiques —
      pas de cache Hosting périmé sur des 403).
- [x] 4 jobs Cloud Scheduler réactivés (`ENABLED` confirmé).
- [x] 2 alertes Cloud Monitoring réactivées, **après** vérification de la
      santé des services (pour ne pas rouvrir le spam de mails du
      2026-08-04 sur des services qui seraient encore en 403).
- [x] `pfy-api`/`pfy-web` tournent désormais sur le code du 2026-09-15
      (dernier `main`), pas sur les révisions figées du 24/07. Les 3 tenants
      de démo tournent toujours sur leurs révisions de juillet (`cpuIdle`/
      `minScale=0` déjà vérifiés à l'époque) — non re-déployés aujourd'hui,
      pas nécessaire pour la démo.

## Après la démo : coupure complète (à exécuter quand la démo est terminée)

Les deux pauses précédentes (23/07, 04/08) étaient réversibles mais
incomplètes — elles ne couvraient pas le CI/Renovate, qui a continué à
coûter malgré elles (voir plus haut). Cette fois, niveau choisi : **suppression
des ressources actives**, projet/Firestore/Artifact Registry conservés
(coûts de stockage résiduels négligeables, redeploy complet possible plus tard).

```bash
# 1. Supprimer les 5 services Cloud Run (plus de compute du tout, plus besoin
#    de gérer l'IAM invoker)
for svc in pfy-api pfy-web tenant-demo-atelier tenant-demo-monolith tenant-demo-papier; do
  gcloud run services delete "$svc" --region=europe-west1 --project=portforyou-vsp --quiet
done

# 2. Supprimer les sites Firebase Hosting associés
firebase hosting:sites:delete portforyou --project=portforyou-vsp --force
firebase hosting:sites:delete pfy-demo-atelier --project=portforyou-vsp --force
firebase hosting:sites:delete pfy-demo-monolith --project=portforyou-vsp --force
firebase hosting:sites:delete pfy-demo-papier --project=portforyou-vsp --force

# 3. Supprimer les jobs Cloud Scheduler et les uptime checks (inutiles sans
#    services à sonder)
for job in pfy-health-checks pfy-cleanup-slugs pfy-billing-cycle pfy-firestore-export; do
  gcloud scheduler jobs delete "$job" --project=portforyou-vsp --location=europe-west1 --quiet
done
gcloud monitoring uptime-check-configs list --project=portforyou-vsp --format="value(name)" \
  | xargs -I{} gcloud monitoring uptime-check-configs delete {} --project=portforyou-vsp --quiet

# 4. Supprimer les secrets spécifiques aux 3 tenants de démo (recréés
#    automatiquement par le pipeline de provisioning à la prochaine
#    instanciation — ne PAS supprimer les secrets plateforme : pfy-jwt-secret,
#    pfy-stripe-secret, pfy-stripe-webhook, pfy-google-oauth-secret,
#    pfy-resend-key, pfy-sentry-dsn coûtent un montant négligeable et évitent
#    de tout reconfigurer — Stripe, OAuth Google, Resend — au redeploy)
for secret in tenant-demo-atelier-admin-hash tenant-demo-atelier-jwt \
              tenant-demo-monolith-admin-hash tenant-demo-monolith-jwt \
              tenant-demo-papier-admin-hash tenant-demo-papier-jwt; do
  gcloud secrets delete "$secret" --project=portforyou-vsp --quiet
done

# 5. Nettoyer tout tenant créé PENDANT la démo elle-même (le même piège que
#    tenant-test1/tenant-vangogh deux fois déjà — vérifier `sites/` dans
#    Firestore et `gcloud run services list` avant de considérer que c'est fini)
```

**Ne pas oublier** : les alertes restent actives et pointeront vers des
services supprimés → 404/erreurs DNS en boucle si un uptime check survit à
l'étape 3. Vérifier `gcloud alpha monitoring policies list` après coup et
désactiver ce qui reste.

**Risque structurel restant, à surveiller au prochain redeploy** : les 4 CVE
corrigées aujourd'hui étaient les seules bloquantes _à cette date_ — Renovate
automerge toujours les patches/digests chaque lundi, et la prochaine CVE sur
une dépendance non couverte par un override refera échouer `deploy`/`Release
Templates` de la même façon (build + push avant rejet Trivy). Envisager, hors
urgence démo, de faire échouer le scan _avant_ le push de l'image plutôt
qu'après, pour rendre ce mode de facturation impossible structurellement.

### Coupure exécutée — 2026-09-20

- [x] 6 services Cloud Run supprimés (les 5 prévus + `tenant-demonstration`, créé pendant la démo).
- [x] Sites Hosting supprimés : `pfy-demo-*`, `pfy-demonstration`, `portforyou` (le site par défaut `portforyou-vsp` ne peut pas l'être).
- [x] 4 jobs Scheduler, 4 uptime checks et 2 politiques d'alerte supprimés ; 8 secrets de tenants supprimés (secrets plateforme conservés).
- [x] 11 workflows GitHub Actions désactivés (`gh workflow enable` pour les rétablir), Dependabot (alertes + security updates) désactivé, Renovate coupé via `"enabled": false` dans `.github/renovate.json`, notifications du repo ignorées.
- **Remise en service** : réactiver les workflows, retirer `"enabled": false`, réactiver Dependabot, puis redéployer via `ci.yml`/`seed-demos`.
