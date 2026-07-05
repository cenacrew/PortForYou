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
  /** Vérifie que le site répond (poll avec timeout). */
  verify(urls: DeployedUrls): Promise<void>;
  /** Supprime toutes les ressources du tenant. */
  deprovision(slug: string): Promise<void>;
}
