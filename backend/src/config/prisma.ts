import { PrismaClient } from '@prisma/client';
import './env';
import { DEFAULT_ENDPOINTS } from './defaults';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function initializeDatabase(): Promise<void> {
  try {
    const count = await prisma.apiEndpoint.count();
    if (count === 0) {
      for (const endpoint of DEFAULT_ENDPOINTS) {
        await prisma.apiEndpoint.upsert({
          where: { name: endpoint.name },
          update: {},
          create: endpoint,
        });
      }
    }
  } catch (err) {
    console.warn('[Database] Initialization warning:', (err as Error).message);
  }
}
