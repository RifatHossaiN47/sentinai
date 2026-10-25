"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const statusTag = status >= 500 ? 'ERR' : status >= 400 ? 'WARN' : 'OK';
        console.log(`[${new Date().toISOString()}] [${statusTag}] ${req.method} ${req.originalUrl || req.url} ${status} ${duration}ms`);
    });
    next();
};
exports.requestLogger = requestLogger;
