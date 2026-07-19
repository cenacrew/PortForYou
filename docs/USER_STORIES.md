# User stories — Port'ForYou

Référentiel formalisé des exigences fonctionnelles, au format
`En tant que... je veux... afin de...` avec critères d'acceptation. Complète
`PortForYou.md` (cahier des charges narratif, prescriptif sur les choix
d'architecture) sans le remplacer : ce document reformule le même périmètre
fonctionnel de façon vérifiable, et sert de référence pour
`docs/CAHIER_DE_RECETTES.md` (statut de test de chaque story).

Trois rôles : **Visiteur** (public, non connecté), **Artiste** (client
Port'ForYou, propriétaire d'un ou plusieurs sites), **Admin** (équipe
Port'ForYou, supervision de la plateforme).

---

## Visiteur

### US-01 — Découvrir la plateforme

En tant que **visiteur**, je veux consulter la vitrine Port'ForYou afin de
comprendre l'offre avant de m'engager.

- La page d'accueil présente une proposition de valeur claire, un CTA vers
  les templates et un CTA vers la création de compte.
- La page `/templates` liste les 3 templates disponibles avec un aperçu
  visuel et un lien vers une instance de démonstration en ligne.
- Chaque page `/templates/[slug]` détaille les fonctionnalités incluses
  (galerie par technique, back-office, biographie, presse, contact) et
  propose un lien vers la démo live et un CTA de commande.

### US-02 — Visiter un site tenant démo

En tant que **visiteur**, je veux naviguer sur un site de démonstration
(atelier/monolith/papier) afin de me projeter dans le résultat final.

- La démo est accessible sans compte, en lecture seule (`DEMO_MODE=1` : toute
  tentative de mutation dans le back-office renvoie une erreur explicite).
- La galerie est filtrable par technique, la pagination fonctionne
  (« charger plus »), les pages biographie/presse/contact sont accessibles.

### US-03 — Demander un devis personnalisé

En tant que **visiteur** dont le besoin ne correspond à aucun template, je
veux décrire mon projet afin de recevoir une proposition sur mesure.

- Formulaire de contact vitrine (nom, email, type de projet, budget indicatif,
  description) protégé par rate limiting.
- Un email de notification part vers l'équipe Port'ForYou.

---

## Artiste (client)

### US-04 — Créer un compte

En tant qu'**artiste**, je veux créer un compte (email/mot de passe ou
Google) afin d'accéder au funnel de commande et à mon espace client.

- Mot de passe : 8 caractères minimum.
- Un email de vérification est envoyé ; en prod, la commande est bloquée
  tant que l'email n'est pas confirmé (`REQUIRE_VERIFIED_EMAIL=1`) — les
  comptes Google sont vérifiés d'office.
- Connexion Google : bouton dédié, séparation stricte des providers (un
  compte créé par email/mot de passe ne peut pas se connecter via Google
  sans lien explicite, et inversement).

### US-05 — Commander un site

En tant qu'**artiste connecté**, je veux choisir un template, un nom de site
et payer un abonnement afin d'obtenir mon portfolio en ligne.

- Stepper en 4 étapes : template → slug → identité → récapitulatif +
  paiement.
- Le nom de site (slug) est vérifié en temps réel (règles `[a-z0-9-]{3,30}`,
  liste noire, unicité) ; l'URL finale (`pfy-<slug>.web.app`) est prévisualisée.
- Un slug déjà pris (ou dont le nom est indisponible côté Firebase Hosting,
  voir §"Disponibilité du nom Hosting" de `docs/ARCHITECTURE.md`) est
  refusé avant paiement, avec un message actionnable.
- Le paiement (Stripe, mode test) redirige vers un écran de confirmation
  puis le tableau de bord.
- **Vérifié par** : `apps/web/e2e/flow.spec.ts` (parcours complet
  inscription → commande → paiement → site en ligne).

### US-06 — Suivre le déploiement de mon site en temps réel

En tant qu'**artiste**, je veux voir l'avancement du déploiement de mon site
étape par étape afin de savoir quand il sera prêt.

- Timeline temps réel (SSE) : `validation` → `database` → `secrets` →
  `backend` → `frontend` → `checks` → `finalize`, chaque étape affichant son
  statut (en attente / en cours / terminé / échec).
- En cas d'échec, un message clair et actionnable est affiché (pas un
  message technique opaque) et je peux relancer le déploiement.
