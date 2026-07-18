# Politique de sécurité

Ce document explique comment signaler une vulnérabilité découverte dans
Port'ForYou. Il s'adresse aux chercheurs en sécurité externes — pour le
détail des mesures de sécurité mises en place côté produit (auth, secrets,
rate limiting, IAM…), voir [`docs/SECURITY.md`](./docs/SECURITY.md).

## Signaler une vulnérabilité

**Ne créez pas d'issue GitHub publique pour une faille de sécurité.**

Deux canaux, par ordre de préférence :

1. **GitHub Security Advisories** (recommandé) : onglet
   [Security → Report a vulnerability](https://github.com/cenacrew/PortForYou/security/advisories/new)
   du dépôt. Le rapport reste privé entre vous et le mainteneur.
2. **Email** : `security@portforyou.example`
   _(placeholder — adresse de contact à finaliser par le mainteneur avant
   mise en production commerciale)._

Merci d'inclure :

- une description du problème et de son impact potentiel ;
- les étapes de reproduction (ou un PoC minimal) ;
- la version/commit concerné si connu.

## Ce à quoi vous attendre

- Accusé de réception sous quelques jours ouvrés.
- Le projet est en phase de développement actif (dépôt public à but de
  démonstration) — aucun SLA formel n'est garanti à ce stade, mais tout
  rapport sérieux sera traité avec attention.
- Merci de nous laisser un délai raisonnable pour corriger avant toute
  divulgation publique (divulgation responsable / coordonnée).

## Périmètre

Sont concernés : `apps/api`, `apps/web`, `packages/template-back-core`, les
templates (`templates/*`), et la configuration d'infrastructure sous
`infra/`. Le projet fonctionne en mode démonstration (paiement Stripe en
mode test uniquement, voir `PortForYou.md`) — aucune donnée de carte
bancaire réelle n'y transite.

## Voir aussi

- [`/.well-known/security.txt`](./apps/web/public/.well-known/security.txt)
  (RFC 9116, servi par la vitrine)
- [`docs/SECURITY.md`](./docs/SECURITY.md) — posture de sécurité interne,
  détaillée par couche
