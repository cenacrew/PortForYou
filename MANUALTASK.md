# Tâches manuelles restantes — Port'ForYou

> Fichier local, **non commité**. Mis à jour au fil de l'eau.

## ✅ Fait (plus rien à faire)

- **SonarCloud** — token posé + Analyse Automatique désactivée → workflow **vert**.
- **Upptime** — repo `pfy-upptime` configuré (secret `GH_PAT`, config, Pages en mode workflow). **Page de statut en ligne : https://cenacrew.github.io/pfy-upptime/**
- **Sentry API** — actif en prod (DSN Node en Secret Manager).
- **Sentry vitrine** — DSN Next.js câblé (variable de repo, build-arg + env runtime). S'active au déploiement de la vitrine.
- **RGPD** — mentions légales / confidentialité / registre renseignés (cadre projet étudiant, pas d'entité commerciale). Plus aucun placeholder.
- **Budget GCP 5 € + rétention Artifact Registry** — appliqués.
- **Release Please** — réglage activé, la PR de release se crée toute seule.
- **Secret scanning + push protection + protection de branche `main`** — actifs.

---

## Reste à faire (peu, et à ton rythme)

### 1. Merger la PR de release #28 — décision (quand tu veux)
Release Please a ouvert **#28 `chore(main): release portforyou 0.2.0`** (CHANGELOG + tag). La merger crée le tag `v0.2.0`. C'est une décision de release, pas une réparation.
*(Je peux la merger si tu me le demandes.)*

### 2. Test de restauration Firestore — à piloter une fois (30 min)
Opération sur la vraie base de prod, à ne pas automatiser à l'aveugle. Procédure complète : `docs/RUNBOOK.md § Restauration Firestore`.
1. Export de test : `gcloud scheduler jobs run pfy-firestore-export --location=europe-west1`
2. Vérifier : `gcloud storage ls gs://portforyou-firestore-backups`
3. Suivre la procédure d'import du RUNBOOK vers une base de test, puis noter la date du test.

*(Je peux t'assembler les commandes d'import exactes si tu me dis la base cible.)*

---

## Optionnel (si un jour le projet évolue)

- **Sentry backs tenants** : injecter le DSN Node dans le pipeline de provisioning (dis-moi si tu veux, c'est côté code, je m'en occupe).
- **RGPD réel** : remplacer le cadre « projet étudiant » par la vraie raison sociale / SIRET / adresse le jour d'une exploitation commerciale.
- **Backlog `IMPROVEMENTS.md`** : ne restent que k6 (tests de charge, en réserve) et Stryker (mutation testing, écarté car lourd).