- Un email de confirmation ("votre site est en ligne") est envoyé à la fin,
  avec l'URL et les identifiants du back-office.

### US-07 — Gérer le contenu de mon site (back-office)

En tant qu'**artiste**, je veux ajouter/modifier/supprimer mes œuvres, mes
actualités et les réglages de mon site afin de garder mon portfolio à jour
sans compétence technique.

- Voir `docs/MANUEL_UTILISATEUR.md` pour le détail fonctionnel complet
  (œuvres, actualités, SEO, image d'accueil, biographie, presse, contact,
  couleurs).
- Connexion au back-office via les identifiants reçus par email, JWT cookie
  httpOnly.

### US-08 — Consulter mes statistiques de fréquentation

En tant qu'**artiste**, je veux voir le nombre de visites de mon site afin
d'évaluer sa visibilité.

- Tableau de bord client : visites sur 30 jours (graphique par jour), total
  pages vues / visiteurs uniques.
- Aucune donnée personnelle ni cookie utilisé pour cette mesure.

### US-09 — Gérer mon abonnement et ma facturation

En tant qu'**artiste**, je veux consulter mes factures et mon estimation de
consommation afin de maîtriser mon budget.

- Accès au Stripe Customer Portal (mode test) depuis le tableau de bord.
- Estimation de consommation infra affichée (calcul/mois) avec le détail des
  postes (calcul, requêtes, stockage, trafic sortant) et la formule de
  facturation projetée.

### US-10 — Régénérer mon mot de passe back-office

En tant qu'**artiste**, je veux régénérer le mot de passe de mon back-office
si je l'ai perdu, afin de retrouver l'accès sans intervention du support.

- Bouton dédié dans le tableau de bord ; le nouveau mot de passe n'est
  affiché qu'une seule fois.

### US-11 — Supprimer mon compte (RGPD)

En tant qu'**artiste**, je veux supprimer mon compte et mes données afin
d'exercer mon droit à l'effacement.

- Confirmation forte requise (saisie du mot « SUPPRIMER »).
- Le compte est supprimé immédiatement, les sites associés passent en
  statut `suspended` puis sont purgés sous 30 jours.
- **Vérifié par** : `apps/web/e2e/flow.spec.ts` ("la suppression de compte
  est protégée par confirmation").

### US-12 — Exporter mes données (RGPD, portabilité)

En tant qu'**artiste**, je veux télécharger l'intégralité de mes données
(profil, sites, commandes) afin d'exercer mon droit à la portabilité.

- Export au format JSON depuis la page profil.
- **Vérifié par** : `apps/api/src/__tests__/me.export.test.ts`.

---

## Admin (équipe Port'ForYou)

### US-13 — Superviser l'ensemble des clients et sites

En tant qu'**admin**, je veux une vue d'ensemble (clients, sites, MRR test,
déploiements en cours/échoués) afin de piloter la plateforme.

- Tableau de bord admin avec compteurs et liste des sites (statut, santé).

### US-14 — Relancer ou corriger un déploiement échoué

En tant qu'**admin**, je veux relancer un déploiement échoué à partir de
l'étape en erreur afin de débloquer un client sans tout refaire depuis le
début.

- Bouton « Retry » : le pipeline est idempotent, chaque étape vérifie
  l'existant avant de recréer — la relance ne duplique jamais une ressource.
- **Vérifié par** : `apps/api/src/__tests__/pentest.provisioning.int.test.ts`
  (idempotence sous contention réelle).

### US-15 — Suspendre ou supprimer un site

En tant qu'**admin**, je veux suspendre ou supprimer un tenant afin de gérer
les résiliations ou les abus.

- Suppression : confirmation forte, purge complète (service Cloud Run, site
  Hosting, secrets, données `tenants/{slug}`).

### US-16 — Surveiller la santé des sites déployés

En tant qu'**admin**, je veux voir l'état de santé de chaque site (up/down,
latence) afin de détecter un incident avant que le client ne le signale.

- Health check automatique (Cloud Scheduler, 10 min) sur chaque site live.
- Alertes 5xx (Cloud Monitoring) en complément.
