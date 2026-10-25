"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const prisma_1 = require("./config/prisma");
async function bootstrap() {
    const port = Number(process.env.PORT) || env_1.env.PORT || 5000;
    const server = app_1.default.listen(port, '0.0.0.0', () => {
        const aiMode = env_1.env.GEMINI_API_KEY
            ? `Google Gemini (${env_1.env.GEMINI_MODEL})`
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
    (0, prisma_1.initializeDatabase)().catch((err) => {
        console.warn('[Database] Async init error:', err.message);
    });
    const shutdown = async () => {
        server.close(async () => {
            await prisma_1.prisma.$disconnect();
            process.exit(0);
        });
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}
if (!process.env.VERCEL) {
    bootstrap().catch((err) => {
        console.error('[Fatal Startup Error]', err);
        process.exit(1);
    });
}
exports.default = app_1.default;
