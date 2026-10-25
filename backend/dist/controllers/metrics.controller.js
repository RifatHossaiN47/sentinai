"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemMetrics = getSystemMetrics;
const prisma_1 = require("../config/prisma");
const env_1 = require("../config/env");
async function getSystemMetrics(_req, res, next) {
    try {
        const [totalChecks, totalAnomalies, activeIncidents, criticalActiveCount, resolvedCount, latencyAgg, mttrAgg, endpoints, recentTelemetry,] = await Promise.all([
            prisma_1.prisma.telemetryLog.count(),
            prisma_1.prisma.telemetryLog.count({ where: { is_anomaly: true } }),
            prisma_1.prisma.anomalyAlert.count({ where: { status: 'ACTIVE' } }),
            prisma_1.prisma.anomalyAlert.count({ where: { status: 'ACTIVE', severity: 'CRITICAL' } }),
            prisma_1.prisma.anomalyAlert.count({ where: { status: 'RESOLVED' } }),
            prisma_1.prisma.telemetryLog.aggregate({
                _avg: { response_time_ms: true },
            }),
            prisma_1.prisma.alertActionLog.aggregate({
                _avg: { mttr_seconds: true },
            }),
            prisma_1.prisma.apiEndpoint.findMany({
                orderBy: { name: 'asc' },
            }),
            prisma_1.prisma.telemetryLog.findMany({
                orderBy: { timestamp: 'desc' },
                take: 25,
            }),
        ]);
        const anomalyRate = totalChecks > 0 ? Number(((totalAnomalies / totalChecks) * 100).toFixed(2)) : 0;
        // Health index weighs historical check reliability and active incident penalties
        const baseReliability = totalChecks > 0 ? 100 - anomalyRate : 100;
        const activePenalty = criticalActiveCount * 12 + (activeIncidents - criticalActiveCount) * 5;
        const healthIndex = Number(Math.max(0, Math.min(100, baseReliability - activePenalty)).toFixed(1));
        res.status(200).json({
            health_index: healthIndex,
            total_checks: totalChecks,
            total_anomalies: totalAnomalies,
            anomaly_rate: anomalyRate,
            active_incidents: activeIncidents,
            critical_active: criticalActiveCount,
            resolved_incidents: resolvedCount,
            avg_latency_ms: Math.round(latencyAgg._avg.response_time_ms ?? 0),
            avg_mttr_seconds: Math.round(mttrAgg._avg.mttr_seconds ?? 0),
            ai_mode: env_1.env.GEMINI_API_KEY ? `Gemini (${env_1.env.GEMINI_MODEL})` : 'Deterministic SRE Fallback',
            endpoints,
            recent_telemetry: recentTelemetry,
        });
    }
    catch (err) {
        next(err);
    }
}
