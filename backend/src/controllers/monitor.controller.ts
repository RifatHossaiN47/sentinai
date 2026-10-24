import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { TelemetryInput } from '../middleware/validate';
import { evaluateTelemetry, AnomalySeverity } from '../services/anomaly.service';
import { generateAnomalyDiagnosis, AiDiagnosticReport } from '../services/ai.service';
import { dispatchCriticalAlertEmail } from '../services/email.service';

export interface ProcessedTelemetryResult {
  status: 'healthy' | 'anomaly_detected';
  api_name: string;
  severity: AnomalySeverity;
  is_anomaly: boolean;
  deduplicated?: boolean;
  occurrence_count?: number;
  telemetry_id: string;
  alert_id?: string;
  message: string;
  ai_diagnosis?: AiDiagnosticReport;
  email_dispatched?: boolean;
  email_preview_url?: string | null;
}

const SEVERITY_RANK: Record<string, number> = {
  WARNING: 1,
  HIGH: 2,
  CRITICAL: 3,
};

export async function processTelemetryItem(
  payload: TelemetryInput
): Promise<ProcessedTelemetryResult> {
  // Auto-upsert endpoint so unseen microservices never trigger foreign key failures
  const endpoint = await prisma.apiEndpoint.upsert({
    where: { name: payload.api_name },
    update: {},
    create: {
      name: payload.api_name,
      description: `Auto-registered microservice endpoint (${payload.api_name})`,
      is_critical: true,
      sla_latency_ms: 2500,
      current_health: 'HEALTHY',
    },
  });

  const evaluation = evaluateTelemetry(
    payload,
    endpoint.sla_latency_ms,
    endpoint.is_critical
  );

  const telemetryRecord = await prisma.telemetryLog.create({
    data: {
      endpoint_id: endpoint.id,
      api_name: payload.api_name,
      response_time_ms: payload.response_time_ms,
      status_code: payload.status_code,
      records_returned: payload.records_returned,
      is_anomaly: evaluation.isAnomaly,
      anomaly_reason: evaluation.isAnomaly ? evaluation.reasonCode : null,
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
    },
  });

  // Fast-path: Healthy checks bypass LLM completely (0 tokens used)
  if (!evaluation.isAnomaly) {
    const activeAlertsForEndpoint = await prisma.anomalyAlert.count({
      where: { api_name: payload.api_name, status: 'ACTIVE' },
    });

    if (activeAlertsForEndpoint === 0 && endpoint.current_health !== 'HEALTHY') {
      await prisma.apiEndpoint.update({
        where: { id: endpoint.id },
        data: { current_health: 'HEALTHY' },
      });
    }

    return {
      status: 'healthy',
      api_name: payload.api_name,
      severity: 'HEALTHY',
      is_anomaly: false,
      telemetry_id: telemetryRecord.id,
      message: `${payload.api_name} responded normally (HTTP ${payload.status_code}, ${payload.response_time_ms}ms, ${payload.records_returned} records).`,
    };
  }

  await prisma.apiEndpoint.update({
    where: { id: endpoint.id },
    data: { current_health: evaluation.targetEndpointHealth },
  });

  // Alert deduplication: check for an existing ACTIVE incident on the same API
  const existingActiveAlert = await prisma.anomalyAlert.findFirst({
    where: {
      api_name: payload.api_name,
      status: 'ACTIVE',
    },
    orderBy: { detected_at: 'desc' },
  });

  if (existingActiveAlert) {
    const isEscalation =
      (SEVERITY_RANK[evaluation.severity] ?? 1) >
      (SEVERITY_RANK[existingActiveAlert.severity] ?? 1);

    if (!isEscalation) {
      const updatedAlert = await prisma.anomalyAlert.update({
        where: { id: existingActiveAlert.id },
        data: {
          telemetry_id: telemetryRecord.id,
          status_code: payload.status_code,
          response_time_ms: payload.response_time_ms,
          records_returned: payload.records_returned,
          occurrence_count: { increment: 1 },
          last_detected_at: new Date(),
        },
      });

      return {
        status: 'anomaly_detected',
        api_name: payload.api_name,
        severity: updatedAlert.severity as AnomalySeverity,
        is_anomaly: true,
        deduplicated: true,
        occurrence_count: updatedAlert.occurrence_count,
        telemetry_id: telemetryRecord.id,
        alert_id: updatedAlert.id,
        message: updatedAlert.message,
        ai_diagnosis: {
          message: updatedAlert.message,
          root_cause_explanation: updatedAlert.root_cause_explanation,
          suggested_action: updatedAlert.suggested_action,
          ai_fallback: updatedAlert.ai_fallback,
        },
        email_dispatched: updatedAlert.email_dispatched,
        email_preview_url: updatedAlert.email_preview_url,
      };
    }
  }

  const aiDiagnosis = await generateAnomalyDiagnosis(
    payload,
    evaluation.severity,
    evaluation.reasonCode,
    endpoint.sla_latency_ms
  );

  let emailDispatched = false;
  let emailPreviewUrl: string | null = null;

  if (evaluation.severity === 'CRITICAL') {
    const emailResult = await dispatchCriticalAlertEmail({
      alertId: existingActiveAlert?.id ?? 'NEW-INCIDENT',
      apiName: payload.api_name,
      severity: evaluation.severity,
      statusCode: payload.status_code,
      responseTimeMs: payload.response_time_ms,
      recordsReturned: payload.records_returned,
      message: aiDiagnosis.message,
      rootCause: aiDiagnosis.root_cause_explanation,
      suggestedAction: aiDiagnosis.suggested_action,
      detectedAt: new Date(),
    });
    emailDispatched = emailResult.dispatched;
    emailPreviewUrl = emailResult.previewUrl;
  }

  const savedAlert = existingActiveAlert
    ? await prisma.anomalyAlert.update({
        where: { id: existingActiveAlert.id },
        data: {
          telemetry_id: telemetryRecord.id,
          status_code: payload.status_code,
          response_time_ms: payload.response_time_ms,
          records_returned: payload.records_returned,
          severity: evaluation.severity,
          message: aiDiagnosis.message,
          root_cause_explanation: aiDiagnosis.root_cause_explanation,
          suggested_action: aiDiagnosis.suggested_action,
          ai_fallback: aiDiagnosis.ai_fallback,
          email_dispatched: existingActiveAlert.email_dispatched || emailDispatched,
          email_preview_url: emailPreviewUrl ?? existingActiveAlert.email_preview_url,
          occurrence_count: { increment: 1 },
          last_detected_at: new Date(),
        },
      })
    : await prisma.anomalyAlert.create({
        data: {
          endpoint_id: endpoint.id,
          telemetry_id: telemetryRecord.id,
          api_name: payload.api_name,
          status_code: payload.status_code,
          response_time_ms: payload.response_time_ms,
          records_returned: payload.records_returned,
          severity: evaluation.severity,
          status: 'ACTIVE',
          message: aiDiagnosis.message,
          root_cause_explanation: aiDiagnosis.root_cause_explanation,
          suggested_action: aiDiagnosis.suggested_action,
          ai_fallback: aiDiagnosis.ai_fallback,
          email_dispatched: emailDispatched,
          email_preview_url: emailPreviewUrl,
          occurrence_count: 1,
        },
      });

  return {
    status: 'anomaly_detected',
    api_name: payload.api_name,
    severity: evaluation.severity,
    is_anomaly: true,
    deduplicated: false,
    occurrence_count: savedAlert.occurrence_count,
    telemetry_id: telemetryRecord.id,
    alert_id: savedAlert.id,
    message: savedAlert.message,
    ai_diagnosis: aiDiagnosis,
    email_dispatched: savedAlert.email_dispatched,
    email_preview_url: savedAlert.email_preview_url,
  };
}

export async function ingestTelemetry(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as TelemetryInput | TelemetryInput[];

    if (Array.isArray(body)) {
      const results: ProcessedTelemetryResult[] = [];
      for (const item of body) {
        const result = await processTelemetryItem(item);
        results.push(result);
      }

      const anomalyCount = results.filter((r) => r.is_anomaly).length;
      res.status(200).json({
        status: 'batch_processed',
        total_processed: results.length,
        healthy_count: results.length - anomalyCount,
        anomaly_count: anomalyCount,
        results,
      });
      return;
    }

    const result = await processTelemetryItem(body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
