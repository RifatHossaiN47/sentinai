import { PrismaClient } from '@prisma/client';
import './env';
import { DEFAULT_ENDPOINTS } from './defaults';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

let _prismaInstance: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!_prismaInstance) {
    _prismaInstance =
      globalForPrisma.prisma ??
      new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
      });

    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = _prismaInstance;
    }
  }
  return _prismaInstance;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrisma();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

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
