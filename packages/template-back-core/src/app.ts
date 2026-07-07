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
import logger from './middleware/logger.js';
import { TENANT_ID, DEMO_MODE } from './lib/tenant.js';

dotenv.config();

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
app.use(logger);

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

app.use('/api/v1/auth/login', loginLimiter);
app.use('/api/v1/admin/uploads', uploadLimiter);
app.use('/api/v1/track', trackLimiter);
app.use('/api/v1/contact', contactLimiter);

app.get('/api/v1/health', (_req, res) =>
  res.json({ ok: true, tenant: TENANT_ID, demo: DEMO_MODE }),
);

app.use('/api/v1', trackRouter);
app.use('/api/v1', contactRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1', publicRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
