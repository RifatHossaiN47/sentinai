"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAlerts = getAlerts;
exports.resolveAlert = resolveAlert;
exports.resetDemoState = resetDemoState;
const prisma_1 = require("../config/prisma");
const defaults_1 = require("../config/defaults");
async function getAlerts(req, res, next) {
    try {
        const statusParam = (req.query.status || 'ACTIVE').toUpperCase();
        const severityParam = req.query.severity?.toUpperCase();
        const apiNameParam = req.query.api_name;
        const whereClause = {};
        if (statusParam !== 'ALL') {
            whereClause.status = statusParam;
        }
        if (severityParam && ['CRITICAL', 'HIGH', 'WARNING'].includes(severityParam)) {
            whereClause.severity = severityParam;
        }
        if (apiNameParam) {
            whereClause.api_name = apiNameParam;
        }
        const alerts = await prisma_1.prisma.anomalyAlert.findMany({
            where: whereClause,
            include: {
                action_logs: {
                    orderBy: { created_at: 'desc' },
                },
            },
            orderBy: [{ last_detected_at: 'desc' }],
        });
        res.status(200).json(alerts);
    }
    catch (err) {
        next(err);
    }
}
async function resolveAlert(req, res, next) {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { operator_name, resolution_notes } = req.body;
        const alert = await prisma_1.prisma.anomalyAlert.findUnique({
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
        const mttrSeconds = Math.max(1, Math.round((resolvedAt.getTime() - alert.detected_at.getTime()) / 1000));
        const [updatedAlert, actionLog] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.anomalyAlert.update({
                where: { id },
                data: {
                    status: 'RESOLVED',
                    resolved_at: resolvedAt,
                },
            }),
            prisma_1.prisma.alertActionLog.create({
                data: {
                    alert_id: id,
                    action_type: 'RESOLVED',
                    operator_name: operator_name || 'SRE On-Call',
                    resolution_notes: resolution_notes || 'Incident mitigated and verified healthy via SentinAI console.',
                    mttr_seconds: mttrSeconds,
                },
            }),
        ]);
        const remainingActiveForApi = await prisma_1.prisma.anomalyAlert.count({
            where: {
                api_name: alert.api_name,
                status: 'ACTIVE',
            },
        });
        if (remainingActiveForApi === 0 && alert.endpoint_id) {
            await prisma_1.prisma.apiEndpoint.update({
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
    }
    catch (err) {
        next(err);
    }
}
async function resetDemoState(_req, res, next) {
    try {
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.alertActionLog.deleteMany(),
            prisma_1.prisma.anomalyAlert.deleteMany(),
            prisma_1.prisma.telemetryLog.deleteMany(),
            prisma_1.prisma.apiEndpoint.deleteMany(),
        ]);
        for (const endpoint of defaults_1.DEFAULT_ENDPOINTS) {
            await prisma_1.prisma.apiEndpoint.create({ data: endpoint });
        }
        res.status(200).json({
            status: 'reset_complete',
            message: 'Cleared all telemetry logs and alerts. All 4 endpoints restored to HEALTHY.',
        });
    }
    catch (err) {
        next(err);
    }
}
