"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const requestLogger_1 = require("./middleware/requestLogger");
const errorHandler_1 = require("./middleware/errorHandler");
const monitor_routes_1 = __importDefault(require("./routes/monitor.routes"));
const alert_routes_1 = __importDefault(require("./routes/alert.routes"));
const metrics_routes_1 = __importDefault(require("./routes/metrics.routes"));
const app = (0, express_1.default)();
app.set('trust proxy', 1);
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false,
}));
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '2mb' }));
if (process.env.NODE_ENV !== 'test') {
    app.use(requestLogger_1.requestLogger);
}
app.get(['/', '/api', '/health', '/api/health'], (_req, res) => {
    res.status(200).json({
        service: 'sentinai-engine',
        status: 'operational',
        timestamp: new Date().toISOString(),
    });
});
const monitorRateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 240,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const xff = req.headers['x-forwarded-for'];
        if (xff)
            return (Array.isArray(xff) ? xff[0] : xff.split(',')[0]).trim();
        return (req.headers['x-real-ip'] ||
            req.socket?.remoteAddress ||
            '127.0.0.1');
    },
    message: {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded on telemetry ingestion endpoint.',
    },
});
// Dual-mounted route aliasing to support both raw PDF paths (/monitor, /alerts) and REST /api/* prefixes
app.use('/monitor', monitorRateLimiter, monitor_routes_1.default);
app.use('/api/monitor', monitorRateLimiter, monitor_routes_1.default);
app.use('/alerts', alert_routes_1.default);
app.use('/api/alerts', alert_routes_1.default);
app.use('/metrics', metrics_routes_1.default);
app.use('/api/metrics', metrics_routes_1.default);
const frontendDistPath = path_1.default.resolve(__dirname, '../../frontend/dist');
if (fs_1.default.existsSync(frontendDistPath)) {
    app.use(express_1.default.static(frontendDistPath));
}
app.use((req, res) => {
    if (req.method === 'GET' &&
        !req.path.startsWith('/api') &&
        fs_1.default.existsSync(path_1.default.join(frontendDistPath, 'index.html'))) {
        res.sendFile(path_1.default.join(frontendDistPath, 'index.html'));
        return;
    }
    res.status(404).json({
        error: 'Not Found',
        message: 'Requested endpoint does not exist. Supported routes: POST /monitor, GET /alerts, PATCH /alerts/:id/resolve, GET /metrics.',
    });
});
app.use(errorHandler_1.errorHandler);
exports.default = app;
