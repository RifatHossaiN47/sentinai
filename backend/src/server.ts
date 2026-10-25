import app from './app';
import { env } from './config/env';
import { initializeDatabase, prisma } from './config/prisma';

async function bootstrap() {
  const port = Number(process.env.PORT) || env.PORT || 5000;

  const server = app.listen(port, '0.0.0.0', () => {
    const aiMode = env.GEMINI_API_KEY
      ? `Google Gemini (${env.GEMINI_MODEL})`
      : 'Deterministic SRE Rule Engine (Fallback Active)';

    console.log('──────────────────────────────────────────────────────────');
    console.log(` SentinAI Monitoring Engine listening on 0.0.0.0:${port}`);
    console.log(` AI Triage Mode : ${aiMode}`);
    console.log(` Ingestion API  : /monitor or /api/monitor`);
    console.log(` Active Alerts  : /alerts or /api/alerts`);
    console.log(` Health Metrics : /metrics or /api/metrics`);
    console.log('──────────────────────────────────────────────────────────');
  });

  // Provision default endpoints asynchronously in background so server listens in <50ms
  initializeDatabase().catch((err) => {
    console.warn('[Database] Async init error:', (err as Error).message);
  });

  const shutdown = async () => {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((err) => {
  console.error('[Fatal Startup Error]', err);
  process.exit(1);
});

export default app;
// @ts-ignore
module.exports = app;
// @ts-ignore
module.exports.default = app;



