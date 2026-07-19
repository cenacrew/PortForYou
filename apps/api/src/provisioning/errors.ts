/**
 * Erreur dont le message est sûr à afficher tel quel à l'utilisateur (pas de
 * détail d'API GCP brut) — par opposition aux erreurs génériques du pipeline,
 * qui restent côté serveur et sont remplacées par un message passe-partout.
 */
export class ProvisioningUserError extends Error {}
