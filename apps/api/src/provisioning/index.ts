import type { ProvisionerDriver } from './driver.js';
import { fakeProvisionerDriver } from './fake.js';
import { config } from '../config.js';

let cached: ProvisionerDriver | null = null;

/**
 * Import paresseux du driver gcp : il tire google-auth-library et
 * @google-cloud/storage, inutiles (et non configurés) en dev local.
 */
export async function getProvisionerDriver(): Promise<ProvisionerDriver> {
  if (config.PROVISIONER_DRIVER !== 'gcp') return fakeProvisionerDriver;
  if (!cached) {
    const { gcpProvisionerDriver } = await import('./gcp.js');
    cached = gcpProvisionerDriver;
  }
  return cached;
}
