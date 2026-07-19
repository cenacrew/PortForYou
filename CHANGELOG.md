# Changelog

## [0.2.0](https://github.com/cenacrew/PortForYou/compare/portforyou-v0.1.0...portforyou-v0.2.0) (2026-07-19)


### Fonctionnalités

* **api:** active Sentry en prod (DSN via Secret Manager) ([#27](https://github.com/cenacrew/PortForYou/issues/27)) ([a511cfb](https://github.com/cenacrew/PortForYou/commit/a511cfb9989914b047614ab189d3c15b820aec33))
* **api:** API plateforme — auth maison, commandes, provisioning, facturation à l'usage ([54bbd06](https://github.com/cenacrew/PortForYou/commit/54bbd06d79c139599f818c81c49531e45aa0011c))
* **api:** contrat d'API OpenAPI 3.0 servi sur /api/v1/docs ([#23](https://github.com/cenacrew/PortForYou/issues/23)) ([37b2fae](https://github.com/cenacrew/PortForYou/commit/37b2fae3476ff57d35d232c66dc9ea7b48e1a5a4))
* **auth:** connexion Google (bouton + logo) et separation stricte des providers ([a76899a](https://github.com/cenacrew/PortForYou/commit/a76899aebf9cad9eaa50fbfa0299b46413a0991e))
* **billing:** active l'envoi d'emails via Resend [skip deploy] ([bf86bd4](https://github.com/cenacrew/PortForYou/commit/bf86bd4e3d07f2ac3638ae0377a8cdec76892633))
* **billing:** active le vrai Stripe (mode test) au lieu du faux checkout [skip deploy] ([3e3643f](https://github.com/cenacrew/PortForYou/commit/3e3643f8024b000ac74f1cc5d2d1febc166f4bd6))
* error tracking Sentry (no-op sans DSN) sur api, web et templates ([#18](https://github.com/cenacrew/PortForYou/issues/18)) ([79e7ae2](https://github.com/cenacrew/PortForYou/commit/79e7ae2b05e02225061dfa385fc85ba2b9b8b435))
* **infra:** dashboard Cloud Monitoring pour la plateforme et les tenants ([5ab70d3](https://github.com/cenacrew/PortForYou/commit/5ab70d3d8bc40aa58c27c983901323858dea968d))
* **infra:** provisioning GCP, scripts idempotents et émulateurs conteneurisés ([45544ce](https://github.com/cenacrew/PortForYou/commit/45544cee220bc323ec8c8a7440d0dbc215b4f339))
* logs structurés pino (Cloud Logging) — remplace morgan ([#36](https://github.com/cenacrew/PortForYou/issues/36)) ([23e965e](https://github.com/cenacrew/PortForYou/commit/23e965e8ef802760d592c9acf4766bbce88d0fdd))
* robustesse runtime (SIGTERM, request ID, health enrichi, fix vite) ([#12](https://github.com/cenacrew/PortForYou/issues/12)) ([c5ddb3a](https://github.com/cenacrew/PortForYou/commit/c5ddb3abe8b5f730c694516785605e27f91add7c))
* SEO complet (templates tenants + vitrine) ([#13](https://github.com/cenacrew/PortForYou/issues/13)) ([141c2c1](https://github.com/cenacrew/PortForYou/commit/141c2c178c0ddf695ed66979b15cb20737a4533d))
* **shared:** schémas zod et constantes partagés (techniques, slugs, déploiement) ([ae93495](https://github.com/cenacrew/PortForYou/commit/ae934959488d7366940eef04bd30f1459c106053))
* **templates:** accessibilite, regression visuelle et optimisation images ([#21](https://github.com/cenacrew/PortForYou/issues/21)) ([e3fb025](https://github.com/cenacrew/PortForYou/commit/e3fb025b087917cf13e1ad78eac789ac1b3c500a))
* **templates:** templates Atelier, Monolith et Papier multi-tenant ([f167450](https://github.com/cenacrew/PortForYou/commit/f1674500aa1d60abfed85a5b8d92075e23d900b7))
* **web,api:** conformite RGPD (mentions legales, confidentialite, export) ([#19](https://github.com/cenacrew/PortForYou/issues/19)) ([e2bc298](https://github.com/cenacrew/PortForYou/commit/e2bc2989f8ec19aad21b8755ceb8dfde990a9f5a))
* **web,api:** renseigne les demoUrl (3 tenants démo déployés) ([#43](https://github.com/cenacrew/PortForYou/issues/43)) ([9374dd1](https://github.com/cenacrew/PortForYou/commit/9374dd1b825d17d2452e2fc0e7d940c08ad3b222))
* **web:** active Sentry sur la vitrine (DSN Next.js public) ([#37](https://github.com/cenacrew/PortForYou/issues/37)) ([25b4551](https://github.com/cenacrew/PortForYou/commit/25b4551bf107c5bd1d9f8b411641e5e7f0a2a226))
* **web:** formulaire de contact pour devis personnalise ([9e65c0c](https://github.com/cenacrew/PortForYou/commit/9e65c0c4b85e6bcdc8570e7d6f5cd1efb321d51f))
* **web:** relance d'un deploiement en echec sans recreer de slug ([07bb59e](https://github.com/cenacrew/PortForYou/commit/07bb59e744050243159425b6a97595a411a1e751))
* **web:** sert la vitrine sur portforyou.web.app + CSP compatible rendu statique ([2433dd6](https://github.com/cenacrew/PortForYou/commit/2433dd6e33592643459707042a5eec4f8a235e89))
* **web:** vitrine Next.js (hero R3F, animations) et dashboards client/admin ([f7e8f0b](https://github.com/cenacrew/PortForYou/commit/f7e8f0b525a821799347cf06c426a41890a396f7))


### Corrections

* **ci:** corrige les tags d'actions Trivy (v0.36.0) et Scorecard (v2.4.3) ([#24](https://github.com/cenacrew/PortForYou/issues/24)) ([d769f21](https://github.com/cenacrew/PortForYou/commit/d769f21b16781c93fbc7f7ca2476704a78eb7c2b))
* **ci:** debloque le deploy — Trivy ignore-unfixed + bump undici ([#25](https://github.com/cenacrew/PortForYou/issues/25)) ([623ccd1](https://github.com/cenacrew/PortForYou/commit/623ccd125b0a7b9b0bc25fcc7e8b36e476316f87))
* **ci:** exclut CHANGELOG.md du check Prettier ([#54](https://github.com/cenacrew/PortForYou/issues/54)) ([b8523f3](https://github.com/cenacrew/PortForYou/commit/b8523f3a205ba0d635d8aaee1f6f60aa3d6cf39c))
* **ci:** exclut le npm global de l'image de base du scan Trivy ([#26](https://github.com/cenacrew/PortForYou/issues/26)) ([12ec8e7](https://github.com/cenacrew/PortForYou/commit/12ec8e7c4e1f50df3f864a7de5bffcdc62b16046))
* **infra:** renseigne l'URL reelle de pfy-api dans Upptime ([#33](https://github.com/cenacrew/PortForYou/issues/33)) ([b3d7b09](https://github.com/cenacrew/PortForYou/commit/b3d7b091bccba5334809b8c3b57c0e2441cbb8de))
* **infra:** retire color/direction des thresholds xyChart du dashboard ([e7fa118](https://github.com/cenacrew/PortForYou/commit/e7fa118f4649079db730289df33946ed20f34d43))
* **infra:** syntaxe gcloud GA pour les uptime checks ([#14](https://github.com/cenacrew/PortForYou/issues/14)) ([547cb9e](https://github.com/cenacrew/PortForYou/commit/547cb9ed1532dbb3321d18a7d38d3008b581b7a4))
* **provisioning:** nettoie automatiquement les sites Hosting orphelins ([#49](https://github.com/cenacrew/PortForYou/issues/49)) ([d3bcfe0](https://github.com/cenacrew/PortForYou/commit/d3bcfe063ae40176c692ac0ca26f872e999b4380))
* **provisioning:** SA tenant dedie, Firestore via ADC et CPU a la requete ([51496cc](https://github.com/cenacrew/PortForYou/commit/51496cc446e743d3673573d08c2ce24fd77db77f))
* **security:** durcit rate limiting admin, ReDoS contact, format string mailer ([#41](https://github.com/cenacrew/PortForYou/issues/41)) ([700f75a](https://github.com/cenacrew/PortForYou/commit/700f75a2fbaeb6b85cb3749b79eb49c962b32e67))
* **templates,web:** durcit deux findings securite SonarCloud ([#40](https://github.com/cenacrew/PortForYou/issues/40)) ([e537f5f](https://github.com/cenacrew/PortForYou/commit/e537f5f68b3fecb4091188d9276d73eeb733a093))
* **web:** corrige des incohérences i18n relevées par la revue ([334b8d6](https://github.com/cenacrew/PortForYou/commit/334b8d6ccef8f26b52ad9d9a0b2ab041bc29f62d))
* **web:** ne pas exposer l'erreur brute de deploiement au client + responsive ([02b3dec](https://github.com/cenacrew/PortForYou/commit/02b3decff99659e0f49a1ac5351d0de06b767ffd))


### Refactoring

* **api,shared:** codes d'erreur machine, validation zod, machine a etats ([#20](https://github.com/cenacrew/PortForYou/issues/20)) ([efda1b5](https://github.com/cenacrew/PortForYou/commit/efda1b5f25fb9100bb758e896928332e9026155d))
* **templates:** extrait le front commun dans template-front-core (−duplication) ([#39](https://github.com/cenacrew/PortForYou/issues/39)) ([409aa8c](https://github.com/cenacrew/PortForYou/commit/409aa8c88dd5a3584bbb615ce82e85d02359b2dc))


### Documentation

* architecture as-built complète avec diagrammes Mermaid ([916e39a](https://github.com/cenacrew/PortForYou/commit/916e39a7e3cdbfb7c5e581b7313bf60c63c86a99))
* gouvernance dépôt et documentation contributeurs ([#16](https://github.com/cenacrew/PortForYou/issues/16)) ([23b732d](https://github.com/cenacrew/PortForYou/commit/23b732d31b121512352a8ed2a572d2a7390ad2aa))
* pistes d'amelioration du projet (outillage, securite, robustesse, code) ([abe1613](https://github.com/cenacrew/PortForYou/commit/abe1613ed5fad762125910fc858f24369c240ad7))
* pistes produit, visibilite et conformite dans IMPROVEMENTS.md ([3d7c1c3](https://github.com/cenacrew/PortForYou/commit/3d7c1c39067f3f6a4bee80abafdf3920642203b9))
* reformuler l'introduction du cahier des charges ([e8abc3a](https://github.com/cenacrew/PortForYou/commit/e8abc3ac9aa1ef95f2afc53f81534e09264cfdbf))
* spécification, sécurité, runbook et convention de commits ([dd13613](https://github.com/cenacrew/PortForYou/commit/dd13613b87ba2499f6f4b55500a663ec745cdd9a))
* **web:** renseigne les infos RGPD (projet etudiant, sans entite commerciale) ([#38](https://github.com/cenacrew/PortForYou/issues/38)) ([d4a175c](https://github.com/cenacrew/PortForYou/commit/d4a175c3d467cc23fd4c3bc21c7cc53979185afb))


### Build

* aligne l'image emulateurs sur Node 24 + firebase-tools 15 [skip deploy] ([44f0d55](https://github.com/cenacrew/PortForYou/commit/44f0d55cbdfaf01813228cba0767d14e10b20634))
* **deps:** montee des dependances au dernier palier stable compatible ([#2](https://github.com/cenacrew/PortForYou/issues/2)) ([5995efa](https://github.com/cenacrew/PortForYou/commit/5995efa704e8a53757e350ed02754da3a1f98aca))
* **deps:** passe le gestionnaire de paquets a pnpm 11 ([#4](https://github.com/cenacrew/PortForYou/issues/4)) ([2caa4bd](https://github.com/cenacrew/PortForYou/commit/2caa4bdfbe790f02f6ae7417ff560641df622873))
* **deps:** précise le tag node:24-slim en node:24.18.0-slim dans les Dockerfiles ([#53](https://github.com/cenacrew/PortForYou/issues/53)) ([cc4d0a0](https://github.com/cenacrew/PortForYou/commit/cc4d0a091dd9cdc53f66dc60a4bf9f90cedbeba6))
* montee des dependances dev/outillage (lot sur, hors majeures UI) ([829bd01](https://github.com/cenacrew/PortForYou/commit/829bd01972f128c8f3a280ba18cc634a22282a57))
* montee du runtime vers Node 24 (nvmrc, Dockerfiles, engines, CI) ([51a5d4a](https://github.com/cenacrew/PortForYou/commit/51a5d4ab5f99508ff82d06bba8e519c65ce9270e))


### CI

* ajoute LICENSE (MIT) et restreint les permissions release-please ([#46](https://github.com/cenacrew/PortForYou/issues/46)) ([2a0d471](https://github.com/cenacrew/PortForYou/commit/2a0d4712bd77fcd1085f60f666323b26c1401e28))
* ajoute Lighthouse CI (audit perf/a11y/SEO de la vitrine) ([#22](https://github.com/cenacrew/PortForYou/issues/22)) ([fb98f03](https://github.com/cenacrew/PortForYou/commit/fb98f0377bec35728321453637889ae81465b086))
* ajoute Renovate pour la maintenance auto des dependances [skip deploy] ([3971ad4](https://github.com/cenacrew/PortForYou/commit/3971ad4f57db9921ad7942ce4e45c66527e49964))
* corriger le lint (Prettier) et fiabiliser les builds Docker (pnpm épinglé) ([7cd39b5](https://github.com/cenacrew/PortForYou/commit/7cd39b5c7ad8294af9440576fd06fd182b6ba410))
* durcit les workflows GitHub Actions (CodeQL, dependency review, actionlint, Trivy, smoke test, paths-filter) ([#9](https://github.com/cenacrew/PortForYou/issues/9)) ([83fdcae](https://github.com/cenacrew/PortForYou/commit/83fdcae028293518b5e74dc7755f48c59f1b494e))
* epingle les actions GitHub (SHA) et l'image de base Docker (digest) ([#45](https://github.com/cenacrew/PortForYou/issues/45)) ([320d4bd](https://github.com/cenacrew/PortForYou/commit/320d4bdd639d9e35e07a2a758b01d6ac936de07f))
* fiabiliser les builds Docker (tsconfig base, .dockerignore, deploy workspace) et pnpm via packageManager ([9643320](https://github.com/cenacrew/PortForYou/commit/9643320e9fb6c2845034b3a6138cd972c93dd838))
* outillage qualité, analyse et release (SonarCloud, Knip, Scorecard, release-please) ([#17](https://github.com/cenacrew/PortForYou/issues/17)) ([7913e68](https://github.com/cenacrew/PortForYou/commit/7913e68e89527ca126cfa907deccaffce0aa0d5c))
* pinning Scorecard via Renovate + couverture Sonar du front-core ([#42](https://github.com/cenacrew/PortForYou/issues/42)) ([6a52e8f](https://github.com/cenacrew/PortForYou/commit/6a52e8f65ef422dc6ef0a9046a1a26fb9872b0cb))
* pipeline unifie lint/test/e2e vers deploy, cache Docker, audit hebdo [skip deploy] ([e02f0ba](https://github.com/cenacrew/PortForYou/commit/e02f0bafb03adec1a5f6f291f9299f991807054e))
* purge le cache Firebase Hosting apres deploiement de la vitrine [skip deploy] ([c2f3906](https://github.com/cenacrew/PortForYou/commit/c2f390648953b4be074c313dc6f904275e942a53))
* refonte du pipeline lint/test/e2e vers deploy + cache Docker [skip deploy] ([f63ca4c](https://github.com/cenacrew/PortForYou/commit/f63ca4cd0aa71525e616fb7121369ec1b9b382a4))
* SonarCloud en workflow_dispatch uniquement (plus de croix rouge sur main) ([#47](https://github.com/cenacrew/PortForYou/issues/47)) ([b39e818](https://github.com/cenacrew/PortForYou/commit/b39e8185300f54fd69bae6a49578197134223b18))
* SonarCloud n'analyse que main (plus de croix rouge sur les PR) ([#44](https://github.com/cenacrew/PortForYou/issues/44)) ([58dd989](https://github.com/cenacrew/PortForYou/commit/58dd989b714592ade0e258070ce02518ed2c220f))
* teste chaque back de template dans son propre job (fin des resumes dupliques) [skip deploy] ([058e4f8](https://github.com/cenacrew/PortForYou/commit/058e4f801906be2bf72ee1de48ff5328e4bbbbfb))
* workflows GitHub Actions (CI, déploiement plateforme, release templates) ([2322049](https://github.com/cenacrew/PortForYou/commit/2322049539141a3500b53bfe7118033bdde93f40))


### Maintenance

* **ci:** tâches VSCode pour lancer la stack de développement ([4bb1fbd](https://github.com/cenacrew/PortForYou/commit/4bb1fbd4710713e78441d1ac87638f4b13eae624))
* **deps:** actions GitHub en Node 24 + React 19 sur les fronts ([#3](https://github.com/cenacrew/PortForYou/issues/3)) ([121ebd1](https://github.com/cenacrew/PortForYou/commit/121ebd1ff5c2c5e49f384699ab5e95e019420120))
* **deps:** applique les mises à jour Renovate sans risque ([#7](https://github.com/cenacrew/PortForYou/issues/7)) ([73d8a00](https://github.com/cenacrew/PortForYou/commit/73d8a00b57c3325cfc591b74dac7a74dd382fb8b))
* **deps:** applique les mises à jour Renovate sûres (patch/mineures) ([#50](https://github.com/cenacrew/PortForYou/issues/50)) ([ba74583](https://github.com/cenacrew/PortForYou/commit/ba745831f0896b2a8b3da139b43c648c8c688e9f))
* **deps:** migre vers TypeScript 6.0.3 ([#8](https://github.com/cenacrew/PortForYou/issues/8)) ([88085eb](https://github.com/cenacrew/PortForYou/commit/88085eb278c7830f397012a8cbe62e1bb26e9e06))
* **deps:** montées majeures Renovate (vite, MUI, pino, undici, actions GitHub) ([#51](https://github.com/cenacrew/PortForYou/issues/51)) ([b68007f](https://github.com/cenacrew/PortForYou/commit/b68007f59d1dc833499b6a20780cfc1badcf8946))
* **deps:** resserre les peerDependencies de template-front-core, pin docker-compose ([#52](https://github.com/cenacrew/PortForYou/issues/52)) ([1a72c13](https://github.com/cenacrew/PortForYou/commit/1a72c130c8f6bb1e473c65764c6cf3d0073fff55))
* **infra:** ajoute un devcontainer (Node 24, pnpm 11, Java, Docker) ([#35](https://github.com/cenacrew/PortForYou/issues/35)) ([804f4c8](https://github.com/cenacrew/PortForYou/commit/804f4c8e9d129c1141603c479748435d426d266f))
* **infra:** jobs Scheduler, secret OAuth, SA tenant + option [skip deploy] ([51618b9](https://github.com/cenacrew/PortForYou/commit/51618b9a9f233f039682f060488beaafe913849b))
* **infra:** résilience prod — sauvegardes Firestore, TTL, uptime checks ([#10](https://github.com/cenacrew/PortForYou/issues/10)) ([9ff5c15](https://github.com/cenacrew/PortForYou/commit/9ff5c151f0dc50558cda6ee7dfed9b23ed16e914))
* **infra:** retire Upptime de ce repo (deplace vers un repo dedie) ([#34](https://github.com/cenacrew/PortForYou/issues/34)) ([0c31a04](https://github.com/cenacrew/PortForYou/commit/0c31a046a20767789005ed29cc31531d47114a9f))
* outillage du monorepo (pnpm, TS, ESLint/Prettier, Husky, Firebase local) ([77ddbc8](https://github.com/cenacrew/PortForYou/commit/77ddbc83dc321ccdf98e5e0e486146c163b73614))
