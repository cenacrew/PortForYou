/**
 * Crée les tenants de démo (demo-atelier, demo-monolith, demo-papier) :
 * contenu seedé + slug réservé + document site rattaché à l'admin.
 *
 * Local  : FIRESTORE_EMULATOR_HOST=localhost:8090 pnpm --filter @portforyou/api seed-demos
 * GCP    : PROVISIONER_DRIVER=gcp pnpm --filter @portforyou/api seed-demos
 *          (déploie réellement les instances ; DEMO_MODE=1 est posé sur leurs services)
 *
 * Une fois live, renseigner `demoUrl` dans apps/web/src/lib/templates.ts et
 * apps/api/src/routes/public.ts.
 */
import { FieldValue } from 'firebase-admin/firestore';
import { db, sitesCol, slugsCol } from '../src/lib/firebase.js';
import { seedTenant } from '../src/provisioning/seed.js';
import { createDeployment, runProvisioning } from '../src/provisioning/pipeline.js';
import { getProvisionerDriver } from '../src/provisioning/index.js';
import { config } from '../src/config.js';

const TEMPLATES = ['atelier', 'monolith', 'papier'] as const;
const DEMO_OWNER_UID = 'platform-demo';

for (const template of TEMPLATES) {
  const slug = `demo-${template}`;
  console.log(`▶ Tenant démo ${slug}…`);

  await seedTenant(slug, 'Prénom Nom', 'demo@portforyou.example');
  await slugsCol().doc(slug).set({ status: 'confirmed', uid: DEMO_OWNER_UID, demo: true });

  const existing = await sitesCol().where('slug', '==', slug).limit(1).get();
  let siteId: string;
  if (existing.empty) {
    const ref = await sitesCol().add({
      uid: DEMO_OWNER_UID,
      slug,
      templateSlug: template,
      artistName: 'Prénom Nom',
      contactEmail: 'demo@portforyou.example',
      clientEmail: 'demo@portforyou.example',
      status: config.PROVISIONER_DRIVER === 'gcp' ? 'provisioning' : 'live',
      demo: true,
      createdAt: FieldValue.serverTimestamp(),
    });
    siteId = ref.id;
  } else {
    siteId = existing.docs[0]!.id;
  }

  if (config.PROVISIONER_DRIVER === 'gcp') {
    const deployId = await createDeployment(siteId, DEMO_OWNER_UID, 'demo-seed');
    await runProvisioning(await getProvisionerDriver(), siteId, deployId);
    const site = await sitesCol().doc(siteId).get();
    console.log(`  → ${site.data()?.status} : ${site.data()?.urls?.front ?? 'n/a'}`);
    console.log('  ⚠️  Ajouter DEMO_MODE=1 sur le service Cloud Run tenant-' + slug);
  } else {
    console.log(`  → seedé dans l'émulateur (visitable via TENANT_ID=${slug})`);
  }
}

await db.terminate();
console.log('✅ Tenants démo prêts.');
