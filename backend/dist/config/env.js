"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    PORT: zod_1.z.coerce.number().int().positive().default(5000),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: zod_1.z.string().min(1).default('postgresql://neondb_owner:npg_wy9XhilgfY8p@ep-flat-thunder-a11tbbv1.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=15'),
    DIRECT_URL: zod_1.z.string().optional().default('postgresql://neondb_owner:npg_wy9XhilgfY8p@ep-flat-thunder-a11tbbv1.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=15'),
    GEMINI_API_KEY: zod_1.z.string().optional().default(''),
    GEMINI_MODEL: zod_1.z.string().default('gemini-3.5-flash-lite'),
    AI_TIMEOUT_MS: zod_1.z.coerce.number().int().positive().default(6000),
    SMTP_HOST: zod_1.z.string().optional().default(''),
    SMTP_PORT: zod_1.z.coerce.number().int().positive().default(587),
    SMTP_USER: zod_1.z.string().optional().default(''),
    SMTP_PASS: zod_1.z.string().optional().default(''),
    ALERT_RECEIVER_EMAIL: zod_1.z.string().email().default('rifat8851@gmail.com'),
});
const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
    console.warn('[Config] Invalid environment variables detected, applying safe defaults:', parsedEnv.error.flatten().fieldErrors);
}
exports.env = parsedEnv.success
    ? parsedEnv.data
    : envSchema.parse({});
