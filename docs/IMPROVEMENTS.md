# Pistes d'amélioration — Port'ForYou

Ce document liste des suggestions pour rendre le projet plus propre, plus solide et plus proche des standards de l'industrie. Chaque piste est **gratuite** (open source ou free tier pour dépôt public), et positionnée par rapport à ce qui existe déjà dans le repo.

Légende effort : 🟢 < 1h · 🟡 une demi-journée · 🔴 un chantier.

## Ce qui est déjà en place (pour référence)

| Domaine       | Existant                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------ |
| Dépendances   | Renovate (dashboard issue #1) + `security.yml` (pnpm audit hebdo, high+)                         |
| Qualité       | ESLint flat + Prettier + TypeScript strict, Husky (commitlint + lint-staged)                     |
| Tests         | Vitest partout, intégration API sur émulateur Firestore, e2e Playwright en CI                    |
| CI/CD         | `ci.yml` (lint/tests/e2e + deploy Cloud Run via WIF), `release-templates.yml`                    |
| Observabilité | Dashboard Cloud Monitoring + alertes 5xx (plateforme + tenants)                                  |
| Sécurité      | Checklist `SECURITY.md` complète, rotation trimestrielle des JWT tenants, OIDC sur `/internal/*` |
| Docs          | `PortForYou.md` (spec), `ARCHITECTURE.md` (as-built), `RUNBOOK.md`, `SECURITY.md`                |

---

## 1. Analyse statique et qualité de code

### SonarCloud 🟡 — priorité haute

Gratuit pour les dépôts publics. Apporte ce que ESLint ne couvre pas : détection de bugs probables, code smells, duplication, dette technique chiffrée, et surtout un **quality gate sur chaque PR** (commentaire automatique + statut de check). S'intègre en un workflow GitHub Actions + un `sonar-project.properties`. Brancher la couverture Vitest (`lcov`) dessus pour avoir le suivi de couverture au même endroit.

### Couverture de tests mesurée et suivie 🟢 — priorité haute

Les tests existent mais la couverture n'est mesurée nulle part. Ajouter `@vitest/coverage-v8`, un script `test:coverage`, et publier le rapport en CI (vers SonarCloud ci-dessus, ou Codecov — gratuit pour l'open source — si Sonar n'est pas retenu). Fixer un seuil plancher (`coverage.thresholds`) sur les packages critiques (`apps/api`, `template-back-core`) pour empêcher la régression silencieuse.

### Knip 🟢

Détecte le code mort : exports jamais importés, fichiers orphelins, dépendances déclarées mais inutilisées (et l'inverse). Particulièrement utile dans un monorepo où les refactors (comme l'extraction de `template-back-core`) laissent facilement des résidus. Un script `pnpm knip` + un job CI non bloquant au début.

### actionlint 🟢

Lint des workflows GitHub Actions (`ci.yml` fait 240 lignes avec du shell inline — c'est exactement là que les typos silencieuses vivent). Se lance en pre-commit via lint-staged ou en job CI.

---

## 2. Sécurité (au-delà de la checklist actuelle)

### CodeQL 🟢 — priorité haute

Le code scanning de GitHub, gratuit pour les dépôts publics. Analyse sémantique JS/TS (injections, path traversal, flux de données dangereux) à chaque PR + planifié. S'active en quelques clics (Settings → Code security) ou via le workflow par défaut. Complémentaire de `pnpm audit` qui ne regarde que les dépendances.

### Secret scanning + push protection 🟢

Natif GitHub, gratuit sur dépôt public. Bloque le push d'un secret (clé Stripe, clé API Resend…) avant qu'il n'atteigne l'historique. À activer dans Settings → Code security. En complément local : gitleaks en hook pre-commit si on veut ceinture et bretelles.

### Dependency Review Action 🟢

Sur chaque PR, commente les dépendances ajoutées/modifiées avec leurs vulnérabilités connues et leur licence. Comble le trou entre Renovate (qui propose) et `security.yml` (qui n'audite qu'une fois par semaine) : ici le check se fait **au moment où la dépendance entre**.

### Scan des images Docker (Trivy) 🟡

`release-templates.yml` et le job deploy poussent des images sans les scanner. Ajouter une étape Trivy (action officielle, gratuite) après le build : vulnérabilités OS + npm dans l'image finale, seuil `CRITICAL,HIGH`. C'est la seule vérification qui voit ce que `pnpm audit` ne voit pas (paquets Debian de l'image de base).

### OSSF Scorecard 🟢 — optionnel

Action qui note les pratiques de sécurité du repo (branch protection, pinning des actions, etc.) et publie un badge. Bon guide de progression ; recommande notamment d'épingler les actions GitHub **par SHA** plutôt que par tag majeur (`actions/checkout@v7` → `@<sha>`), ce que Renovate sait maintenir automatiquement (`helpers:pinGitHubActionDigests`).

---

## 3. Robustesse en production

### Sauvegardes Firestore planifiées 🟡 — priorité haute

Aujourd'hui, une suppression accidentelle (bug, mauvaise commande, compromission) de `tenants/{slug}` ou `sites/` est **irréversible**. Deux options natives GCP :

- **PITR (Point-in-Time Recovery)** : restauration à n'importe quel instant sur 7 jours, un simple flag à activer sur la base.
- **Exports planifiés vers GCS** : job Cloud Scheduler → `firestore.googleapis.com/…:exportDocuments` hebdomadaire, bucket avec règle de cycle de vie (coût : quelques centimes de stockage).

Le combo des deux couvre l'erreur récente (PITR) et l'archive longue durée (exports). À documenter dans le RUNBOOK (procédure de restauration testée au moins une fois).

### Politiques TTL Firestore 🟢

Les collections de tokens (`password_resets`, `email_verifications`, `sessions` expirées) s'accumulent indéfiniment — l'expiration est vérifiée à la lecture mais rien ne purge. Firestore a des **TTL policies natives et gratuites** : un champ date + une policy par collection, et les documents expirés disparaissent seuls. Plus propre qu'un job de nettoyage maison.

### Uptime checks Cloud Monitoring 🟢

Le dashboard et les alertes 5xx détectent les erreurs _quand il y a du trafic_. Un service down sans trafic ne déclenche rien. Les uptime checks (gratuits jusqu'à 100) pinguent `pfy-api/health` et un échantillon de sites tenants depuis plusieurs régions, avec alerte sur échec. C'est la brique qui manque au monitoring actuel.

### Error tracking applicatif (Sentry ou GlitchTip) 🟡

Les 5xx sont comptés mais pas **expliqués** : pas de stack trace agrégée, pas de regroupement par erreur, pas de contexte requête. Sentry (free tier 5k événements/mois, suffisant ici) ou GlitchTip (compatible SDK Sentry, auto-hébergeable) sur `apps/api`, `apps/web` et `template-back-core`. C'est le meilleur rapport valeur/effort de toute cette section pour le debug en prod.

### Logs structurés (pino) 🔴 — optionnel

Morgan produit des lignes texte ; Cloud Logging exploite bien mieux du JSON structuré (filtrage par champ, log-based metrics, corrélation par trace ID). Remplacer morgan par pino + un middleware qui pose `severity` au format attendu par GCP. Chantier transversal, à faire si le debug via logs devient une vraie douleur.

### Smoke test post-déploiement 🟢

Le job `deploy` de `ci.yml` se termine sans vérifier que le service répond. Ajouter une dernière étape : `curl --fail` sur `/api/v1/health` de la nouvelle révision (et la home de la vitrine). Un déploiement cassé se voit dans le run CI au lieu d'être découvert par un utilisateur.

### Budget alert GCP 🟢

Un budget Cloud Billing avec alertes à 50/90/100 % d'un montant mensuel choisi. Cinq minutes de configuration, et c'est l'assurance contre la mauvaise surprise (boucle de retry qui spamme Cloud Tasks, image qui scale…). Aucun coût.

### Politique de rétention Artifact Registry 🟢

Chaque déploiement pousse une image taguée par SHA ; rien ne purge les anciennes. Une _cleanup policy_ Artifact Registry (garder les N dernières versions, supprimer les images > 90 jours) évite l'accumulation de stockage payant. À ajouter dans `infra/scripts/setup-gcp.sh`.

---

## 4. Process et gouvernance du dépôt

### Protection de la branche `main` 🟢 — priorité haute

Actuellement rien n'empêche un push direct sur `main` (plusieurs commits de cette semaine y sont allés directement). Configurer une branch protection rule : PR obligatoire, checks CI requis (lint, test, e2e, templates), historique linéaire. Gratuit sur dépôt public. C'est la garantie structurelle que « CI verte avant merge » n'est pas juste une discipline mais une règle.

### CODEOWNERS + template de PR 🟢

- `.github/CODEOWNERS` : même en solo, il documente qui possède quoi et prépare l'arrivée d'un contributeur (review auto-assignée).
- `.github/PULL_REQUEST_TEMPLATE.md` : checklist courte (tests verts, docs `ARCHITECTURE.md` mise à jour si infra touchée — la règle existe dans CLAUDE.md, le template la rend visible à tout humain).

### Versioning et changelog automatisés (release-please) 🟡

Les commits suivent déjà Conventional Commits (enforced par commitlint) — c'est exactement le prérequis de **release-please** (action Google, gratuite) : PR de release auto-générée avec CHANGELOG.md, bump de version et tag Git. Donne un historique lisible des évolutions sans effort supplémentaire, et des points de repère propres pour un rollback.

### Filtrage de chemins dans le CI 🟢

`ci.yml` relance les 4 suites de tests templates même quand seul `apps/web` change. `dorny/paths-filter` (ou `on.paths` par job via workflows séparés) permet de ne lancer `templates-front`/`templates-back` que si `templates/**` ou `packages/template-back-core/**` bougent. CI plus rapide et moins de minutes consommées.

---

## 5. Tests — combler les angles morts connus

### Fix permanent de la double exécution des tests API 🟢

Problème connu : `tsc` compile `src/__tests__` dans `apps/api/dist/`, et un `test:emu` après un build fait tourner les tests **deux fois** (source + compilé) sur le même émulateur, avec collisions. `template-back-core` a déjà le fix (`"exclude": ["src/__tests__"]` dans son tsconfig) ; l'appliquer aussi à `apps/api` au lieu du `rm -rf dist` manuel.

### Stabiliser le test flaky `papier/front` 🟢

`Galerie.test.jsx` (IntersectionObserver) échoue de façon non déterministe (« observerCallback is not a function »). Un test flaky toléré finit par entraîner l'habitude de relancer la CI sans regarder — le corriger (ordre de setup du mock) ou le quarantiner explicitement.

### Tests de charge ciblés (k6) 🔴 — optionnel

k6 (OSS, gratuit en local) sur les deux chemins sensibles : le webhook Stripe (idempotence déjà durcie par transaction — un test de charge le prouve en continu) et la réservation de slug. Pas besoin de CI : un script dans `infra/` + une section RUNBOOK suffisent.

### Mutation testing (Stryker) 🔴 — optionnel

Mesure si les tests détectent vraiment les régressions (et pas juste la couverture de lignes). Coûteux en temps machine ; à réserver à `template-back-core` et `apps/api/src/orders` si l'envie de pousser la qualité des tests se présente.

---

## 6. Expérience développeur

### EditorConfig 🟢

Un `.editorconfig` (indentation, fin de ligne, charset) : Prettier couvre les fichiers qu'il formate, mais pas les `Dockerfile`, `.sh`, `.yml` ouverts dans n'importe quel éditeur. Standard, deux minutes.

### Badges README 🟢

Statut CI, quality gate Sonar, Scorecard : signal immédiat de santé du projet pour quiconque arrive sur le repo (jury, recruteur, contributeur).

### Devcontainer 🟡 — optionnel

Le `pnpm dev` local exige Node 24, pnpm 11, Docker, Java (émulateurs)… Un `.devcontainer/devcontainer.json` fige tout ça et rend l'onboarding (ou une machine de secours) instantané via VS Code / GitHub Codespaces (free tier).

---

## 7. Propreté interne — code et architecture (sans outil externe)

### Arrêt gracieux (SIGTERM) 🟢 — priorité haute

Cloud Run envoie `SIGTERM` puis laisse ~10 s avant de tuer l'instance ; aujourd'hui ni `apps/api` ni `template-back-core` ne l'écoutent (`app.listen()` sec dans `index.ts`). Une requête en vol au moment d'un déploiement ou d'un scale-down est coupée net — y compris, au pire, au milieu d'une étape de provisioning. Le fix tient en quelques lignes : garder la référence du serveur, `process.on('SIGTERM', () => server.close(...))`, et laisser les requêtes en cours se terminer.

### Corrélation des requêtes (request ID) 🟢

Aucun identifiant ne relie les logs d'une même requête. Cloud Run pose déjà l'en-tête `X-Cloud-Trace-Context` : un petit middleware qui le reprend (ou génère un UUID en local), l'ajoute aux lignes morgan et le renvoie dans les réponses d'erreur permet de retrouver **tout** le contexte d'un incident à partir d'un seul screenshot utilisateur. Prépare aussi le terrain pour les logs structurés (§3).

### Codes d'erreur machine dans les réponses API 🟡

Toutes les erreurs sont aujourd'hui `{ error: 'Message en français' }` — le front est obligé de matcher sur le statut HTTP ou pire, sur le texte. Passer à `{ code: 'slug_taken', error: 'Ce nom de site est déjà pris' }` : le code est stable et testable, le message reste libre d'évoluer (ou d'être traduit). Un type `ApiError` + un helper centralisé évitent la dispersion actuelle des `res.status(...).json(...)` ad hoc.

### Contrat d'API documenté (OpenAPI généré depuis zod) 🟡

Les schémas zod de `packages/shared` sont déjà la source de vérité des types — ils peuvent aussi générer une spec OpenAPI (`@asteasolutions/zod-to-openapi`), servie sur `/api/v1/docs`. Zéro duplication : la doc dérive du code et ne peut pas mentir. Utile pour le jury, pour un futur front alternatif, et pour détecter les incohérences de contrat entre routes.

### Healthcheck qui dit quelque chose 🟢

`/api/v1/health` répond « OK » si le process tourne — il ne vérifie ni Firestore ni ne dit **quelle version** tourne. Deux petits ajouts : une lecture Firestore légère (détecte un problème d'IAM/connexion avant les utilisateurs), et le SHA du commit dans la réponse (injecté en env var au deploy — `ci.yml` a déjà `github.sha` sous la main). « Quelle version est en prod ? » devient un `curl`.

### Valider les données à la sortie de Firestore 🟡

Les documents Firestore sont typés par cast (`snap.data() as X`) : un document corrompu ou d'un ancien format traverse silencieusement tout le code avec un type mensonger. Les schémas zod existent déjà dans `packages/shared` — les faire parser aux frontières de lecture (un mini-layer « repository » ou juste un helper `parseDoc(schema, snap)`) transforme les corruptions silencieuses en erreurs explicites et localisées.

### Machine à états explicite pour `sites.status` 🟡

Les transitions (`pending → provisioning → live/error`, retry depuis `error`) sont aujourd'hui des writes de strings dispersés dans le pipeline et les routes. Une fonction unique `transition(site, event)` qui valide les transitions légales rend impossible un état incohérent (un `live` qui repasse `pending`, un retry sur un site sain) et documente le cycle de vie en un seul endroit.

### Corriger la résolution transitive de vite 8 🟢

Trouvé pendant la migration TS 6 : l'override `vite: ^6.4.3` de `pnpm-workspace.yaml` ne s'applique qu'aux packages qui déclarent `vite` directement — `apps/api`, `apps/web`, `shared` et `template-back-core` résolvent `vite@8.1.3` via le peer optionnel de vitest, contredisant l'intention du pin. Rien ne casse aujourd'hui, mais c'est une bombe à retardement au prochain bump de vitest. Fix : étendre l'override (`overrides` global plutôt que par-range) ou déclarer `vite` en devDependency là où vitest tourne.

### ADRs — journal des décisions d'architecture 🟢

`ARCHITECTURE.md` décrit l'état final mais pas le **pourquoi** des choix : auth maison plutôt que Firebase Auth, extraction de `template-back-core`, SSE plutôt qu'onSnapshot client, un seul projet GCP. Un dossier `docs/adr/` avec un fichier court par décision (contexte → options → décision → conséquences) capture ça au fil de l'eau. C'est ce qui évite, dans six mois, de « réparer » un choix délibéré.

### Accessibilité des templates 🟡

Les templates sont des vitrines publiques d'artistes — l'accessibilité y est un critère de qualité produit, pas un bonus. Deux briques peu coûteuses : `eslint-plugin-jsx-a11y` sur `templates/*/front` (statique, gratuit), et un check `@axe-core/playwright` dans les e2e existants qui échoue sur les violations sérieuses (contrastes, alt manquants, ordre de focus).

### CONTRIBUTING.md 🟢

Le savoir « comment on travaille ici » (stack à installer, `pnpm dev`, conventions de commit, PR obligatoire, docs à tenir à jour) vit dans CLAUDE.md et dans la tête du mainteneur. Un `CONTRIBUTING.md` court le rend accessible à un humain qui arrive sur le repo — et c'est le fichier que GitHub met en avant à la première PR d'un nouveau contributeur.

---

## 8. Produit, visibilité et conformité

### SEO des sites tenants (et de la vitrine) 🟡 — priorité haute

Vérifié dans le code : **aucun** sitemap, robots.txt, balise Open Graph ou meta description nulle part — ni sur la vitrine Next.js, ni sur les fronts de templates. Or le produit vendu est littéralement « être visible sur le web » pour un artiste. À ajouter côté templates : title/description par page depuis `site_config`, balises OG + `og:image` (une œuvre), sitemap généré par le back (`/sitemap.xml` dérivé des œuvres du tenant), robots.txt, et un peu de JSON-LD (`Person`/`VisualArtwork`). Côté vitrine : le Metadata API de Next couvre tout. C'est gratuit, et c'est probablement l'amélioration au meilleur rapport valeur-produit/effort de tout ce document.

### Régression visuelle des templates (Playwright) 🟡

Les 3 templates partagent le même back — leur **seule** valeur différenciante est la DA. Aucun test ne la protège aujourd'hui : un CSS cassé passe les tests unitaires sans broncher. Playwright (déjà en place pour le e2e) fait ça nativement avec `toHaveScreenshot()` : quelques captures de référence par template (home, galerie, page œuvre), comparaison au pixel près en CI, mise à jour volontaire via `--update-snapshots`. Gratuit, et ça protège exactement ce que rien d'autre ne teste.

### Lighthouse CI 🟢

Des portfolios d'artistes = des pages lourdes en images par nature. Lighthouse CI (open source, tourne en GitHub Actions) audite performance/accessibilité/SEO/bonnes pratiques à chaque PR avec des budgets (`assertions`) : on voit tout de suite le commit qui fait passer le LCP de 1,5 s à 4 s. Complète l'axe accessibilité de la §7 et l'axe SEO ci-dessus avec une mesure chiffrée continue.

### Optimisation des images à l'upload 🟡

Les œuvres uploadées par les artistes partent vraisemblablement telles quelles vers GCS — un JPEG de 12 Mo sorti d'un appareil photo sera servi tel quel aux visiteurs. `sharp` (déjà whitelisté dans `pnpm-workspace.yaml` → `allowBuilds`) permet de générer à l'upload des variantes WebP redimensionnées (vignette, galerie, plein écran). Triple gain : temps de chargement, facture de stockage/egress GCS, et score Lighthouse ci-dessus.

### RGPD — le minimum légal d'un SaaS français 🟡

Le droit à l'effacement existe déjà (suppression de compte → anonymisation + suspension des sites, vu dans `me.ts`). Il manque : **mentions légales et politique de confidentialité** sur la vitrine (obligatoires dès qu'on encaisse des clients français), un **export des données** du compte (droit à la portabilité — un endpoint qui zippe le JSON du user + ses sites suffit), et un registre simple des traitements (un tableau dans `docs/` : quelle donnée, où, combien de temps, pourquoi). Gratuit, et ce n'est pas optionnel le jour où le projet a de vrais clients.

### Page de statut publique (Upptime) 🟢

Upptime (open source) fournit une page de statut + historique d'uptime hébergée **gratuitement** sur GitHub Pages, pilotée par GitHub Actions qui pinguent les URLs (API, vitrine, sites démo). Complémentaire des uptime checks Cloud Monitoring (§3) : eux alertent _l'équipe_, Upptime informe _les clients_ — « c'est moi ou c'est en panne ? » devient un lien.

### security.txt 🟢

Le standard RFC 9116 : un fichier `/.well-known/security.txt` sur la vitrine avec un contact pour signaler une vulnérabilité, plus l'onglet Security policy du repo GitHub (un `SECURITY.md` à la racine — celui de `docs/` documente la posture interne, celui-ci dit aux chercheurs externes comment signaler). Deux fichiers, dix minutes.

### Renovate : automerge des patchs 🟢

Renovate est en place mais chaque bump attend une action manuelle. Configurer l'automerge pour les updates **patch** et les devDependencies (`"automerge": true` sur ces packageRules) : la CI verte sert de garde-fou, et l'énergie humaine se concentre sur les minors/majors qui méritent un regard. Réduit directement la pile de l'issue #1.

---

## Par où commencer — top 5 suggéré

1. **Protection de branche `main`** — 10 minutes, verrouille le process existant.
2. **CodeQL + secret scanning + Dependency Review** — quasi zéro effort, gros gain sécurité.
3. **Sauvegardes Firestore (PITR + export hebdo)** — seul point de la liste où un incident serait aujourd'hui irrécupérable.
4. **SonarCloud + couverture Vitest** — installe la boucle de qualité continue sur les PR.
5. **Uptime checks + smoke test post-deploy** — ferme le trou « service down sans trafic » du monitoring actuel.
6. **Arrêt gracieux SIGTERM** (§7) — quelques lignes, et plus aucune requête coupée en plein déploiement.
