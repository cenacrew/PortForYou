# 0003 — SSE plutôt que `onSnapshot` client pour le suivi temps réel

**Statut** : Accepté

## Contexte

Le dashboard client doit afficher en temps réel la progression du
provisioning d'un site (timeline verticale des étapes du document
`deployments/{id}`, façon Vercel : pending / running / done / failed).
`PortForYou.md` (spec initiale) prévoyait `onSnapshot` côté client
(`§ Suivi de déploiement` : « Temps réel via Firestore `onSnapshot` côté
dashboard, le front Next.js utilise déjà le SDK Firebase JS pour l'auth »).

Cette option supposait que le front parle directement à Firestore via le SDK
JS — ce qui contredit une autre exigence du projet : des règles Firestore
**deny-all** intégrales, où le navigateur ne doit jamais accéder à Firestore
directement, tous les accès passant par l'API (Admin SDK côté serveur). Une
fois l'auth passée en maison (ADR-0001, plus de SDK Firebase client), la
justification initiale d'`onSnapshot` (« le SDK est déjà là pour l'auth »)
disparaît également.

## Options considérées

- **`onSnapshot` client-side** (SDK Firebase JS) : temps réel natif, zéro
  code serveur supplémentaire, mais nécessite d'ouvrir Firestore en lecture
  au navigateur (règles non triviales à sécuriser par utilisateur/site) et
  réintroduit une dépendance au SDK client déjà écartée par l'auth maison.
- **Polling HTTP** : simple, compatible avec le modèle API-only, mais
  latence perceptible ou coût réseau si l'intervalle est court.
- **SSE (Server-Sent Events) servi par l'API** : temps réel, reste
  compatible avec le principe « l'API est le seul point d'accès à
  Firestore » — le serveur lit Firestore (Admin SDK, `onSnapshot` **côté
  serveur** cette fois) et relaie les changements au navigateur via un flux
  HTTP standard.

## Décision

Le suivi de déploiement est servi en **SSE par l'API**
(`GET /me/sites/:id/deployments/stream`), authentifié par un token en
query string (`requireAuthSse`, seule route de l'API à accepter un token
hors header `Authorization` — nécessaire car `EventSource` ne permet pas de
poser de header personnalisé). L'API elle-même utilise `onSnapshot`
côté serveur sur `deployments/{id}` et relaie chaque changement au client
via le flux SSE.

## Conséquences

- Firestore reste deny-all pour tout client — aucune exception ouverte pour
  le suivi de déploiement, cohérence totale avec `firestore.rules`.
- Le paramètre d'auth en query string pour `EventSource` est une variante
  volontairement isolée et documentée (`requireAuthSse`) plutôt qu'un
  précédent généralisé — le reste de l'API n'accepte un token que via le
  header `Authorization`.
- Complexité additionnelle côté API (endpoint SSE à maintenir, gestion de la
  déconnexion/reconnexion) par rapport à un simple `onSnapshot` client — jugée
  acceptable au regard du gain de sécurité et de la cohérence architecturale.
- Le reste du dashboard (rôle admin, etc.) profite de la même absence de SDK
  Firebase côté client, réduisant la surface d'attaque et la taille du
  bundle front.
