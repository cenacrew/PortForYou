import type { ProvisionerDriver, TenantSpec, DeployedUrls } from './driver.js';

// Délai par étape, réductible en test (PROVISIONER_FAKE_DELAY_MS=5).
const STEP_DELAY = Number(process.env.PROVISIONER_FAKE_DELAY_MS ?? 1000);
const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, (ms / 1000) * STEP_DELAY));

/**
 * Driver simulé pour le dev local : chaque étape prend 1 à 2 secondes pour
 * que le suivi temps réel du dashboard soit démontrable. Le seed Firestore,
 * lui, est réel (fait par le pipeline) — le tenant est donc réellement
 * visitable en local via l'instance Atelier (TENANT_ID=<slug>).
 */
export const fakeProvisionerDriver: ProvisionerDriver = {
  name: 'fake',

  async storeSecrets(_spec: TenantSpec) {
    await wait(1000);
  },

  async deployBackend(spec: TenantSpec) {
    await wait(2000);
    return { apiUrl: `http://localhost:8080/?tenant=${spec.slug}` };
  },

  async deployFrontend(spec: TenantSpec) {
    await wait(2000);
    return { frontUrl: `http://localhost:3100/?tenant=${spec.slug}` };
  },

  async checkHostingNameAvailable(_slug: string) {
    await wait(200);
    return { available: true };
  },

  async verify(_urls: DeployedUrls) {
    await wait(1000);
  },

  async deprovision(_slug: string) {
    await wait(500);
  },

  async rotateJwtSecret(_slug: string) {
    await wait(500);
  },
};
