import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import publicRouter from './routes/public.js';
import ordersRouter from './routes/orders.js';
import paymentsRouter from './routes/payments.js';
import meRouter from './routes/me.js';
import adminRouter from './routes/admin.js';
import authRouter from './auth/routes.js';
import internalRouter from './routes/internal.js';

const app: express.Express = express();

app.set('etag', false);
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: config.WEB_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// Le webhook Stripe DOIT recevoir le raw body : monté avant express.json().
app.use('/api/v1', paymentsRouter);

app.use(express.json({ limit: '100kb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Trop de tentatives, réessayez dans quelques minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
const slugCheckLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Trop de demandes, réessayez dans quelques minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);
app.use('/api/v1/slugs/check', slugCheckLimiter);
app.use('/api/v1/contact', contactLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/forgot-password', authLimiter);
app.use('/api/v1/auth/reset-password', authLimiter);

app.use('/api/v1', authRouter);
app.use('/api/v1', publicRouter);
app.use('/api/v1', ordersRouter);
app.use('/api/v1', meRouter);
app.use('/api/v1', adminRouter);
app.use(internalRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Erreur interne' });
});

export default app;
