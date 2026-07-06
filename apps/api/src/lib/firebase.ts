import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { config } from '../config.js';

if (!getApps().length) {
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    // Dev local : émulateur Firestore, aucun credential requis.
    initializeApp({ projectId: config.GCP_PROJECT_ID });
    console.log(`🧪 Firestore émulateur (${process.env.FIRESTORE_EMULATOR_HOST})`);
  } else {
    // Prod (Cloud Run) : Application Default Credentials.
    initializeApp({ credential: applicationDefault(), projectId: config.GCP_PROJECT_ID });
  }
}

export const db: Firestore = getFirestore();

export const usersCol = () => db.collection('users');
export const ordersCol = () => db.collection('orders');
export const sitesCol = () => db.collection('sites');
export const deploymentsCol = () => db.collection('deployments');
export const slugsCol = () => db.collection('slugs');
export const stripeEventsCol = () => db.collection('stripe_events');
export const emailLogsCol = () => db.collection('email_logs');
export const contactRequestsCol = () => db.collection('contact_requests');
export const templatesCol = () => db.collection('templates');
export const tenantDoc = (slug: string) => db.collection('tenants').doc(slug);
