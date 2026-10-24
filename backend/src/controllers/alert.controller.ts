import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { DEFAULT_ENDPOINTS } from '../config/defaults';
import { ResolveAlertInput } from '../middleware/validate';

export async function getAlerts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const statusParam = ((req.query.status as string) || 'ACTIVE').toUpperCase();
    const severityParam = (req.query.severity as string)?.toUpperCase();
    const apiNameParam = req.query.api_name as string | undefined;

    const whereClause: Record<string, unknown> = {};

    if (statusParam !== 'ALL') {
      whereClause.status = statusParam;
    }
    if (severityParam && ['CRITICAL', 'HIGH', 'WARNING'].includes(severityParam)) {
      whereClause.severity = severityParam;
    }
    if (apiNameParam) {
      whereClause.api_name = apiNameParam;
    }

    const alerts = await prisma.anomalyAlert.findMany({
      where: whereClause,
      include: {
        action_logs: {
          orderBy: { created_at: 'desc' },
        },
      },
      orderBy: [{ last_detected_at: 'desc' }],
    });

    res.status(200).json(alerts);
  } catch (err) {
    next(err);
  }
}

export async function resolveAlert(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { operator_name, resolution_notes } = req.body as ResolveAlertInput;

    const alert = await prisma.anomalyAlert.findUnique({
      where: { id },
    });

    if (!alert) {
      res.status(404).json({
        error: 'Not Found',
        message: `Alert with ID ${id} does not exist.`,
      });
      return;
    }

    if (alert.status === 'RESOLVED') {
      res.status(400).json({
        error: 'Already Resolved',
        message: `Alert ${id} is already marked as RESOLVED.`,
      });
      return;
    }

    const resolvedAt = new Date();
    const mttrSeconds = Math.max(
      1,
      Math.round((resolvedAt.getTime() - alert.detected_at.getTime()) / 1000)
    );

    const [updatedAlert, actionLog] = await prisma.$transaction([
      prisma.anomalyAlert.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          resolved_at: resolvedAt,
        },
      }),
      prisma.alertActionLog.create({
        data: {
          alert_id: id,
          action_type: 'RESOLVED',
          operator_name: operator_name || 'SRE On-Call',
          resolution_notes:
            resolution_notes || 'Incident mitigated and verified healthy via SentinAI console.',
          mttr_seconds: mttrSeconds,
        },
      }),
    ]);

    const remainingActiveForApi = await prisma.anomalyAlert.count({
      where: {
        api_name: alert.api_name,
        status: 'ACTIVE',
      },
    });

    if (remainingActiveForApi === 0 && alert.endpoint_id) {
      await prisma.apiEndpoint.update({
        where: { id: alert.endpoint_id },
        data: { current_health: 'HEALTHY' },
      });
    }

    res.status(200).json({
      status: 'resolved',
      mttr_seconds: mttrSeconds,
      alert: updatedAlert,
      audit_log: actionLog,
    });
  } catch (err) {
    next(err);
  }
}

export async function resetDemoState(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await prisma.$transaction([
      prisma.alertActionLog.deleteMany(),
      prisma.anomalyAlert.deleteMany(),
      prisma.telemetryLog.deleteMany(),
      prisma.apiEndpoint.deleteMany(),
    ]);

    for (const endpoint of DEFAULT_ENDPOINTS) {
      await prisma.apiEndpoint.create({ data: endpoint });
    }

    res.status(200).json({
      status: 'reset_complete',
      message: 'Cleared all telemetry logs and alerts. All 4 endpoints restored to HEALTHY.',
    });
  } catch (err) {
    next(err);
  }
}
