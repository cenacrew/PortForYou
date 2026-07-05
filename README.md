# Port'ForYou

Plateforme SaaS de portfolios pour artistes visuels : choisissez une template, un nom de site, payez — votre portfolio complet est en ligne en quelques minutes, avec son back-office.

> Spécification complète : [PortForYou.md](./PortForYou.md)

## Structure

```
apps/web          Vitrine + dashboards (Next.js, TypeScript)
apps/api          API plateforme (Express, TypeScript)
templates/atelier Template « Atelier » (back Express + front Vite/React)
packages/shared   Schémas zod, types et constantes partagés
infra/            Scripts GCP (projet portforyou-vsp)
```

## Démarrage local (sans GCP)

Tout fonctionne en local avec l'émulateur Firestore et des drivers simulés
(paiement `fake`, provisioning `fake`) — aucun compte GCP/Stripe requis.

```bash
pnpm install
pnpm dev          # tout-en-un : émulateurs Docker + API (8081) + vitrine (3000)
```

> Dans VSCode : `Ctrl+Shift+B` lance la même stack dans trois terminaux séparés.
> Prérequis : Docker Desktop démarré (les émulateurs Firebase sont conteneurisés).

- Vitrine : http://localhost:3000
- API : http://localhost:8081/api/v1/health
- UI émulateurs Firebase : http://localhost:4000

## Commandes

```bash
pnpm dev          # tout en parallèle (émulateurs + api + web)
pnpm test         # tests de tous les packages
pnpm lint         # ESLint + Prettier
pnpm build        # build de tous les packages
```

## Production

Projet GCP : `portforyou-vsp`. Voir `infra/` et les workflows GitHub Actions.

## Convention de commits

Les commits suivent [Conventional Commits](https://www.conventionalcommits.org), vérifiés
localement par un hook Husky (`commit-msg`). Un hook `pre-commit` lance ESLint + Prettier
sur les fichiers indexés (lint-staged).

```
type(scope): sujet
```

- **types** : `feat`, `fix`, `refactor`, `perf`, `docs`, `style`, `test`, `build`, `ci`, `chore`, `revert`
- **scopes** : `api`, `web`, `atelier`, `monolith`, `papier`, `shared`, `infra`, `auth`, `billing`, `provisioning`, `templates`, `deps`, `ci`, `release`

Exemple : `feat(auth): session refresh rotative + OAuth Google`
