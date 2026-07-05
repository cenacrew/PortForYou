import { gfetch, assertOk, PROJECT, REGION } from './gcpClients.js';
import { config } from '../config.js';

/**
 * Enqueue le provisioning dans Cloud Tasks (queue `provisioning`).
 * La tâche appelle POST /internal/provision avec un token OIDC du service
 * account de l'API — retries et backoff gérés par la queue.
 */
export async function enqueueProvisioning(siteId: string, deployId: string): Promise<void> {
  const queue = `projects/${PROJECT}/locations/${REGION}/queues/provisioning`;
  const res = await gfetch(`https://cloudtasks.googleapis.com/v2/${queue}/tasks`, {
    method: 'POST',
    body: {
      task: {
        httpRequest: {
          httpMethod: 'POST',
          url: `${config.API_PUBLIC_URL}/internal/provision`,
          headers: { 'Content-Type': 'application/json' },
          body: Buffer.from(JSON.stringify({ siteId, deployId })).toString('base64'),
          oidcToken: {
            serviceAccountEmail: config.TASKS_SERVICE_ACCOUNT,
            audience: config.API_PUBLIC_URL,
          },
        },
        dispatchDeadline: '900s',
      },
    },
  });
  assertOk(res, 'Enqueue Cloud Tasks provisioning');
}
