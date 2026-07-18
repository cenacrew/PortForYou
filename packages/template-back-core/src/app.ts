import type { Server } from 'node:http';
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import publicRouter from './routes/public.js';
import trackRouter from './routes/track.js';
import contactRouter from './routes/contact.js';
import seoRouter from './routes/seo.js';
import { httpLogger } from './middleware/logger.js';
import { requestId } from './middleware/requestId.js';
import { installGracefulShutdown } from './lib/shutdown.js';
import { TENANT_ID, DEMO_MODE } from './lib/tenant.js';
import { initSentry, captureRequestException } from './lib/sentry.js';

dotenv.config();

// Error tracking : no-op si SENTRY_DSN absent (dev/CI), avant tout le reste.
initSentry();

const app: Express = express();

app.set('etag', false);
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json());
app.use(requestId);
// Logs HTTP structurés (pino) : request-id AVANT le logger pour la corrélation.
app.use(httpLogger);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de tentatives de connexion, réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Trop de requêtes, veuillez ralentir.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const trackLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Trop de messages envoyés, réessayez plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Borne les écritures admin (artworks, site-config…) en plus du cas upload.
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Trop de requêtes, veuillez ralentir.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/v1/auth/login', loginLimiter);
app.use('/api/v1/admin', adminLimiter);
app.use('/api/v1/admin/uploads', uploadLimiter);
app.use('/api/v1/track', trackLimiter);
app.use('/api/v1/contact', contactLimiter);

app.get('/api/v1/health', (_req, res) =>
  res.json({ ok: true, tenant: TENANT_ID, demo: DEMO_MODE }),
);

// SEO servi à la racine (hors /api) : le rewrite Firebase Hosting route
// /sitemap.xml et /robots.txt vers ce service (voir apps/api/src/provisioning).
app.use(seoRouter);

app.use('/api/v1', trackRouter);
app.use('/api/v1', contactRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1', publicRouter);

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  console.error(`Unhandled error [${req.requestId ?? '-'}]:`, err);
  captureRequestException(err, req);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal server error', requestId: req.requestId });
});

/**
 * Démarre le serveur avec arrêt gracieux (SIGTERM Cloud Run). Utilisé par les
 * wrappers plain-JS des templates pour rester à ~2 lignes tout en héritant du
 * drain des requêtes en vol.
 */
export function startServer(port: number = Number(process.env.PORT) || 8080): Server {
  const server = app.listen(port, () => console.log(`✅ Server running on port ${port}`));
  installGracefulShutdown(server);
  return server;
}

export default app;
