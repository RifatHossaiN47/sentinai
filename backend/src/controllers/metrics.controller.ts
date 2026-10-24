import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { env } from '../config/env';

export async function getSystemMetrics(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const [
      totalChecks,
      totalAnomalies,
      activeIncidents,
      criticalActiveCount,
      resolvedCount,
      latencyAgg,
      mttrAgg,
      endpoints,
      recentTelemetry,
    ] = await Promise.all([
      prisma.telemetryLog.count(),
      prisma.telemetryLog.count({ where: { is_anomaly: true } }),
      prisma.anomalyAlert.count({ where: { status: 'ACTIVE' } }),
      prisma.anomalyAlert.count({ where: { status: 'ACTIVE', severity: 'CRITICAL' } }),
      prisma.anomalyAlert.count({ where: { status: 'RESOLVED' } }),
      prisma.telemetryLog.aggregate({
        _avg: { response_time_ms: true },
      }),
      prisma.alertActionLog.aggregate({
        _avg: { mttr_seconds: true },
      }),
      prisma.apiEndpoint.findMany({
        orderBy: { name: 'asc' },
      }),
      prisma.telemetryLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 25,
      }),
    ]);

    const anomalyRate =
      totalChecks > 0 ? Number(((totalAnomalies / totalChecks) * 100).toFixed(2)) : 0;

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
      ai_mode: env.GEMINI_API_KEY ? `Gemini (${env.GEMINI_MODEL})` : 'Deterministic SRE Fallback',
      endpoints,
      recent_telemetry: recentTelemetry,
    });
  } catch (err) {
    next(err);
  }
}
