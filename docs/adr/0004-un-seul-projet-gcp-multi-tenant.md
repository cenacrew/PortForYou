# 0004 — Un seul projet GCP multi-tenant

**Statut** : Accepté

## Contexte

Chaque client Port'ForYou achète un site déployé (front + back + back-office).
Le modèle de provisioning doit décider comment isoler ces sites entre eux au
niveau infrastructure GCP, sachant que l'objectif produit est un délai
« paiement → site en ligne » de quelques minutes (`<3min` visé,
`PortForYou.md`), sans build au moment du provisioning, et sans achat de nom
de domaine par client (sous-domaines `pfy-<slug>.web.app`).

## Options considérées

- **Un projet GCP par client** : isolation maximale (facturation, IAM, quotas
  strictement séparés par tenant), mais coût opérationnel qui grossit
  linéairement avec le nombre de clients (setup IAM, budgets, monitoring à
  dupliquer par projet), et incompatible avec l'objectif de provisioning en
  quelques minutes (la création d'un projet GCP et son câblage IAM/Secret
  Manager/Cloud Run ne sont pas instantanés).
- **Un projet GCP partagé, isolation par ressource/namespace** : un seul
  projet (`portforyou-vsp`), chaque tenant = un service Cloud Run
  (`tenant-<slug>`) + un site Firebase Hosting (`pfy-<slug>.web.app`) + un
  namespace Firestore (`tenants/{slug}/...`) + des secrets préfixés
  (`tenant-<slug>-admin-hash`, `tenant-<slug>-jwt`) dans le même Secret
  Manager. Le provisioning se réduit à instancier des ressources dans un
  projet déjà configuré, à partir d'artefacts (images Docker, builds
  statiques) **pré-construits par la CI** — jamais de build au moment du
  provisioning.

## Décision

**Un seul projet GCP partagé** (`portforyou-vsp`, région `europe-west1`).
Aucun projet par client, aucun achat de domaine. L'isolation entre tenants
se fait au niveau applicatif : une image Docker par template paramétrée par
la variable d'env `TENANT_ID` (toutes les lectures/écritures Firestore et
Storage sont préfixées `tenants/{TENANT_ID}/...`, voir
`packages/template-back-core/src/lib/tenant.ts`), un service Cloud Run et un
site Hosting par tenant, mais un unique build statique par template servant
tous ses tenants (URLs relatives `/api/v1`, routage par le rewrite Firebase
Hosting vers le Cloud Run du tenant).

## Conséquences

- Provisioning rapide : créer un site = instancier des ressources dans un
  projet déjà provisionné (IAM, réseau, monitoring en place), pas créer un
  projet — condition nécessaire à l'objectif « <3min à live ».
- Coût et effort opérationnel qui ne grossissent pas linéairement avec le
  nombre de clients : un seul dashboard Cloud Monitoring, une seule
  politique de sauvegarde Firestore, un seul budget à surveiller (avec
  agrégat + détail par tenant plutôt que par projet).
- Isolation entre tenants dépendante de la discipline applicative
  (préfixage systématique `TENANT_ID`) plutôt que d'une frontière GCP dure —
  compensé par des tests dédiés (IDOR, ownership) et le fait qu'aucune
  requête client n'atteint directement Firestore (deny-all, voir ADR-0003).
- IAM à moindre privilège nécessaire malgré le partage : 3 service accounts
  dédiés (`pfy-api`, `pfy-ci`, WIF) avec rôles strictement scopés plutôt que
  la séparation naturelle qu'offrirait un projet par client.
- Un incident de configuration au niveau projet (ex. IAM mal scopé) a un
  rayon d'impact plus large que dans un modèle par-projet — mitigé par le
  pentest du flow de provisioning (`pentest.provisioning.int.test.ts`) et la
  checklist sécurité (`docs/SECURITY.md`).
