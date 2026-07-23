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
- [ ] Investigation complémentaire sur le détail exact des postes de coût
      restants (CPU/ressources par service, volume de requêtes réel sur
      21-22/07) — voir résultat rapporté séparément à l'utilisateur.
