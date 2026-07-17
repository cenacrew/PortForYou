# Architecture Decision Records (ADR)

Ce dossier capture le **pourquoi** des décisions d'architecture structurantes
du projet — `docs/ARCHITECTURE.md` décrit l'état final tel qu'implémenté,
mais pas les alternatives écartées ni le raisonnement qui a mené au choix
retenu. C'est ce qui évite, plus tard, de « réparer » un choix délibéré par
manque de contexte.

## Format

Un ADR par décision significative, numéroté séquentiellement
(`0001-titre-court.md`, `0002-...`), avec quatre sections courtes :

- **Contexte** — le problème, les contraintes au moment de la décision.
- **Options considérées** — les alternatives sérieusement évaluées.
- **Décision** — le choix retenu, en une phrase claire.
- **Conséquences** — ce que ça implique, y compris les compromis assumés.

Un ADR n'est pas figé : s'il est remis en cause, on n'édite pas l'ancien —
on ajoute un nouvel ADR qui le remplace et qui référence celui qu'il
supersède (statut `Remplacé par ADR-000X`).

## Index

| ADR                                              | Titre                                                     | Statut |
| ------------------------------------------------- | ---------------------------------------------------------- | ------ |
| [0001](./0001-auth-maison-plutot-que-firebase-auth.md) | Auth maison plutôt que Firebase Auth côté serveur           | Accepté |
| [0002](./0002-extraction-template-back-core.md)        | Extraction du back commun dans `template-back-core`         | Accepté |
| [0003](./0003-sse-plutot-que-onsnapshot-client.md)      | SSE plutôt que `onSnapshot` client pour le suivi temps réel | Accepté |
| [0004](./0004-un-seul-projet-gcp-multi-tenant.md)       | Un seul projet GCP multi-tenant                             | Accepté |
