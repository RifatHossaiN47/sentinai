import app from '../backend/src/app';
import { initializeDatabase } from '../backend/src/config/prisma';

let isInitialized = false;

export default async function handler(req: any, res: any) {
  if (!isInitialized) {
    await initializeDatabase();
    isInitialized = true;
  }
  return app(req, res);
}
