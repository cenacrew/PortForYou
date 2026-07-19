# Port'ForYou — Cahier des charges & spécification de réalisation

> **Ce document est le cahier des charges de la plateforme Port'ForYou.** Il est exhaustif et prescriptif : les décisions d'architecture qui y sont actées font foi et ne sont pas à re-négocier en cours de réalisation.

---

## 1. Vision & contexte

**Port'ForYou** est une plateforme SaaS de création de portfolios pour **artistes visuels** (peintres, illustrateurs, photographes, sculpteurs…). Elle est née d'une mission réelle : le portfolio de l'artiste peintre **Marcel Nino Pajot** (repo `marcel-nino-pajot`, en production sur GCP), qui devient la première template de la plateforme et son premier client de référence.

**Proposition de valeur** : un artiste choisit une template, un nom de site, paie un abonnement — et quelques minutes plus tard son portfolio complet est en ligne, avec son propre back-office pour gérer ses œuvres en autonomie, sans écrire une ligne de code.

**Flow de démo cible (à respecter à la lettre)** :

1. J'arrive sur portforyou → vitrine moderne et « artsy », hero accrocheuse, animations au scroll (Three.js).
2. Je parcours la section templates, je choisis la template « Atelier » (celle de Marcel Nino Pajot, version placeholder).
3. Je crée mon compte / me connecte.
4. Je choisis mon nom de projet (slug) — vérification de disponibilité instantanée.
5. Je « paie » via Stripe en mode test.
6. Le paiement validé déclenche le provisioning automatique : duplication du code de la template (back + front), déploiement complet sur GCP.
7. Depuis mon dashboard client, je suis le déploiement étape par étape en temps réel, jusqu'à « Votre site est en ligne » + URL cliquable.
8. Je reçois un email « votre site est en ligne » avec mes identifiants de back-office.
9. Côté admin Port'ForYou, un dashboard permet de superviser tous les clients, commandes et déploiements.

**Cible design** : artistes visuels → le site lui-même doit être une démonstration de goût. Références : sites primés Awwwards, studios créatifs (Locomotive, Obys, Lusion). Moderne, typographie forte, motion soigné, jamais « template Bootstrap ».

---

## 2. Décisions d'architecture actées

