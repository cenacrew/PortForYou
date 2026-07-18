# 0002 — Extraction du back commun dans `template-back-core`

**Statut** : Accepté

## Contexte

Le projet livre 3 templates de portfolio (`atelier`, `monolith`, `papier`).
Elles sont **fonctionnellement identiques côté back** — routes, middleware,
auth tenant, préfixage multi-tenant `TENANT_ID` — et ne diffèrent que sur le
front (direction artistique, Vite/React propre à chacune). `atelier` est
dérivée du projet existant `marcel-nino-pajot`, dont le back a été repris tel
quel comme point de départ.

Sans mutualisation, faire évoluer une règle métier (validation d'upload,
rate limiting, format d'une route) implique de le répercuter à l'identique
dans 3 codebases back — avec le risque de divergence silencieuse au fil du
temps, exactement le genre de dette qu'un monorepo est censé éviter.

## Options considérées

- **Dupliquer le back dans chaque template** : autonomie de déploiement
  maximale (chaque template a son Dockerfile, son image), mais toute
  correction ou évolution métier doit être répétée 3 fois — risque de
  divergence, coût de maintenance qui grossit linéairement avec le nombre de
  templates.
- **Un service back partagé unique** (un seul Cloud Run pour tous les
  tenants, quel que soit le template) : élimine la duplication, mais casse
  le modèle « un artefact pré-construit par template, déployé sans build au
  provisioning » et complexifie le routage/versioning par template.
- **Package partagé `template-back-core` + wrapper fin par template** :
  logique métier écrite une seule fois, testée une seule fois, mais chaque
  template reste un artefact Docker indépendant, déployable et versionnable
  séparément.

## Décision

Extraction de toute la logique back commune dans
`packages/template-back-core` (TypeScript strict, routes/middleware/auth/lib
partagés). Chaque `templates/{atelier,monolith,papier}/back` devient un
wrapper fin en JS plain (cohérent avec la décision « garder les templates
simples ») : son propre `package.json`, un `src/index.js` de quelques lignes
qui importe l'app buildée (`dist/app.js` via l'`exports` map du package) et
appelle `.listen()`, et un `seed.js` qui ré-exporte le seed partagé.

Le build Docker de chaque template part de la racine du monorepo comme
contexte, compile `template-back-core`, puis déploie avec
`--config.inject-workspace-packages=true` pour produire une image finale
**autonome** (code partagé inliné dans `node_modules`, aucune dépendance
runtime au monorepo).

## Conséquences

- Une seule implémentation à corriger/tester pour une évolution métier
  commune — les tests vivent uniquement dans
  `packages/template-back-core/src/__tests__`, exécutés une fois par CI
  (`templates-back`), pas 3 fois.
- Chaque template reste déployable indépendamment (image Docker, versioning,
  rollback par tenant) — aucune régression sur l'autonomie de déploiement
  malgré le partage de code source.
- Complexité de build supplémentaire : le Dockerfile de chaque template doit
  copier `tsconfig.base.json` + `packages/template-back-core` et lancer son
  build avant son propre déploiement (`release-templates.yml`), au lieu d'un
  simple `docker build` sur un répertoire isolé.
- `templates/*/back` doit tourner avec `template-back-core` déjà buildé en
  local (`pnpm --filter @portforyou/template-back-core build`, ou `dev` en
  watch) — un piège d'onboarding documenté dans `CLAUDE.md`/`CONTRIBUTING.md`.
