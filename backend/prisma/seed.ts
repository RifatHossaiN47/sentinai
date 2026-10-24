import { prisma } from '../src/config/prisma';
import { DEFAULT_ENDPOINTS } from '../src/config/defaults';

async function main() {
  for (const endpoint of DEFAULT_ENDPOINTS) {
    await prisma.apiEndpoint.upsert({
      where: { name: endpoint.name },
      update: {
        description: endpoint.description,
        target_url: endpoint.target_url,
        is_critical: endpoint.is_critical,
        sla_latency_ms: endpoint.sla_latency_ms,
      },
      create: endpoint,
    });
  }
  console.log(`[Seed] Provisioned ${DEFAULT_ENDPOINTS.length} healthcare microservice endpoints.`);
}

main()
  .catch((err) => {
    console.error('[Seed Error]', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
