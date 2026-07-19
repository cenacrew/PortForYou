import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { FieldValue } from 'firebase-admin/firestore';
import {
  DEPLOYMENT_STEP_IDS,
  DEPLOYMENT_STEP_LABELS,
  type DeploymentStepId,
} from '@portforyou/shared';
import { deploymentsCol, sitesCol } from '../lib/firebase.js';
import type { ProvisionerDriver } from './driver.js';
import { seedTenant } from './seed.js';
import { sendMail, siteLiveEmail, deploymentFailedEmail } from '../emails/mailer.js';
import { ProvisioningUserError } from './errors.js';

interface SiteData {
  uid: string;
  slug: string;
  templateSlug: string;
  artistName: string;
  contactEmail: string;
  clientEmail: string;
}

function initialSteps() {
  return DEPLOYMENT_STEP_IDS.map((id) => ({
    id,
    label: DEPLOYMENT_STEP_LABELS[id],
    status: 'pending' as const,
  }));
}

/**
 * Crée un déploiement puis lance le provisioning : via Cloud Tasks en prod
 * (retries/backoff) ou en tâche de fond en local. Utilisé par la commande
 * initiale ET par le retry d'un site en échec (même slug, reprise du pipeline
 * idempotent). Retourne l'id du déploiement à suivre en SSE.
 */
export async function dispatchProvisioning(
  siteId: string,
  uid: string,
  trigger: string,
): Promise<string> {
  const deployId = await createDeployment(siteId, uid, trigger);
  const { config } = await import('../config.js');
  if (config.PROVISIONING_VIA_TASKS) {
    const { enqueueProvisioning } = await import('./tasks.js');
    await enqueueProvisioning(siteId, deployId);
  } else {
    const { getProvisionerDriver } = await import('./index.js');
    const driver = await getProvisionerDriver();
    void runProvisioning(driver, siteId, deployId);
  }
  return deployId;
}

/** Crée le document deployments/{id} et retourne son id. */
export async function createDeployment(siteId: string, uid: string, trigger: string) {
  const ref = await deploymentsCol().add({
    siteId,
    uid,
    trigger,
    status: 'running',
    steps: initialSteps(),
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

async function setStep(
  deployId: string,
  stepId: DeploymentStepId,
  status: 'running' | 'done' | 'failed',
  error?: string,
) {
  const ref = deploymentsCol().doc(deployId);
  const snap = await ref.get();
  const steps = (snap.data()?.steps ?? []) as Array<Record<string, unknown>>;
  const now = new Date().toISOString();
  const updated = steps.map((step) =>
    step.id === stepId
      ? {
          ...step,
          status,
          ...(status === 'running' ? { startedAt: now } : { finishedAt: now }),
          ...(error ? { error } : {}),
        }
      : step,
  );
  await ref.update({ steps: updated, updatedAt: FieldValue.serverTimestamp() });
}

/**
 * Exécute le pipeline de provisioning d'un site, étape par étape, en mettant
 * à jour deployments/{deployId} (suivi temps réel du dashboard) puis
 * sites/{siteId}. Chaque étape est idempotente : un retry re-déroule le
 * pipeline et saute ce qui existe déjà.
 */
export async function runProvisioning(
  driver: ProvisionerDriver,
  siteId: string,
  deployId: string,
): Promise<void> {
  const siteRef = sitesCol().doc(siteId);
  const site = (await siteRef.get()).data() as SiteData | undefined;
  if (!site) throw new Error(`Site ${siteId} introuvable`);

  // Généré à chaque run : le mot de passe n'est jamais stocké en clair,
  // seul le hash part dans les secrets du tenant.
  const adminPassword = crypto.randomBytes(9).toString('base64url');
  const spec = {
    slug: site.slug,
    templateSlug: site.templateSlug,
    adminEmail: site.clientEmail,
    adminPasswordHash: bcrypt.hashSync(adminPassword, 10),
    jwtSecret: crypto.randomBytes(32).toString('hex'),
  };

  let current: DeploymentStepId = 'validation';
  try {
    await setStep(deployId, 'validation', 'running');
    if (!site.slug || !site.templateSlug) throw new Error('Commande incomplète');
    await setStep(deployId, 'validation', 'done');

    current = 'database';
    await setStep(deployId, current, 'running');
    await seedTenant(site.slug, site.artistName, site.contactEmail);
    await setStep(deployId, current, 'done');

    current = 'secrets';
    await setStep(deployId, current, 'running');
    await driver.storeSecrets(spec);
    await setStep(deployId, current, 'done');

    current = 'backend';
    await setStep(deployId, current, 'running');
    const { apiUrl } = await driver.deployBackend(spec);
    await setStep(deployId, current, 'done');

    current = 'frontend';
    await setStep(deployId, current, 'running');
    const { frontUrl } = await driver.deployFrontend(spec);
    await setStep(deployId, current, 'done');

    current = 'checks';
    await setStep(deployId, current, 'running');
    await driver.verify({ frontUrl, apiUrl });
    await setStep(deployId, current, 'done');

    current = 'finalize';
    await setStep(deployId, current, 'running');
    await siteRef.update({
      status: 'live',
      urls: { front: frontUrl, api: apiUrl, backOffice: `${frontUrl}/admin/login` },
      adminEmail: site.clientEmail,
      liveAt: FieldValue.serverTimestamp(),
    });
    await deploymentsCol().doc(deployId).update({ status: 'done' });
    await setStep(deployId, current, 'done');

    const mail = siteLiveEmail({
      artistName: site.artistName,
      frontUrl,
      adminEmail: site.clientEmail,
      adminPassword,
    });
    await sendMail({ to: site.clientEmail, type: 'site_live', ...mail });
  } catch (err) {
    // Le détail (souvent une réponse d'API GCP) reste côté serveur : il ne doit
    // jamais fuiter au client via le flux SSE. Exception : ProvisioningUserError,
    // dont le message est spécifiquement rédigé pour être sûr et actionnable
    // (ex. nom de site Hosting déjà pris ailleurs) — dans ce cas on l'affiche
    // tel quel plutôt que le message générique, sinon l'échec reste un mystère
    // même après plusieurs tentatives de relance.
    console.error(`Provisioning de ${site.slug} échoué à l'étape ${current}:`, err);
    const stepError =
      err instanceof ProvisioningUserError
        ? err.message
        : 'Cette étape a échoué. Vous pouvez relancer le déploiement ; si le problème persiste, contactez le support.';
    await setStep(deployId, current, 'failed', stepError);
    await deploymentsCol().doc(deployId).update({ status: 'failed' });
    await siteRef.update({ status: 'error' });
    const mail = deploymentFailedEmail(site.artistName, site.slug);
    await sendMail({ to: site.clientEmail, type: 'deployment_failed', ...mail });
  }
}
