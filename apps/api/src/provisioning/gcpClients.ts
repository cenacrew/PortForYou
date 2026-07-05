import { GoogleAuth } from 'google-auth-library';
import { config } from '../config.js';

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

/** fetch authentifié (ADC : service account Cloud Run en prod, gcloud en local). */
export async function gfetch(
  url: string,
  init: { method?: string; body?: unknown } = {},
): Promise<{ status: number; json: Record<string, unknown> }> {
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const res = await fetch(url, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    },
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

export function assertOk(
  result: { status: number; json: Record<string, unknown> },
  context: string,
  okStatuses: number[] = [200],
): void {
  if (!okStatuses.includes(result.status)) {
    throw new Error(
      `${context} → HTTP ${result.status}: ${JSON.stringify(result.json).slice(0, 500)}`,
    );
  }
}

/** Poll une opération longue (LRO) jusqu'à `done`. */
export async function waitOperation(opName: string, baseUrl: string, timeoutMs = 180000) {
  const start = Date.now();
  for (;;) {
    const res = await gfetch(`${baseUrl}/${opName}`);
    if (res.json.done === true) {
      if (res.json.error) throw new Error(`Opération échouée: ${JSON.stringify(res.json.error)}`);
      return res.json;
    }
    if (Date.now() - start > timeoutMs) throw new Error(`Timeout sur l'opération ${opName}`);
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

export const PROJECT = config.GCP_PROJECT_ID;
export const REGION = config.GCP_REGION;
