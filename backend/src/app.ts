import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import monitorRoutes from './routes/monitor.routes';
import alertRoutes from './routes/alert.routes';
import metricsRoutes from './routes/metrics.routes';
import { initializeDatabase } from './config/prisma';

const app = express();
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(cors());
app.use(express.json({ limit: '2mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(requestLogger);
}

app.get(['/', '/api', '/health', '/api/health'], (_req, res) => {
  res.status(200).json({
    service: 'sentinai-engine',
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
});

const monitorRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const xff = req.headers['x-forwarded-for'];
    if (xff) return (Array.isArray(xff) ? xff[0] : xff.split(',')[0]).trim();
    return (
      (req.headers['x-real-ip'] as string) ||
      req.socket?.remoteAddress ||
      '127.0.0.1'
    );
  },
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded on telemetry ingestion endpoint.',
  },
});


// Dual-mounted route aliasing to support both raw PDF paths (/monitor, /alerts) and REST /api/* prefixes
app.use('/monitor', monitorRateLimiter, monitorRoutes);
app.use('/api/monitor', monitorRateLimiter, monitorRoutes);

app.use('/alerts', alertRoutes);
app.use('/api/alerts', alertRoutes);

app.use('/metrics', metricsRoutes);
app.use('/api/metrics', metricsRoutes);

const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

app.use((req, res) => {
  if (
    req.method === 'GET' &&
    !req.path.startsWith('/api') &&
    fs.existsSync(path.join(frontendDistPath, 'index.html'))
  ) {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
    return;
  }

  res.status(404).json({
    error: 'Not Found',
    message:
      'Requested endpoint does not exist. Supported routes: POST /monitor, GET /alerts, PATCH /alerts/:id/resolve, GET /metrics.',
  });
});

app.use(errorHandler);

export default app;
