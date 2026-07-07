import dotenv from 'dotenv';
dotenv.config();

import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// Private key may contain literal \n in env; replace with real newlines
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

// Determine storage bucket early so it's available during initializeApp
const storageBucketNameInternal =
  process.env.FIREBASE_STORAGE_BUCKET ||
  (process.env.FIREBASE_STORAGE_EMULATOR_HOST
    ? `${projectId || 'portforyou-vsp'}.appspot.com`
    : projectId
      ? `${projectId}.app`
      : undefined);

let appInitialized = false;
if (!getApps().length) {
  try {
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      // Dev local : émulateur Firestore, aucun credential requis.
      initializeApp({
        projectId: projectId || 'portforyou-vsp',
        storageBucket: storageBucketNameInternal,
      });
      appInitialized = true;
      console.log(`🧪 Firestore émulateur (${process.env.FIRESTORE_EMULATOR_HOST})`);
    } else if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        storageBucket: storageBucketNameInternal,
      });
      appInitialized = true;
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      initializeApp({
        credential: applicationDefault(),
        storageBucket: storageBucketNameInternal,
      });
      appInitialized = true;
    } else if (projectId) {
      // Prod GCP (Cloud Run) : ADC fourni par le SA d'exécution via le serveur
      // de métadonnées — aucune clé ni GOOGLE_APPLICATION_CREDENTIALS requis.
      initializeApp({
        credential: applicationDefault(),
        projectId,
        storageBucket: storageBucketNameInternal,
      });
      appInitialized = true;
    } else {
      console.warn(
        '⚠️ Firebase credentials missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY or GOOGLE_APPLICATION_CREDENTIALS.',
      );
    }
  } catch (e) {
    console.error('Failed to initialize Firebase Admin:', e);
  }
} else {
  appInitialized = true;
}

export const db: Firestore | null = appInitialized ? getFirestore() : null;
export const storage: Storage | null = appInitialized ? getStorage() : null;
export const storageBucketName = storageBucketNameInternal;
