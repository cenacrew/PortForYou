# Registre des activités de traitement — Port'ForYou

Registre simplifié des traitements de données personnelles (RGPD art. 30), tenu
par le responsable de traitement. Ce document décrit ce que le code fait
réellement (voir `apps/api/src/`, `docs/ARCHITECTURE.md`) et doit rester cohérent
avec la [politique de confidentialité](../../apps/web/src/app/confidentialite/page.tsx)
publiée sur la vitrine.

- **Responsable de traitement** : Port'ForYou — projet étudiant (Ynov), non exploité commercialement, aucune immatriculation
- **Contact / référent RGPD** : valetnina.sp@gmail.com
- **Dernière mise à jour** : 2026-07-17

## Traitements

| #   | Traitement                             | Données concernées                                                                                                                                   | Où c'est stocké                                                            | Finalité                                                                    | Base légale                                            | Durée de conservation                                                                       | Sous-traitants                  |
| --- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------- |
| 1   | Comptes clients                        | Nom d'affichage, email, hash bcrypt du mot de passe, `provider` (password/google), rôle, date de création                                            | Firestore `users/{uid}`, `user_emails/{email}` (GCP europe-west1)          | Création et gestion du compte, authentification                             | Exécution du contrat                                   | Tant que le compte est actif ; anonymisation immédiate à la suppression du compte           | Google Cloud Platform           |
| 2   | Sessions & authentification            | Refresh tokens (hachés), tokens de reset / vérification email (hachés, usage unique)                                                                 | Firestore `sessions`, `password_resets`, `email_verifications`             | Maintien de session, réinitialisation de mot de passe, vérification d'email | Exécution du contrat ; intérêt légitime (sécurité)     | Purge automatique à expiration (TTL Firestore natif sur `expiresAt`)                        | Google Cloud Platform           |
| 3   | Commandes                              | uid, email client, template, slug, nom d'artiste, email de contact, statut, montants                                                                 | Firestore `orders/{orderId}`                                               | Passage et suivi de commande                                                | Exécution du contrat ; obligation légale (facturation) | 10 ans (obligations comptables/fiscales)                                                    | Google Cloud Platform           |
| 4   | Paiements & abonnement                 | Identifiant client Stripe (`stripeCustomerId`), identifiant d'abonnement, statut. **Aucune donnée de carte bancaire n'est stockée par Port'ForYou.** | Firestore `users/{uid}` (id technique) ; données de paiement chez Stripe   | Encaissement de l'abonnement, facturation à l'usage                         | Exécution du contrat ; obligation légale               | Chez Stripe selon ses obligations légales (10 ans pour les factures)                        | Stripe (traitement du paiement) |
| 5   | Sites tenants (contenu artiste)        | Œuvres, images, textes, biographie, coordonnées publiques renseignées par l'artiste, config du site                                                  | Firestore `tenants/{slug}/...`, Cloud Storage `tenants/{slug}/uploads/...` | Hébergement et affichage public du portfolio                                | Exécution du contrat                                   | Tant que le site est actif ; effacement définitif sous 30 jours après suppression du compte | Google Cloud Platform           |
| 6   | Statistiques d'audience des portfolios | Pages vues, comptages agrégés par jour, visiteurs uniques via hash journalier non réversible. **Aucune adresse IP conservée, aucun cookie.**         | Firestore `tenants/{slug}/analytics_daily/{date}`                          | Mesure d'audience du portfolio pour l'artiste                               | Intérêt légitime                                       | Agrégats journaliers conservés avec le site                                                 | Google Cloud Platform           |
| 7   | Emails transactionnels                 | Adresse email destinataire, contenu de l'email (confirmation de commande, site en ligne, reset de mot de passe, échec de paiement), journal d'envoi  | Resend (envoi) ; Firestore `email_logs` (journal)                          | Notifications liées au service                                              | Exécution du contrat                                   | Journal `email_logs` : 12 mois ; logs Resend selon sa politique                             | Resend (envoi d'emails)         |
| 8   | Formulaire de contact vitrine          | Nom, email, message                                                                                                                                  | Firestore `contact_requests`                                               | Traitement des demandes de devis / contact                                  | Intérêt légitime (répondre à une sollicitation)        | 12 mois après traitement                                                                    | Google Cloud Platform           |
| 9   | Journaux techniques & sécurité         | Logs applicatifs, identifiants de requête, événements de sécurité, idempotence des webhooks (`stripe_events`)                                        | Google Cloud Logging ; Firestore `stripe_events`                           | Exploitation, débogage, prévention de la fraude                             | Intérêt légitime                                       | 12 mois                                                                                     | Google Cloud Platform           |

## Droits des personnes et procédures

- **Accès / portabilité** : `GET /api/v1/me/account/export` (endpoint authentifié, ownership strict par `uid`) — export JSON du profil, des sites et des commandes du user. Déclenchable depuis le dashboard (page Profil).
- **Effacement** : `DELETE /api/v1/me/account` — anonymisation du profil (email et nom supprimés), révocation de toutes les sessions, suspension des sites puis effacement définitif sous 30 jours. Les données de facturation légalement obligatoires sont conservées (chez Stripe notamment).
- **Rectification** : sur demande via le contact RGPD.

## Sous-traitants (récapitulatif)

| Sous-traitant         | Rôle                                         | Localisation                       | Encadrement des transferts                                      |
| --------------------- | -------------------------------------------- | ---------------------------------- | --------------------------------------------------------------- |
| Google Cloud Platform | Hébergement, base de données, stockage, logs | Région europe-west1 (Belgique, UE) | Traitement dans l'UE ; CCT pour tout transfert éventuel hors UE |
| Stripe                | Traitement des paiements et de l'abonnement  | UE / hors UE                       | Clauses contractuelles types (CCT)                              |
| Resend                | Envoi des emails transactionnels             | Hors UE                            | Clauses contractuelles types (CCT)                              |

## Sécurité (rappel)

Mesures techniques en place (détail dans `docs/SECURITY.md`) : règles Firestore
deny-all (accès uniquement via l'Admin SDK côté serveur), mots de passe hachés
(bcrypt), JWT courts + refresh tokens rotatifs avec détection de réutilisation,
secrets en Secret Manager (jamais dans le repo), authentification CI par Workload
Identity Federation, chiffrement au repos et en transit assurés par GCP.
