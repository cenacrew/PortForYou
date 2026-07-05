import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { Storage } from '@google-cloud/storage';
import { tenantServiceName } from '@portforyou/shared';
import type { ProvisionerDriver, TenantSpec, DeployedUrls } from './driver.js';
import { gfetch, assertOk, waitOperation, PROJECT, REGION } from './gcpClients.js';
import { db } from '../lib/firebase.js';
import { config } from '../config.js';

const RUN_API = `https://run.googleapis.com/v2`;
const HOSTING_API = `https://firebasehosting.googleapis.com/v1beta1`;
const SM_API = `https://secretmanager.googleapis.com/v1`;

const storage = new Storage({ projectId: PROJECT });

function hostingSiteId(slug: string) {
  return `pfy-${slug}`;
}

/** Crée (ou réutilise) un secret et y ajoute une version. */
async function upsertSecret(name: string, value: string) {
  const create = await gfetch(`${SM_API}/projects/${PROJECT}/secrets?secretId=${name}`, {
    method: 'POST',
    body: { replication: { automatic: {} } },
  });
  if (![200, 409].includes(create.status)) {
    assertOk(create, `Création du secret ${name}`);
  }
  const version = await gfetch(`${SM_API}/projects/${PROJECT}/secrets/${name}:addVersion`, {
    method: 'POST',
    body: { payload: { data: Buffer.from(value).toString('base64') } },
  });
  assertOk(version, `Ajout de version au secret ${name}`);
}

/**
 * Driver GCP : instancie un tenant sur le projet portforyou-vsp.
 * - back : service Cloud Run tenant-<slug> depuis l'image pré-construite
 * - front : site Firebase Hosting pfy-<slug> depuis le build statique GCS
 * - secrets : Secret Manager tenant-<slug>-*
 * Toutes les méthodes sont idempotentes.
 */
