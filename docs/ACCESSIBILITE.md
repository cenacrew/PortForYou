# Accessibilité — Port'ForYou

## Référentiel choisi

**WCAG 2.1, niveau AA.** C'est le standard international sur lequel
s'appuient les référentiels nationaux (dont le RGAA français, qui en est une
déclinaison réglementaire pour le secteur public) et celui que les outils du
projet (Lighthouse, `eslint-plugin-jsx-a11y`) évaluent nativement. Port'ForYou
n'étant pas un service public, le RGAA n'est pas une obligation légale ici,
mais viser WCAG 2.1 AA reste le choix le plus pertinent : c'est le socle
technique commun, transposable au RGAA si le projet devait un jour l'exiger
(ex. un client du secteur public), et directement mesurable par l'outillage
déjà en place.

## Où l'accessibilité est vérifiée

| Mécanisme                             | Portée                                                                                                               | Nature                                                                                                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `eslint-plugin-jsx-a11y` (recommandé) | `apps/web/src` (vitrine Port'ForYou) et `packages/template-front-core/src` + `templates/*/front/src` (sites tenants) | Statique, à l'écriture du code (alt manquant, rôles ARIA invalides, labels de formulaire, contrastes non couverts par cet outil)                   |
| Lighthouse CI (`lighthouse.yml`)      | Vitrine (`apps/web`), page d'accueil + une page riche en images                                                      | Automatisé, à chaque PR/push touchant `apps/web/**` — audite la catégorie "Accessibility" (contraste, alt, ARIA, navigation clavier de base, etc.) |
| Revue manuelle                        | Non systématique à ce jour                                                                                           | —                                                                                                                                                  |

## État réel (honnête, pas survendu)

- Le score Lighthouse Accessibility est configuré avec un seuil de **0.9**
  (`lighthouserc.json`) en assertion **`error`** (bloquante) : une régression
  d'accessibilité sur la vitrine fait échouer la CI. Les autres catégories
  (performance, SEO, bonnes pratiques) restent en `warn` le temps que leurs
  budgets soient calibrés sur une baseline réelle (voir `docs/ARCHITECTURE.md`
  §10).
- `eslint-plugin-jsx-a11y` couvre l'ensemble du front (vitrine + templates
  tenants) en configuration `recommended` — l'essentiel des erreurs
  structurelles (images sans `alt`, boutons sans libellé accessible,
  attributs ARIA mal utilisés) est donc détecté **avant merge**, pas
  seulement en audit après coup.
- Ce qui n'est **pas** couvert aujourd'hui : audit manuel au clavier/lecteur
  d'écran, tests automatisés dédiés (`@axe-core/playwright`, évoqué comme
  piste dans `docs/IMPROVEMENTS.md` mais pas encore implémenté), contrastes
  de couleur du thème dynamique des templates (les couleurs de site sont
  personnalisables par l'artiste via le back-office — rien ne garantit
  aujourd'hui qu'une combinaison choisie reste conforme WCAG AA).

## Prochaines étapes (par ordre d'effort croissant)

1. ~~Durcir les assertions Lighthouse accessibilité en `error`~~ — **fait**
   (`lighthouserc.json`, catégorie `accessibility` en `error`, min 0.9).
2. Ajouter `@axe-core/playwright` aux specs e2e existantes
   (`apps/web/e2e/*.spec.ts`) pour un audit automatisé par page, au-delà de
   ce que Lighthouse couvre.
3. Avertir l'artiste dans le back-office (section "Couleurs du site") si la
   combinaison fond/texte choisie n'atteint pas un ratio de contraste
   suffisant (calcul WCAG simple, côté client).
