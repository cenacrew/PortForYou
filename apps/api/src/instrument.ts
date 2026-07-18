// Initialise Sentry le plus tôt possible (avant le reste de l'app) pour capter
// les exceptions non gérées dès le démarrage. No-op si `SENTRY_DSN` est absent.
import { initSentry } from './observability/sentry.js';

initSentry();
