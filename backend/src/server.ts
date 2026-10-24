import app from './app';
import { env } from './config/env';
import { initializeDatabase, prisma } from './config/prisma';

async function bootstrap() {
  await initializeDatabase();

  const server = app.listen(env.PORT, () => {
    const aiMode = env.GEMINI_API_KEY
      ? `Google Gemini (${env.GEMINI_MODEL})`
      : 'Deterministic SRE Rule Engine (Fallback Active)';

    console.log('──────────────────────────────────────────────────────────');
    console.log(` SentinAI Monitoring Engine listening on port ${env.PORT}`);
    console.log(` AI Triage Mode : ${aiMode}`);
    console.log(` Ingestion API  : http://localhost:${env.PORT}/monitor`);
    console.log(` Active Alerts  : http://localhost:${env.PORT}/alerts`);
    console.log(` Health Metrics : http://localhost:${env.PORT}/metrics`);
    console.log('──────────────────────────────────────────────────────────');
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