| Sujet                                  | Décision                                                                                                                                                                                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Multi-tenancy GCP                      | **Un seul projet GCP partagé** (`portforyou-vsp`). Chaque client = 1 service Cloud Run + 1 site Firebase Hosting + un namespace Firestore. Pas de création de projet GCP par client.                                                          |
| Domaines                               | **Pas d'achat de domaine.** On garde les URLs fournies par GCP : `pfy-<slug>.web.app` (Firebase Hosting). Le « choix du nom de domaine » dans le flow = choix du slug. L'achat de domaine custom est documenté en roadmap v2, non implémenté. |
| Stack vitrine + dashboards Port'ForYou | **Next.js (App Router, TypeScript)** + React Three Fiber + GSAP/Lenis. Déployé sur Cloud Run.                                                                                                                                                 |
| Stack templates artistes               | **Vite + React (JSX), comme marcel-nino-pajot** — léger et simple. Back Express ESM identique à `back/` de marcel.                                                                                                                            |
| API Port'ForYou                        | **API dédiée** Node.js/Express (ESM, **TypeScript strict**), séparée des backs tenants. Déployée sur Cloud Run.                                                                                                                               |
| Paiement                               | **Stripe en mode test** (aucun paiement réel) : Stripe Billing (abonnement mensuel), Checkout hébergé, Customer Portal pour les factures, webhooks.                                                                                           |
| Base de données                        | **Firestore** (mode natif), déjà maîtrisé via marcel-nino-pajot.                                                                                                                                                                              |
| Auth plateforme                        | **Firebase Authentication** (email/password + Google). Rôle admin via custom claims.                                                                                                                                                          |
| Auth back-office tenant                | Modèle de marcel-nino-pajot conservé : `ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH` en variables d'env du service Cloud Run du tenant, JWT cookie httpOnly.                                                                                          |
| Emails transactionnels                 | **Resend** (free tier) : confirmation de commande, site en ligne + credentials, échec de déploiement.                                                                                                                                         |
| Analytics artistes                     | **Tracking first-party maison** (middleware dans le back tenant → agrégats Firestore), affiché dans le dashboard client. Pas de GA4.                                                                                                          |
| Suivi de déploiement                   | Temps réel via **Firestore `onSnapshot`** côté dashboard (le front Next.js utilise le SDK Firebase JS, déjà nécessaire pour l'auth).                                                                                                          |
| CI/CD                                  | **GitHub Actions** + Workload Identity Federation (zéro clé de service account dans les secrets GitHub).                                                                                                                                      |
| Conteneurisation                       | Docker multi-stage pour l'API, la vitrine Next.js et les backs de templates. Images dans **Artifact Registry**.                                                                                                                               |
| Monorepo                               | **pnpm workspace**, nouveau repo `portforyou` (ne pas construire dans le repo marcel-nino-pajot).                                                                                                                                             |

---

## 3. Structure du monorepo cible

```
portforyou/
├── apps/
│   ├── web/                  # Vitrine + dashboards (Next.js, TS)
│   └── api/                  # API plateforme (Express ESM)
├── templates/
│   ├── atelier/              # Template 1 — dérivée de marcel-nino-pajot, placeholderisée
│   │   ├── back/             # Express ESM (copie adaptée de marcel/back)
│   │   └── front/            # Vite/React (copie adaptée de marcel/front)
│   ├── monolith/             # Template 2 — même périmètre fonctionnel, DA différente
│   │   ├── back/
│   │   └── front/
│   └── papier/               # Template 3 — même périmètre fonctionnel, DA différente
│       ├── back/
│       └── front/
├── packages/
│   └── shared/               # Constantes partagées : techniques, schémas zod, types
├── infra/
│   ├── terraform/            # (optionnel v1, voir §10) sinon scripts gcloud idempotents
│   └── scripts/              # setup-gcp.sh, seed, etc.
├── .github/workflows/        # CI/CD
├── docs/                     # ADRs, runbook, diagrammes
├── docker-compose.yml        # Dev local (émulateurs Firebase + Stripe CLI)
├── pnpm-workspace.yaml
└── PortForYou.md             # Ce document
```

---

## 4. La vitrine Port'ForYou (`apps/web`)

### 4.1 Direction artistique

- **Ton** : galerie d'art contemporaine numérique. Généreux en blanc (ou en noir selon section), typographie éditoriale de grande taille, images d'œuvres plein cadre.
- **Typographie** : une display serif expressive (ex. _Fraunces_, _Canela_-like) pour les titres, une sans neutre (ex. _Inter_, _General Sans_) pour l'UI. Titres hero en très grand corps (clamp 4–9 rem), interlettrage serré.
- **Palette** : fond crème/ivoire `#faf7f2` et noir encre `#0e0e0c` en duo dominant, un accent vif unique (ex. bleu Klein `#2b3ff0` ou orange cadmium `#ff4d00`). Mode sombre non requis en v1.
- **Motion** : Lenis pour le smooth scroll, GSAP + ScrollTrigger pour les reveals (masques de texte, parallaxe d'images, sections épinglées). Transitions de page douces (Next `ViewTransitions` ou Framer Motion). Respecter `prefers-reduced-motion` (désactiver parallaxe/3D, garder des fades simples).
- **Three.js / R3F** : un élément signature dans le hero — par exemple un plan déformé par shader affichant des œuvres qui se distordent au scroll/survol (effet « liquide »), ou un nuage de fragments d'œuvres en profondeur. Doit rester léger : lazy-load du canvas, `<Suspense>` avec fallback statique élégant, dégradé propre sur mobile (image statique si WebGL absent ou device faible).
- **Performance** : Lighthouse ≥ 90 sur la vitrine (hors canvas), images en AVIF/WebP via `next/image`, fonts self-hosted `font-display: swap`.

### 4.2 Pages publiques

1. **Accueil `/`**
   - **Hero** : titre manifeste (ex. « Votre art mérite une vitrine à la hauteur. »), sous-titre, CTA « Découvrir les templates », canvas R3F signature. Indicateur de scroll.
   - **Section « Comment ça marche »** : 3 étapes (Choisissez · Personnalisez · C'est en ligne), animées au scroll.
   - **Section « Ils nous ont fait confiance »** : liste des artistes clients — pour l'instant **un seul, Marcel Nino Pajot** (photo/œuvre, citation, lien vers son site en production). Grille prévue pour s'étendre. Assumer le « 1 » avec élégance (ex. « Le premier d'une longue série. »).
   - **Aperçu des templates** : les 3 templates en cards larges avec visuel, lien vers `/templates`.
   - **Section pricing** : tarification à l'usage — « 5 €/mois + consommation réelle » avec la formule affichée ((5 € + infra + 1 €) × 1,10) et un exemple chiffré, CTA commande.
   - **Footer** : liens, mentions légales, réseaux.
2. **Templates `/templates`** : galerie des 3 templates. Chaque card → page détail.
3. **Détail template `/templates/[slug]`** : screenshots/mockups, liste des fonctionnalités (galerie par technique, back-office, bio, presse, actus, contact), bouton **« Voir la démo »** (ouvre l'instance démo live de la template, cf. §6.5) et **« Choisir cette template »** (→ funnel de commande).
4. **Auth `/login`, `/signup`** : Firebase Auth (email/password + Google). Design soigné, pas le widget FirebaseUI par défaut.
5. **Pages légales** : mentions, CGV, confidentialité (contenu placeholder correct).

### 4.3 Funnel de commande `/order` (protégé, connecté requis)

Stepper en 4 étapes, state machine claire, résumable (state persisté) :

1. **Template** — pré-sélectionnée si on vient d'une page template, modifiable.
2. **Nom du site** — champ slug avec vérification de disponibilité en temps réel (debounce → `GET /api/v1/slugs/check?slug=`). Règles : `[a-z0-9-]{3,30}`, blacklist (`admin`, `api`, `www`, `portforyou`…), unicité Firestore. Preview de l'URL finale : `pfy-<slug>.web.app`.
3. **Récapitulatif + infos artiste** — nom d'artiste affiché sur le site, email de contact du portfolio.
4. **Paiement** — redirection Stripe Checkout (mode test). Au retour `/order/success?session_id=`, écran de confirmation → redirection dashboard.

### 4.4 Dashboard client `/dashboard` (protégé)

- **Mes sites** : cards par site — statut (`provisioning | live | error | suspended`), URL, template, date de création.
- **Suivi de déploiement** : pour un site en provisioning, timeline verticale temps réel des étapes (cf. §7.3) façon Vercel : pending / running (spinner) / done (check) / failed (croix + message). `onSnapshot` sur le document `deployments/{id}`.
- **Détail d'un site** : URL, lien vers le back-office du site (`/admin/login` du tenant) , **identifiants back-office** (email + possibilité de régénérer le mot de passe → redéploiement de la variable d'env), **analytics** (cf. §8.2 : visites 30 jours, pages vues, œuvres les plus vues — graphiques simples type sparkline/barres).
- **Facturation** : bouton vers le **Stripe Customer Portal** (mode test) — factures, moyen de paiement, annulation. Statut d'abonnement affiché (via webhook sync).
- **Profil** : nom, email, suppression de compte (RGPD : supprime le compte, marque les sites `suspended`, purge planifiée).

### 4.5 Dashboard admin `/admin` (protégé, custom claim `role: admin`)

- **Vue d'ensemble** : compteurs (clients, sites live, MRR test, déploiements en cours/échoués).
- **Clients** : liste, recherche, détail (sites, abonnement, emails envoyés).
- **Sites/tenants** : liste avec statut, **health check** (cf. §8.3), actions : redéployer, suspendre, supprimer (avec confirmation forte).
- **Déploiements** : historique complet, logs par étape, bouton « retry » sur une étape échouée.
- **Commandes/abonnements** : miroir des événements Stripe.

---

## 5. L'API Port'ForYou (`apps/api`)

Express 5 ESM en **TypeScript** (strict), structure calquée sur `marcel-nino-pajot/back` (routes / middleware / lib), avec **validation zod systématique** sur tous les inputs (les types dérivés des schémas zod via `z.infer` sont la source de vérité, partagés dans `packages/shared`).

### 5.1 Middleware d'auth

- Vérification du **JWT maison** (`Authorization: Bearer`, signé HS256, 15 min) → `req.user = { uid, email, role }`.
- `requireAuth`, `requireAdmin` (rôle en base), `requireAuthSse` (token en query pour EventSource).
- Sessions : refresh token opaque rotatif (cookie httpOnly), détection de réutilisation → révocation globale.

### 5.2 Routes

```
GET    /api/v1/health                          # liveness/readiness
GET    /api/v1/templates                       # liste des templates (méta : nom, slug, description, images, demoUrl)
GET    /api/v1/slugs/check?slug=               # dispo d'un slug (rate-limité agressivement)

POST   /api/v1/orders                          # crée l'ordre + Stripe Checkout Session, retourne l'URL (auth)
POST   /api/v1/stripe/webhook                  # webhooks Stripe (raw body, signature vérifiée) — PAS d'auth Firebase
GET    /api/v1/me/sites                        # sites du client (auth)
GET    /api/v1/me/sites/:id                    # détail + credentials back-office (auth + ownership)
POST   /api/v1/me/sites/:id/regenerate-password# régénère le mdp back-office du tenant (auth + ownership)
GET    /api/v1/me/sites/:id/analytics?range=30d# agrégats analytics du tenant (auth + ownership)
GET    /api/v1/me/billing/portal               # crée une session Stripe Customer Portal (auth)

GET    /api/v1/admin/overview                  # stats globales (admin)
GET    /api/v1/admin/clients                   # (admin)
GET    /api/v1/admin/sites                     # (admin)
POST   /api/v1/admin/sites/:id/redeploy        # (admin)
POST   /api/v1/admin/sites/:id/suspend         # (admin)
DELETE /api/v1/admin/sites/:id                 # (admin)
GET    /api/v1/admin/deployments               # (admin)
POST   /api/v1/admin/deployments/:id/retry     # (admin)
```

### 5.3 Modèle de données Firestore (plateforme)

```
users/{uid}                 # profil (displayName, email, stripeCustomerId, createdAt)
orders/{orderId}            # uid, templateSlug, siteSlug, stripeSessionId, status, amounts, createdAt
sites/{siteId}              # uid, slug, templateSlug, status, urls {front, api, backOffice},
                            # artistName, contactEmail, stripeSubscriptionId, createdAt, liveAt
deployments/{deployId}      # siteId, trigger (order|redeploy|retry), status,
                            # steps: [{ id, label, status, startedAt, finishedAt, error? }], logsRef
slugs/{slug}                # réservation atomique (transaction) → évite les courses sur le même slug
stripe_events/{eventId}     # idempotence des webhooks
tenants/{slug}/...          # données des sites clients (cf. §7.4)
```

### 5.4 Stripe (mode test uniquement)

- Bootstrap idempotent `pnpm stripe-setup` : produit + meter `pfy_infra` + 3 prix (`pfy_base` 5,50 €, `pfy_domain` 1,10 €, `pfy_infra` metered 0,011 €/unité où 1 unité = 1 centime d'infra).
- **Cycle mensuel** : Cloud Scheduler (1er du mois) → `POST /internal/billing-cycle` — estime la consommation de chaque tenant (Cloud Monitoring : temps d'instance et requêtes du service `tenant-<slug>` ; Storage : octets du préfixe ; analytics : egress estimé), archive le détail dans `sites/{id}.billing.{YYYY-MM}` et pousse l'usage sur le meter Stripe. Le client voit son estimation en continu (`GET /me/sites/:id/billing`).
- `POST /orders` : crée/récupère le `stripeCustomerId`, réserve le slug (transaction sur `slugs/{slug}` avec TTL de réservation 30 min), crée la Checkout Session (mode `subscription`, `metadata: { orderId, siteSlug, templateSlug, uid }`).
- **Webhooks** (endpoint public, vérif signature `STRIPE_WEBHOOK_SECRET`, idempotence via `stripe_events`) :
  - `checkout.session.completed` → confirme l'ordre, crée `sites/{id}` (status `provisioning`), **enqueue le provisioning** (§7).
  - `customer.subscription.updated|deleted` → sync statut abonnement ; `deleted` → site `suspended` (le site reste déployé mais l'admin est notifié ; la désactivation réelle est une action admin en v1).
  - `invoice.payment_failed` → email + flag.
- Dev local : **Stripe CLI** (`stripe listen --forward-to localhost:8081/api/v1/stripe/webhook`) documenté dans le README.

---

## 6. Les templates artistes

### 6.1 Périmètre fonctionnel commun (identique à marcel-nino-pajot)

Chaque template est un site complet **back (Express ESM) + front (Vite/React, MUI ou CSS custom)** reprenant exactement le périmètre de marcel-nino-pajot :

- Galerie d'œuvres **classées par technique** (les 6 techniques du modèle Artwork : `mixed_canvas`, `mixed_paper`, `watercolor_pastel`, `drawing`, `illustration_edition`, `illustration_poster`), pagination « charger plus » (24/page, curseur `startAfter`).
- Pages : accueil (hero + aperçu galerie + actus + teaser bio + presse + contact), biographie, galerie + détail d'œuvre, presse, contact.
- **Back-office** complet : CRUD œuvres (avec upload images GCS), actualités, contenu du site (`site_config` : hero, bio, presse, actus, contact, réseaux).
- Auth admin : login → JWT cookie httpOnly ; routes admin protégées.
- Formulaire de contact : **brancher l'envoi réel via Resend** (amélioration vs marcel où c'est UI-only) — endpoint `POST /api/v1/contact` rate-limité + honeypot anti-spam.

### 6.2 Adaptations multi-tenant du back template

Le back de template est **une seule image Docker paramétrée par env** — c'est la clé du provisioning rapide :

- `TENANT_ID=<slug>` : toutes les lectures/écritures Firestore sont préfixées `tenants/{TENANT_ID}/…` (`artworks`, `site_config/main`, `analytics_*`). Idem Storage : `tenants/{TENANT_ID}/uploads/…`.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `JWT_SECRET` : injectés par le provisioning (secret par tenant).
- `CORS_ORIGIN` : l'URL Hosting du tenant.
- Middleware analytics (§8.2) activé.
- Le front reste servi par Firebase Hosting avec **rewrite `/api/** → service Cloud Run du tenant`** : le front utilise des URLs relatives `/api/v1` (comportement déjà présent dans marcel quand `VITE_API_URL` est absent) → **le build front est identique pour tous les tenants d'une même template, aucun rebuild par client**.

### 6.3 Template 1 — « Atelier » (dérivée de marcel-nino-pajot)

- Copier `marcel-nino-pajot/back` et `front` dans `templates/atelier/`, appliquer §6.2.
- **Placeholderiser** : aucun contenu ni image de Marcel. Seed de démo générique : nom d'artiste « Prénom Nom », bio lorem soignée, 12–18 œuvres placeholder (images abstraites générées ou libres de droits, réparties sur les 6 techniques), 2 actus, 2 articles de presse fictifs.
- Le seed est un script (`templates/atelier/seed.js`) exécuté par le provisioning pour peupler `tenants/{slug}`.

### 6.4 Templates 2 et 3 — même périmètre, DA radicalement différentes

Mêmes routes, même modèle de données, même back-office fonctionnel (le back est commun à 95 % — factoriser ce qui peut l'être dans `packages/shared`, mais chaque template garde son back déployable pour rester autonome). Ce qui change : la présentation.

- **Template 2 — « Monolith »** : sombre et immersive. Fond noir, typographie massive, œuvres plein écran, **galerie en scroll horizontal** (ou grille plein-bleed), transitions marquées, curseur custom. Cible : illustrateurs, photographes, univers graphique fort.
- **Template 3 — « Papier »** : claire et éditoriale. Ambiance papier/atelier, fond ivoire, serif élégante, **grille masonry**, beaucoup de respiration, détails délicats (filets, légendes façon cartel de musée : titre, technique, dimensions, année). Cible : aquarellistes, dessinateurs, pastel.
- Le back-office peut partager la même UI entre les 3 templates (pas besoin de le redesigner 3 fois) — seule la partie publique change de peau.

### 6.5 Instances de démo

Pour chaque template, **une instance live permanente** (tenant réservé `demo-atelier`, `demo-monolith`, `demo-papier`) avec le contenu seed, liée depuis les pages `/templates/[slug]` de la vitrine. Le back-office des démos est accessible en **lecture seule** (flag `DEMO_MODE=1` : les mutations renvoient 403 avec un message aimable) pour que les prospects puissent le visiter.

---

## 7. Provisioning automatique (le cœur du projet)

### 7.1 Principe

Aucun rebuild par client. Tout est **pré-construit par la CI** :

- Images Docker des backs de templates → Artifact Registry, taguées `atelier-v<N>`.
- Builds statiques des fronts de templates → bucket GCS `portforyou-template-builds/atelier/v<N>/…`.

Le provisioning ne fait qu'**instancier** : créer les ressources tenant et y déployer ces artefacts. Objectif : **site live en < 3 minutes**.

### 7.2 Orchestration

- Le webhook Stripe enqueue une **Cloud Task** (queue `provisioning`, retries automatiques, backoff) qui appelle `POST /internal/provision` sur l'API (endpoint protégé par OIDC — seul le service account de Cloud Tasks peut l'appeler).
- Le worker de provisioning vit **dans l'API** (pas de service séparé en v1), exécute les étapes séquentiellement et met à jour `deployments/{id}` à chaque transition (c'est ce que le dashboard écoute en temps réel).
- Chaque étape est **idempotente** (re-jouable après échec) : vérifier l'existence avant de créer.

### 7.3 Étapes du pipeline (statuts affichés au client)

1. **Validation** — slug réservé, template et version d'artefacts résolues.
2. **Base de données** — seed du contenu placeholder dans `tenants/{slug}` (script seed de la template).
3. **Secrets** — génération du mot de passe back-office (fort, aléatoire), hash bcrypt, `JWT_SECRET` aléatoire → **Secret Manager** (`tenant-<slug>-admin-hash`, `tenant-<slug>-jwt`).
4. **API du site** — déploiement d'un service **Cloud Run** `tenant-<slug>` depuis l'image de la template (Cloud Run Admin API), env : `TENANT_ID`, `ADMIN_EMAIL` (email client), refs Secret Manager, `CORS_ORIGIN`. Min instances 0, max 2, 256–512 Mo, concurrency 80, ingress all + auth non requise (l'API tenant gère sa propre auth).
5. **Site web** — création d'un **site Firebase Hosting** `pfy-<slug>` (Hosting REST API), upload de la version statique depuis le bucket d'artefacts (`versions.populateFiles`), config `rewrites: [{ source: "/api/**", run: { serviceId: "tenant-<slug>" } }]`, release.
6. **Vérifications** — poll `https://pfy-<slug>.web.app/` (200) et `/api/v1/site-config` (200), timeout 90 s.
7. **Finalisation** — `sites/{id}.status = live`, email « votre site est en ligne » (URL + email admin + mot de passe généré — mot de passe envoyé une seule fois, jamais stocké en clair côté plateforme).

En cas d'échec : étape `failed` + message, `sites/{id}.status = error`, email d'excuse au client, alerte admin. Bouton retry côté admin (ré-enqueue à partir de l'étape échouée grâce à l'idempotence).

### 7.4 Modèle de données tenant

```
tenants/{slug}/artworks/{id}         # modèle Artwork de marcel (title, technique, height, width, support?, year?, comment?, imageUrl, additionalImages[], createdAt, updatedAt)
tenants/{slug}/site_config/main      # heroImageUrl, techniqueImages, biographyText, biographyImageUrl, pressItems, newsItems, contactEmail, socialInstagram, socialFacebook
tenants/{slug}/analytics_daily/{yyyy-mm-dd}   # cf. §8.2
```

Index composite requis : `tenants/*/artworks (technique ASC, createdAt DESC)` (collection group ou par tenant — déclarer dans `firestore.indexes.json`).

### 7.5 Limites de la démo (à documenter dans le README, pas à cacher)

- Quota Firebase Hosting : ~36 sites/projet par défaut → suffisant pour la démo ; demander une augmentation de quota ou basculer sur un load balancer + bucket par tenant en v2.
- Suppression d'un tenant = suppression service Cloud Run + site Hosting + purge `tenants/{slug}` + secrets. Implémenter le pipeline inverse (`deprovision`), utilisé par l'admin.

---

## 8. Features transverses

### 8.1 Emails transactionnels (Resend)

Templates d'emails (React Email ou HTML simple, en français, DA cohérente) :

1. Confirmation de commande (récap + « déploiement en cours »).
2. **Site en ligne** (URL, lien back-office, identifiants).
3. Échec de déploiement (« nos équipes sont prévenues »).
4. Message reçu via le formulaire de contact d'un site tenant → transféré à l'email de contact de l'artiste.
   Envois loggés dans `email_logs/` (statut, destinataire, type). Clé API dans Secret Manager.

### 8.2 Analytics artistes (first-party, minimaliste et RGPD-friendly)

- Le **front tenant** envoie un beacon `POST /api/v1/track` (`navigator.sendBeacon`) : `{ path, ref }` — **aucun cookie, aucune donnée personnelle, pas d'IP stockée** (dédup approximative par hash journalier IP+UA non réversible, jamais persisté brut).
- Le back tenant agrège en compteurs `tenants/{slug}/analytics_daily/{date}` : `{ pageViews, uniques~, paths: {…}, artworkViews: {…} }` (increments Firestore, tolérance à l'approximation).
- Le dashboard client affiche : visites 7/30 jours (barres), top pages, top œuvres. Suivre le skill dataviz du projet si disponible.

### 8.3 Health checks & monitoring des tenants

- **Cloud Scheduler** (toutes les 10 min) → endpoint admin de l'API → ping `/` et `/api/v1/health` de chaque site live → `sites/{id}.health = { status, latencyMs, checkedAt }`.
- Dashboard admin : pastille verte/orange/rouge par site, historique des incidents.
- **Cloud Monitoring** : alertes sur erreurs 5xx de l'API plateforme, échecs de la queue Cloud Tasks, budget billing avec alerte (garde-fou démo).

---

## 9. Sécurité (exigence : « nickel »)

Appliquer systématiquement, et documenter dans `docs/SECURITY.md` :

1. **Validation d'entrée** : zod sur 100 % des bodies/params/queries (API plateforme et backs templates). Rejet par défaut, listes blanches de champs (comme `site_config` chez marcel).
2. **Auth** : Firebase ID tokens vérifiés serveur (plateforme) ; JWT httpOnly `SameSite=Lax` + `Secure` (tenants). Pas de token dans le localStorage. Custom claim `admin` posé par script one-shot documenté.
3. **Headers** : helmet partout ; **CSP stricte** sur la vitrine Next.js (nonces pour les scripts inline GSAP éventuels) ; `trust proxy` correct derrière Cloud Run.
4. **CORS** : origin unique et explicite par service, `credentials: true` seulement où nécessaire.
5. **Rate limiting** : global (ex. 100 req/min/IP) + endpoints sensibles renforcés (login tenant : 5/min ; `slugs/check` ; `contact` ; `track`).
6. **Webhooks Stripe** : signature vérifiée sur raw body, idempotence, endpoint hors middleware JSON.
7. **Secrets** : **Secret Manager exclusivement** en prod (aucun secret dans les images, le repo, ou les env GitHub en clair) ; `.env` locaux gitignorés avec `.env.example` exhaustifs.
8. **IAM moindre privilège** : service accounts dédiés — `sa-api` (Firestore, Tasks enqueue, Secret accessor), `sa-provisioner` = le même que l'API en v1 mais rôles strictement listés (`run.admin` sur le projet limité par condition de nom `tenant-*` si possible, `firebasehosting.admin`, `secretmanager.admin` sur préfixe), `sa-ci` via WIF (Artifact Registry writer, Cloud Run deploy des services plateforme uniquement).
9. **Firestore rules** : le SDK web de la plateforme n'accède **qu'en lecture** à `deployments` du user (`request.auth.uid == resource.data.uid`) — tout le reste passe par l'API. Les `tenants/**` : accès Admin SDK uniquement (deny all côté client).
10. **Uploads** : validation type MIME réel (magic bytes) + taille (10 Mo) + noms de fichiers régénérés (UUID) — durcir ce qui existe chez marcel.
11. **Dépendances** : `pnpm audit` en CI (fail sur high/critical), Dependabot/Renovate activé.
12. **Logs** : jamais de secrets/tokens/mots de passe dans les logs ; logs structurés JSON (pino) → Cloud Logging.
13. **Anti-abus provisioning** : max N sites par compte (ex. 3), slug blacklist, vérification email Firebase requise avant commande.

---

## 10. Infrastructure GCP — mise en place complète

### 10.1 Ressources du projet `portforyou-vsp`

| Ressource                          | Usage                                                                                                                       |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Cloud Run `pfy-web`                | Vitrine + dashboards Next.js                                                                                                |
| Cloud Run `pfy-api`                | API plateforme                                                                                                              |
| Cloud Run `tenant-<slug>` (×N)     | Backs des sites clients (créés par le provisioning)                                                                         |
| Firebase Hosting site principal    | (optionnel) alias de la vitrine, sinon URL Cloud Run directe                                                                |
| Firebase Hosting `pfy-<slug>` (×N) | Fronts des sites clients                                                                                                    |
| Firestore (natif)                  | Données plateforme + `tenants/**`                                                                                           |
| Cloud Storage                      | `portforyou-template-builds` (artefacts fronts), `portforyou-uploads` (images tenants, public read sur `tenants/*/uploads`) |
| Artifact Registry `pfy`            | Images Docker (api, web, template-backs)                                                                                    |
| Cloud Tasks queue `provisioning`   | Orchestration asynchrone                                                                                                    |
| Secret Manager                     | Secrets plateforme + secrets par tenant                                                                                     |
| Cloud Scheduler                    | Health checks (10 min), purge des réservations de slugs expirées (1 h)                                                      |
| Firebase Auth                      | Comptes clients + admin                                                                                                     |
| Cloud Monitoring/Logging           | Alertes, dashboards, logs structurés                                                                                        |

### 10.2 Script d'installation

Fournir `infra/scripts/setup-gcp.sh` **idempotent** qui : active les APIs (`run`, `firestore`, `firebasehosting`, `cloudtasks`, `secretmanager`, `cloudscheduler`, `artifactregistry`, `iamcredentials`…), crée les buckets, la queue, les service accounts + bindings IAM, la config WIF pour GitHub Actions, et imprime un récapitulatif. Terraform est un plus apprécié mais **optionnel en v1** — si le temps manque, les scripts gcloud commentés suffisent ; documenter le choix dans un ADR.

### 10.3 Dev local

`docker-compose.yml` : émulateurs Firebase (Firestore, Auth, Hosting si utile), l'API, la vitrine en mode dev. Stripe CLI pour les webhooks. `pnpm dev` à la racine lance tout. Le provisioning en local cible les émulateurs et **simule** les étapes Cloud Run/Hosting (driver `fake` derrière une interface `ProvisionerDriver` — ce qui permet aussi de tester le pipeline en CI sans GCP).

---

## 11. CI/CD (GitHub Actions)

### 11.1 Workflows

1. **`ci.yml`** (PR + main) : install pnpm avec cache → lint (ESLint + Prettier check) → typecheck → **tests** (API : Vitest + supertest ; web : Vitest + RTL ; provisioning : tests du pipeline avec driver fake) → build de tout → `pnpm audit`.
2. **`deploy-platform.yml`** (push main, après CI verte) : build images `pfy-api` et `pfy-web` (Docker multi-stage, tag = SHA) → push Artifact Registry → deploy Cloud Run (`gcloud run deploy` avec l'image taguée). Auth par **Workload Identity Federation** (aucune clé JSON).
3. **`release-templates.yml`** (déclenché par changement dans `templates/**` sur main, ou manuellement) : pour chaque template modifiée → build image back → push (`atelier-v<N>`) → build front Vite → upload GCS `portforyou-template-builds/atelier/v<N>/` → met à jour le document Firestore `templates/{slug}.currentVersion`. Les tenants existants restent sur leur version (upgrade = redeploy admin, v2).

### 11.2 Qualité

- Environnements GitHub `production` avec approbation manuelle sur le deploy si souhaité.
- Badge de statut dans le README. Conventional commits. Protection de branche main (CI requise).

---

## 12. Tests — exigences minimales

- **API plateforme** : auth middleware, réservation de slug (course concurrente), webhook Stripe (signature, idempotence), pipeline de provisioning complet avec driver fake (succès, échec à chaque étape, retry).
- **Templates** : reprendre/adapter les tests existants de marcel (back : routes publiques + admin ; front : rendu pages clés), plus tests du préfixage `TENANT_ID`.
- **Web** : funnel de commande (stepper, validation slug), garde des routes protégées.
- **E2E (bonus apprécié)** : Playwright sur le flow démo complet contre l'environnement local (provisioning fake).

---

## 13. Ordre de mise en œuvre recommandé

1. **Socle** : monorepo, tooling (pnpm, ESLint/Prettier, TS), CI lint+test, docker-compose émulateurs.
2. **Template Atelier** : migration de marcel-nino-pajot → `templates/atelier` multi-tenant (§6.2, §6.3) + seed + tests. C'est le composant le plus dérisqué (code existant).
3. **API plateforme** : auth Firebase, modèles Firestore, slugs, orders + Stripe Checkout + webhooks (provisioning en driver fake).
4. **Provisioning réel GCP** : driver `gcp` (Cloud Run Admin API + Hosting REST API + Secret Manager), pipeline, Cloud Tasks. **Jalon clé : la démo passe de bout en bout.**
5. **Vitrine Next.js** : pages publiques, DA, animations, R3F hero.
6. **Dashboards** client puis admin (suivi temps réel, analytics, health checks).
7. **Templates Monolith et Papier** + instances démo.
8. **Finitions** : emails, monitoring, docs (README, SECURITY, runbook, ADRs), E2E.

Chaque phase doit laisser main **verte et déployable**.

---

## 14. Roadmap v2 (documenter, ne pas implémenter)

- Achat de vrais noms de domaine (Cloud Domains / registrar) + domaines custom sur Hosting.
- Éditeur de personnalisation à la commande (couleurs, typo, logo) avec preview live.
- Upgrade de version de template par tenant, self-service.
- Vrai « projet GCP par client » pour l'isolation forte (l'interface `ProvisionerDriver` doit rendre cette évolution possible sans refonte).
- Vente d'œuvres en ligne (e-commerce) dans les templates.
- Multi-langue (fr/en) vitrine et templates.

---

## 15. Estimation de coûts (démo, trafic faible)

Hypothèses : ~10 tenants déployés, quelques centaines de visites/mois au total, tout en free tier quand disponible. Prix région `europe-west1`, à jour début 2026 — **vérifier les grilles tarifaires au moment de l'implémentation**.

| Service                                      | Usage démo                                                              | Free tier                                    | Coût estimé/mois               |
| -------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------- | ------------------------------ |
| Cloud Run (`pfy-web`, `pfy-api`, `tenant-*`) | min-instances 0 partout, trafic faible → quasi que du cold start        | 180 000 vCPU-s + 360 000 Go-s + 2 M req/mois | **0 €**                        |
| Firestore                                    | < 50k lectures/j, < 20k écritures/j                                     | 1 Gio, 50k lectures + 20k écritures/jour     | **0 €**                        |
| Firebase Hosting (sites tenants)             | ~10 sites, < 360 Mo/j de transfert                                      | 10 Go stockage + 360 Mo/j                    | **0 €**                        |
| Cloud Storage (artefacts + uploads)          | < 5 Go                                                                  | 5 Go (us) ; en EU léger dépassement possible | **0–0,50 €**                   |
| Artifact Registry                            | ~3–5 images × versions, prévoir une policy de nettoyage (garder 3 tags) | 0,5 Go                                       | **0,50–2 €**                   |
| Secret Manager                               | ~2 secrets/tenant + plateforme ≈ 25 versions actives                    | 6 versions actives                           | **~1–1,50 €** (0,06 $/version) |
| Cloud Tasks                                  | quelques dizaines de tâches/mois                                        | 1 M opérations/mois                          | **0 €**                        |
| Cloud Scheduler                              | 2 jobs (health checks, purge slugs)                                     | 3 jobs                                       | **0 €**                        |
| Cloud Logging/Monitoring                     | logs faibles                                                            | 50 Gio logs/mois                             | **0 €**                        |
| Firebase Auth                                | < 50 comptes                                                            | 50k MAU                                      | **0 €**                        |
| **Total GCP**                                |                                                                         |                                              | **≈ 2–5 €/mois**               |
| Resend                                       | < 100 emails/mois                                                       | 3 000 emails/mois                            | **0 €**                        |
| Stripe                                       | mode test uniquement                                                    | illimité en test                             | **0 €**                        |
| GitHub Actions                               | repo public : illimité ; privé : ~200–400 min/mois                      | 2 000 min/mois (privé)                       | **0 €**                        |

**Garde-fous obligatoires** : budget GCP avec alertes à 5 € / 10 € / 20 € (§8.3), `max-instances` bas sur tous les services Cloud Run, policy de rétention Artifact Registry, et pipeline `deprovision` utilisé pour nettoyer les tenants de test. Le principal risque de dérive est un oubli de nettoyage (images accumulées, tenants zombies), pas le trafic.

À l'échelle (ordre de grandeur, pour le pitch) : ~100 tenants actifs à trafic modeste ≈ 20–50 €/mois d'infra, très en dessous des abonnements clients (5 €+conso+10 % chacun) — la marge est structurelle : le coût d'infra est refacturé au client majoré de 10 %.

---

## 16. Critères d'acceptation de la démo

- [ ] Vitrine en ligne, hero animée R3F, Lighthouse ≥ 90, responsive, `prefers-reduced-motion` respecté.
- [ ] Création de compte, commande template Atelier, slug vérifié, paiement Stripe test.
- [ ] Provisioning automatique < 3 min, suivi temps réel étape par étape dans le dashboard.
- [ ] Site tenant accessible sur `pfy-<slug>.web.app`, galerie seedée, back-office fonctionnel avec les credentials reçus par email.
- [ ] Analytics visibles dans le dashboard client après quelques visites du site tenant.
- [ ] Dashboard admin : liste clients/sites/déploiements, health checks, retry d'un déploiement échoué.
- [ ] 3 templates visibles sur la vitrine avec instances de démo live.
- [ ] CI verte (lint, tests, audit), déploiement plateforme automatique sur main via WIF.
- [ ] Aucun secret en clair dans le repo, README + SECURITY.md + runbook à jour.
