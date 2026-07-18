# 0001 — Auth maison plutôt que Firebase Auth côté serveur

**Statut** : Accepté

## Contexte

`PortForYou.md` (cahier des charges initial) prévoyait Firebase Authentication
(email/password + Google, rôle admin via custom claims) pour l'auth
plateforme (§ tableau des choix techniques). C'est l'option la plus rapide à
mettre en place avec l'écosystème Firebase déjà utilisé pour Firestore et
Storage.

Le projet impose par ailleurs des règles Firestore **deny-all** côté client
(`firestore.rules`) : le navigateur ne doit jamais parler directement à
Firestore, tout passe par l'API (Admin SDK). Firebase Auth SDK côté client
reste compatible avec cette contrainte pour l'authentification elle-même,
mais introduit une dépendance forte à l'écosystème Firebase pour un
mécanisme — session utilisateur — que l'équipe voulait maîtriser de bout en
bout (rotation de session, révocation, contrôle fin du contenu du token).

## Options considérées

- **Firebase Authentication** (SDK client + vérification serveur des ID
  tokens) : rapide, gère nativement OAuth Google, mais moins de contrôle sur
  le cycle de vie des sessions (rotation, révocation immédiate en cas de
  compromission) et une dépendance supplémentaire à un service géré pour un
  besoin somme toute standard (bcrypt + JWT).
- **Auth maison** (bcrypt + JWT) : plus de code à maintenir, mais contrôle
  total sur la politique de session et cohérent avec le modèle « API comme
  seul point d'accès » déjà retenu pour Firestore.

## Décision

Auth plateforme **maison** : bcrypt (11 rounds) pour les mots de passe,
access token JWT (HS256, 15 min, gardé en mémoire navigateur uniquement —
jamais `localStorage`), refresh token opaque **rotatif** (30 j, cookie
httpOnly) avec détection de réutilisation qui révoque toutes les sessions en
cas de vol. OAuth Google est implémenté à la main côté serveur
(Authorization Code, state signé anti-CSRF, vérification du `id_token`),
sans SDK client Firebase. Le rôle admin est un champ Firestore sur `users`,
porté par le JWT.

Le back-office tenant (`packages/template-back-core`) suit le même modèle
(bcrypt + JWT cookie httpOnly), repris tel quel du projet
`marcel-nino-pajot` d'origine.

## Conséquences

- Contrôle complet du cycle de vie des sessions : rotation, révocation
  immédiate sur reuse-detection, pas de dépendance à la disponibilité d'un
  service tiers pour l'authentification.
- Plus de code à tester et maintenir (`apps/api/src/auth/`) qu'un simple
  appel au SDK Firebase — compensé par une suite de tests dédiée
  (`auth.middleware.test.ts`, `emailVerification.int.test.ts`) et un pentest
  du flow (`pentest.provisioning.int.test.ts`).
- Une promotion admin nécessite un re-login (le rôle est baked dans le JWT,
  pas relu à chaque requête) — compromis assumé pour éviter une lecture
  Firestore sur chaque requête authentifiée.
- Cohérent avec le principe deny-all Firestore : aucune surface
  d'authentification client-side qui contournerait l'API.
