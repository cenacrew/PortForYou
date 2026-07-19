export interface TenantSpec {
  slug: string;
  templateSlug: string;
  adminEmail: string;
  adminPasswordHash: string;
  jwtSecret: string;
}

export interface DeployedUrls {
  frontUrl: string;
  apiUrl: string;
}

/**
 * Abstraction du provisioning : `fake` simule tout en local, `gcp` crée les
 * vraies ressources (Cloud Run + Firebase Hosting + Secret Manager).
 * Chaque méthode doit être idempotente (re-jouable après échec).
 */
export interface ProvisionerDriver {
  readonly name: string;
  /** Stocke les secrets du tenant (Secret Manager en prod). */
  storeSecrets(spec: TenantSpec): Promise<void>;
  /** Déploie le back du tenant (service Cloud Run tenant-<slug>). */
  deployBackend(spec: TenantSpec): Promise<{ apiUrl: string }>;
  /** Déploie le front du tenant (site Firebase Hosting pfy-<slug>). */
  deployFrontend(spec: TenantSpec): Promise<{ frontUrl: string }>;
  /**
   * Vérifie que le nom de site Firebase Hosting pfy-<slug> est disponible.
   * Les ID de site Hosting sont uniques sur TOUT Firebase (pas seulement ce
   * projet) : un slug jamais utilisé côté PortForYou peut donc déjà être pris
   * par un projet Firebase tiers. Appelé à la réservation du slug (avant
   * paiement) pour échouer tôt plutôt qu'en plein provisioning.
   */
  checkHostingNameAvailable(slug: string): Promise<{ available: boolean; reason?: string }>;
  /** Vérifie que le site répond (poll avec timeout). */
  verify(urls: DeployedUrls): Promise<void>;
  /** Supprime toutes les ressources du tenant. */
  deprovision(slug: string): Promise<void>;
  /**
   * Fait tourner le secret de signature JWT du back-office du tenant (session
   * uniquement) et force le rechargement de la nouvelle version — le mot de
   * passe admin n'est jamais touché ici (rotation manuelle, via régénération
   * côté dashboard, pour ne pas couper l'accès de l'artiste sans le prévenir).
   */
  rotateJwtSecret(slug: string): Promise<void>;
}
