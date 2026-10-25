import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1).default('postgresql://neondb_owner:npg_wy9XhilgfY8p@ep-flat-thunder-a11tbbv1.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=15'),
  DIRECT_URL: z.string().optional().default('postgresql://neondb_owner:npg_wy9XhilgfY8p@ep-flat-thunder-a11tbbv1.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=15'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-3.5-flash-lite'),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(6000),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  ALERT_RECEIVER_EMAIL: z.string().email().default('rifat8851@gmail.com'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.warn('[Config] Invalid environment variables detected, applying safe defaults:', parsedEnv.error.flatten().fieldErrors);
}

export const env = parsedEnv.success
  ? parsedEnv.data
  : envSchema.parse({});
