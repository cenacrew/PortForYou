# Port'ForYou

[![CI](https://github.com/cenacrew/PortForYou/actions/workflows/ci.yml/badge.svg)](https://github.com/cenacrew/PortForYou/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/cenacrew/PortForYou)](./LICENSE)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=cenacrew_PortForYou&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=cenacrew_PortForYou)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/cenacrew/PortForYou/badge)](https://scorecard.dev/viewer/?uri=github.com/cenacrew/PortForYou)

> SonarCloud n'analyse qu'à la demande (`workflow_dispatch`, voir
> `.github/workflows/sonarcloud.yml`) — le plan gratuit ne permet pas de
> personnaliser le quality gate, donc une analyse automatique sur chaque
> push/PR poste une croix rouge non pertinente (gate impossible à
> satisfaire) ; le badge peut donc refléter une analyse pas toujours
> à jour avec `main`.

Plateforme SaaS de portfolios pour artistes visuels : choisissez une template, un nom de site, payez — votre portfolio complet est en ligne en quelques minutes, avec son back-office.

> Spécification complète : [PortForYou.md](./PortForYou.md)

## Structure

```
apps/web                     Vitrine + dashboards client/admin (Next.js App Router, TypeScript)
apps/api                     API plateforme (Express 5 ESM, TypeScript strict)
templates/{atelier,monolith,papier}  3 templates de portfolio (back Express + front Vite/React) — même
                              périmètre fonctionnel, seule la direction artistique change
packages/shared               Schémas zod (source de vérité des types), constantes partagées
packages/template-back-core   Code back partagé des 3 templates (routes/middleware/lib), TypeScript strict
packages/template-front-core  Code front partagé des 3 templates (pages, back-office, i18n), JSX
docs/                         Architecture as-built, sécurité, runbook, user stories, cahier de recettes,
                              manuel utilisateur, accessibilité
infra/                        Scripts GCP (projet portforyou-vsp) et image Docker des émulateurs
```

Vitrine et back-offices tenants sont disponibles en français (par défaut) et en anglais.

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
