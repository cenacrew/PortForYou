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
