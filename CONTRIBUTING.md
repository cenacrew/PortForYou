# Contribuer à Port'ForYou

Merci de l'intérêt porté à ce projet. Ce document résume ce qu'il faut savoir
pour poser une contribution : installation, conventions, et process de PR.

## Stack à installer

- **Node** `>= 24.18.0` (voir `.nvmrc` — `nvm use` si vous utilisez nvm)
- **pnpm** `11.15.0` (déclaré en `packageManager` dans `package.json` ;
  `corepack enable` suffit à obtenir la bonne version automatiquement)
- **Docker Desktop** démarré — les émulateurs Firebase (Firestore/Storage)
  tournent en conteneur (`infra/docker/emulators.Dockerfile`)
- **Java** (requis en interne par les émulateurs Firebase, installé
  automatiquement dans l'image Docker ci-dessus — rien à faire de plus si
  vous passez par `pnpm dev`)

Aucun compte GCP ni Stripe n'est nécessaire en local : les drivers de
paiement et de provisioning tournent en mode `fake` par défaut.

Pour éviter d'installer tout ça à la main (ou en dépannage sur une nouvelle
machine), `.devcontainer/devcontainer.json` fige cet environnement — ouvrez le
repo dans VS Code (extension Dev Containers) ou dans un GitHub Codespace,
tout est prêt automatiquement.

## Démarrer

```bash
pnpm install
pnpm dev          # tout-en-un : émulateurs Docker + shared (watch) + api (8081) + web (3000)
```

- Vitrine : http://localhost:3000
- API : http://localhost:8081/api/v1/health
- UI émulateurs Firebase : http://localhost:4000

Détails par paquet, tests d'intégration, mise en production : voir
`docs/RUNBOOK.md`. Architecture telle qu'implémentée : `docs/ARCHITECTURE.md`.
Spécification complète (autoritative sur les choix d'architecture) :
`PortForYou.md`.

## Avant de committer

```bash
pnpm lint         # eslint . && prettier --check .
pnpm test         # tests unitaires de tous les paquets
pnpm build        # pnpm -r build
```

Un hook Husky `pre-commit` lance déjà ESLint --fix + Prettier sur les
fichiers indexés (lint-staged) ; un hook `commit-msg` valide le format du
message de commit.

## Convention de commits

[Conventional Commits](https://www.conventionalcommits.org), imposé par
`commitlint` :

```
type(scope): sujet
```

- **types** : `feat`, `fix`, `refactor`, `perf`, `docs`, `style`, `test`,
  `build`, `ci`, `chore`, `revert`
- **scopes** : `api`, `web`, `atelier`, `monolith`, `papier`, `shared`,
  `infra`, `auth`, `billing`, `provisioning`, `templates`, `deps`, `ci`,
  `release`

Exemple : `feat(auth): session refresh rotative + OAuth Google`

## Process de Pull Request

- Toute contribution passe par une PR vers `main` — pas de push direct
  (branch protection). Le template de PR (`.github/PULL_REQUEST_TEMPLATE.md`)
  reprend la checklist à respecter.
- La CI doit être verte avant merge : lint, tests unitaires et
  d'intégration, e2e Playwright, et — si `templates/**` ou
  `packages/template-back-core/**` est touché — les suites templates.
- Si la PR touche l'infra (ressources GCP, IAM, Docker, CI/CD, pipeline de
  provisioning, modèle de données Firestore), `docs/ARCHITECTURE.md` doit
  être mis à jour dans le **même** changement — ce document doit rester le
  reflet exact du code.
- Gardez les PR ciblées : un sujet, des commits atomiques et lisibles.

## Signaler un bug ou une faille de sécurité

- Bug fonctionnel : ouvrez une issue GitHub avec les étapes de reproduction.
- Faille de sécurité : **ne pas** ouvrir d'issue publique — voir
  `SECURITY.md` à la racine pour la procédure de signalement responsable.
