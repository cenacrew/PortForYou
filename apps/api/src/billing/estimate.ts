import { tenantServiceName } from '@portforyou/shared';
import { db } from '../lib/firebase.js';
import { config } from '../config.js';

/**
 * Estimation transparente du coût d'infrastructure d'un tenant, à partir de
 * métriques réelles (Cloud Monitoring + Storage) et des tarifs publics GCP.
 * La formule est volontairement simple et AFFICHÉE au client — c'est le
 * contrat de la tarification à l'usage.
 */

/** Tarifs publics GCP (europe-west1, EUR approx.) — ajustables sans redéploiement de schéma. */
export const GCP_RATES = {
  vcpuSecond: 0.0000255, // Cloud Run vCPU-seconde
  memGibSecond: 0.0000027, // Cloud Run GiB-seconde
  millionRequests: 0.38, // Cloud Run requêtes
  storageGbMonth: 0.021, // GCS standard
  egressGb: 0.11, // sortie réseau (approx.)
  avgPageWeightMb: 1.2, // poids moyen d'une page vue (estimation egress)
};

export interface CostBreakdown {
  computeEur: number;
  requestsEur: number;
  storageEur: number;
  egressEur: number;
  totalEur: number;
  method: 'gcp-monitoring' | 'estimation-locale';
  period: { start: string; end: string };
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Somme d'une métrique Cloud Run sur la période via l'API Monitoring. */
async function sumRunMetric(slug: string, metric: string, start: Date, end: Date) {
  const { gfetch, PROJECT } = await import('../provisioning/gcpClients.js');
  const filter = [
    `metric.type = "run.googleapis.com/${metric}"`,
    `resource.labels.service_name = "${tenantServiceName(slug)}"`,
  ].join(' AND ');
  const params = new URLSearchParams({
    filter,
    'interval.startTime': start.toISOString(),
    'interval.endTime': end.toISOString(),
    'aggregation.alignmentPeriod': `${Math.max(60, Math.floor((end.getTime() - start.getTime()) / 1000))}s`,
    'aggregation.perSeriesAligner': 'ALIGN_SUM',
    'aggregation.crossSeriesReducer': 'REDUCE_SUM',
  });
  const res = await gfetch(
    `https://monitoring.googleapis.com/v3/projects/${PROJECT}/timeSeries?${params}`,
  );
  if (res.status !== 200) return 0;
  const series = (res.json.timeSeries ?? []) as Array<{
    points?: Array<{
      value?: { doubleValue?: number; int64Value?: string; distributionValue?: { count?: string } };
    }>;
  }>;
  return series.reduce((total, serie) => {
    for (const point of serie.points ?? []) {
      total +=
        point.value?.doubleValue ??
        Number(point.value?.int64Value ?? point.value?.distributionValue?.count ?? 0);
    }
    return total;
  }, 0);
}

/** Taille (octets) des données du tenant dans le bucket d'uploads. */
async function tenantStorageBytes(slug: string): Promise<number> {
  const { Storage } = await import('@google-cloud/storage');
  const storage = new Storage({ projectId: config.GCP_PROJECT_ID });
  const [files] = await storage
    .bucket(config.UPLOADS_BUCKET)
    .getFiles({ prefix: `tenants/${slug}/` });
  return files.reduce((total, file) => total + Number(file.metadata.size ?? 0), 0);
}

/** Pages vues du tenant sur la période (analytics first-party). */
async function tenantPageViews(slug: string, start: Date, end: Date): Promise<number> {
  const snap = await db
    .collection('tenants')
    .doc(slug)
    .collection('analytics_daily')
    .where('__name__', '>=', start.toISOString().slice(0, 10))
    .where('__name__', '<=', end.toISOString().slice(0, 10))
    .get();
  return snap.docs.reduce((total, doc) => total + (doc.data().pageViews ?? 0), 0);
}

export async function estimateTenantCost(
  slug: string,
  start: Date,
  end: Date,
): Promise<CostBreakdown> {
  const period = {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
  const pageViews = await tenantPageViews(slug, start, end);
  const egressEur = ((pageViews * GCP_RATES.avgPageWeightMb) / 1024) * GCP_RATES.egressGb;

  if (config.PROVISIONER_DRIVER !== 'gcp') {
    // Dev/démo locale : estimation dérivée du seul trafic mesuré.
    const computeEur = pageViews * 0.0004;
    const requestsEur = ((pageViews * 3) / 1_000_000) * GCP_RATES.millionRequests;
    const storageEur = 0.01;
    return {
      computeEur: round2(computeEur),
      requestsEur: round2(requestsEur),
      storageEur,
      egressEur: round2(egressEur),
      totalEur: round2(computeEur + requestsEur + storageEur + egressEur),
      method: 'estimation-locale',
      period,
    };
  }

  const [instanceSeconds, requests, storageBytes] = await Promise.all([
    sumRunMetric(slug, 'container/billable_instance_time', start, end),
    sumRunMetric(slug, 'request_count', start, end),
    tenantStorageBytes(slug),
  ]);

  // Config des tenants : 1 vCPU / 512 Mi par instance.
  const computeEur = instanceSeconds * (GCP_RATES.vcpuSecond * 1 + GCP_RATES.memGibSecond * 0.5);
  const requestsEur = (requests / 1_000_000) * GCP_RATES.millionRequests;
  const monthShare = (end.getTime() - start.getTime()) / (30 * 24 * 3600 * 1000);
  const storageEur = (storageBytes / 1024 ** 3) * GCP_RATES.storageGbMonth * monthShare;

  return {
    computeEur: round2(computeEur),
    requestsEur: round2(requestsEur),
    storageEur: round2(storageEur),
    egressEur: round2(egressEur),
    totalEur: round2(computeEur + requestsEur + storageEur + egressEur),
    method: 'gcp-monitoring',
    period,
  };
}

/** Coût client total : (5 € + infra + 1 €) × 1,10 — la formule publique. */
export function clientMonthlyTotal(infraEur: number): number {
  return round2((5 + infraEur + 1) * 1.1);
}
