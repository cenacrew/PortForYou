import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { logger, httpLogger, levelToSeverity } from '../middleware/logger.js';
import { requestId } from '../middleware/requestId.js';

describe('logger pino', () => {
  it('mappe les niveaux pino vers les severity Google Cloud Logging', () => {
    expect(levelToSeverity('info')).toBe('INFO');
    expect(levelToSeverity('warn')).toBe('WARNING');
    expect(levelToSeverity('error')).toBe('ERROR');
    expect(levelToSeverity('debug')).toBe('DEBUG');
    expect(levelToSeverity('fatal')).toBe('CRITICAL');
    expect(levelToSeverity('inconnu')).toBe('DEFAULT');
  });

  it('expose une instance pino et un middleware HTTP', () => {
    expect(typeof httpLogger).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('ne casse pas la chaîne Express et préserve le request-id', async () => {
    const app = express();
    app.use(requestId);
    app.use(httpLogger);
    app.get('/ping', (_req, res) => res.json({ ok: true }));

    const res = await request(app).get('/ping').set('X-Cloud-Trace-Context', 'trace-abc/1;o=1');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.headers['x-request-id']).toBe('trace-abc');
  });
});
