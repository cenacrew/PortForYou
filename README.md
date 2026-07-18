# Port'ForYou

[![CI](https://github.com/cenacrew/PortForYou/actions/workflows/ci.yml/badge.svg)](https://github.com/cenacrew/PortForYou/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-unspecified-lightgrey)](./SECURITY.md)
[![Quality Gate Status](https://img.shields.io/badge/SonarCloud-not_yet_configured-lightgrey)](./docs/IMPROVEMENTS.md)
[![OpenSSF Scorecard](https://img.shields.io/badge/OpenSSF_Scorecard-not_yet_configured-lightgrey)](./docs/IMPROVEMENTS.md)

> Les badges SonarCloud (quality gate) et OSSF Scorecard sont des
> placeholders : ils s'activeront automatiquement une fois ces outils
> configurés (voir `docs/IMPROVEMENTS.md` §1 et §2) — un autre lot du projet
> s'en charge. Le badge de licence reflète l'absence actuelle de fichier
> `LICENSE` — à trancher par le mainteneur avant une éventuelle ouverture du
> dépôt à des contributions externes.

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