export const gcpProvisionerDriver: ProvisionerDriver = {
  name: 'gcp',

  async storeSecrets(spec: TenantSpec) {
    await upsertSecret(`tenant-${spec.slug}-admin-hash`, spec.adminPasswordHash);
    await upsertSecret(`tenant-${spec.slug}-jwt`, spec.jwtSecret);
  },

  async deployBackend(spec: TenantSpec): Promise<{ apiUrl: string }> {
    const serviceId = tenantServiceName(spec.slug);
    const parent = `projects/${PROJECT}/locations/${REGION}`;
    const image = config.TEMPLATE_IMAGE_PATTERN.replace('{template}', spec.templateSlug);

    const service = {
      template: {
        maxInstanceRequestConcurrency: 80,
        scaling: { minInstanceCount: 0, maxInstanceCount: 2 },
        containers: [
          {
            image,
            ports: [{ containerPort: 8080 }],
            resources: { limits: { cpu: '1', memory: '512Mi' } },
            env: [
              { name: 'TENANT_ID', value: spec.slug },
              { name: 'NODE_ENV', value: 'production' },
              { name: 'ADMIN_EMAIL', value: spec.adminEmail },
              { name: 'CORS_ORIGIN', value: `https://${hostingSiteId(spec.slug)}.web.app` },
              { name: 'FIREBASE_STORAGE_BUCKET', value: config.UPLOADS_BUCKET },
              {
                name: 'ADMIN_PASSWORD_HASH',
                valueSource: {
                  secretKeyRef: { secret: `tenant-${spec.slug}-admin-hash`, version: 'latest' },
                },
              },
              {
                name: 'JWT_SECRET',
                valueSource: {
                  secretKeyRef: { secret: `tenant-${spec.slug}-jwt`, version: 'latest' },
                },
              },
            ],
          },
        ],
      },
    };

    // Créer, ou mettre à jour si le service existe déjà (idempotence).
    const create = await gfetch(`${RUN_API}/${parent}/services?serviceId=${serviceId}`, {
      method: 'POST',
      body: service,
    });
    if (create.status === 200) {
      await waitOperation(String(create.json.name), 'https://run.googleapis.com/v2');
    } else if (create.status === 409) {
      const patch = await gfetch(`${RUN_API}/${parent}/services/${serviceId}`, {
        method: 'PATCH',
        body: service,
      });
      assertOk(patch, `Mise à jour du service ${serviceId}`);
      await waitOperation(String(patch.json.name), 'https://run.googleapis.com/v2');
    } else {
      assertOk(create, `Création du service ${serviceId}`);
    }

    // Accès public (l'API tenant gère sa propre auth applicative).
    const iam = await gfetch(`${RUN_API}/${parent}/services/${serviceId}:setIamPolicy`, {
      method: 'POST',
      body: { policy: { bindings: [{ role: 'roles/run.invoker', members: ['allUsers'] }] } },
    });
    assertOk(iam, `IAM public sur ${serviceId}`);

    const svc = await gfetch(`${RUN_API}/${parent}/services/${serviceId}`);
    assertOk(svc, `Lecture du service ${serviceId}`);
    return { apiUrl: String(svc.json.uri) };
  },

  async deployFrontend(spec: TenantSpec): Promise<{ frontUrl: string }> {
    const siteId = hostingSiteId(spec.slug);

    // 1. Créer le site Hosting (409 = déjà créé).
    const site = await gfetch(`${HOSTING_API}/projects/${PROJECT}/sites?siteId=${siteId}`, {
      method: 'POST',
      body: {},
    });
    if (![200, 409].includes(site.status)) assertOk(site, `Création du site Hosting ${siteId}`);

    // 2. Créer une version avec les rewrites /api/** → Cloud Run du tenant.
    const version = await gfetch(`${HOSTING_API}/sites/${siteId}/versions`, {
      method: 'POST',
      body: {
        config: {
          rewrites: [
            {
              glob: '/api/**',
              run: { serviceId: tenantServiceName(spec.slug), region: REGION },
            },
            { glob: '**', path: '/index.html' },
          ],
        },
      },
    });
    assertOk(version, `Création de version Hosting ${siteId}`);
    const versionName = String(version.json.name); // sites/{site}/versions/{v}

    // 3. Lister le build statique de la template depuis GCS et calculer les hashes.
    const [templateDoc] = await Promise.all([
      db.collection('templates').doc(spec.templateSlug).get(),
    ]);
    const buildVersion = (templateDoc.data()?.currentVersion as string) || 'latest';
    const prefix = `${spec.templateSlug}/${buildVersion}/`;
    const [files] = await storage.bucket(config.TEMPLATE_BUILDS_BUCKET).getFiles({ prefix });
    if (files.length === 0) {
      throw new Error(
        `Aucun artefact front dans gs://${config.TEMPLATE_BUILDS_BUCKET}/${prefix} — lancer release-templates`,
      );
    }

    const gzipped = new Map<string, { hash: string; content: Buffer }>();
    for (const file of files) {
      const [content] = await file.download();
      const gz = zlib.gzipSync(content, { level: 9 });
      const hash = crypto.createHash('sha256').update(gz).digest('hex');
      const sitePath = `/${file.name.slice(prefix.length)}`;
      gzipped.set(sitePath, { hash, content: gz });
    }

    // 4. populateFiles : Hosting indique quels hashes uploader.
    const populate = await gfetch(`${HOSTING_API}/${versionName}:populateFiles`, {
      method: 'POST',
      body: {
        files: Object.fromEntries([...gzipped].map(([path, { hash }]) => [path, hash])),
      },
    });
    assertOk(populate, `populateFiles ${siteId}`);

    const uploadUrl = String(populate.json.uploadUrl);
    const required = new Set((populate.json.uploadRequiredHashes as string[]) ?? []);
    const client = await import('google-auth-library').then(
      async (m) =>
        await new m.GoogleAuth({
          scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        }).getClient(),
    );
    const token = await client.getAccessToken();
    for (const { hash, content } of gzipped.values()) {
      if (!required.has(hash)) continue;
      const res = await fetch(`${uploadUrl}/${hash}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.token}`,
          'Content-Type': 'application/octet-stream',
        },
        body: new Uint8Array(content),
      });
      if (!res.ok) throw new Error(`Upload du fichier ${hash} échoué (${res.status})`);
    }

    // 5. Finaliser la version puis publier la release.
    const finalize = await gfetch(`${HOSTING_API}/${versionName}?updateMask=status`, {
      method: 'PATCH',
      body: { status: 'FINALIZED' },
    });
    assertOk(finalize, `Finalisation de version ${siteId}`);

    const release = await gfetch(
      `${HOSTING_API}/sites/${siteId}/releases?versionName=${versionName}`,
      { method: 'POST', body: {} },
    );
    assertOk(release, `Release Hosting ${siteId}`);

    return { frontUrl: `https://${siteId}.web.app` };
  },

  async verify(urls: DeployedUrls) {
    const deadline = Date.now() + 90000;
    const targets = [urls.frontUrl, `${urls.frontUrl}/api/v1/health`];
    for (const target of targets) {
      for (;;) {
        try {
          const res = await fetch(target);
          if (res.ok) break;
        } catch {
          /* réessaie */
        }
        if (Date.now() > deadline) throw new Error(`${target} ne répond pas (timeout 90 s)`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  },

  async deprovision(slug: string) {
    const serviceId = tenantServiceName(slug);
    const parent = `projects/${PROJECT}/locations/${REGION}`;

    const delService = await gfetch(`${RUN_API}/${parent}/services/${serviceId}`, {
      method: 'DELETE',
    });
    if (![200, 404].includes(delService.status)) {
      assertOk(delService, `Suppression du service ${serviceId}`);
    }

    const delSite = await gfetch(
      `${HOSTING_API}/projects/${PROJECT}/sites/${hostingSiteId(slug)}`,
      {
        method: 'DELETE',
      },
    );
    if (![200, 404].includes(delSite.status)) {
      assertOk(delSite, `Suppression du site Hosting pfy-${slug}`);
    }

    for (const suffix of ['admin-hash', 'jwt']) {
      const del = await gfetch(`${SM_API}/projects/${PROJECT}/secrets/tenant-${slug}-${suffix}`, {
        method: 'DELETE',
      });
      if (![200, 404].includes(del.status)) assertOk(del, `Suppression du secret ${suffix}`);
    }

    // Purge des données du tenant.
    await db.recursiveDelete(db.collection('tenants').doc(slug));
  },
};
