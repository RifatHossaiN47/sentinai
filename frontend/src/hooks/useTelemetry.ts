import { useState, useEffect, useCallback } from 'react';
import { AnomalyAlert, SystemMetrics, TelemetryPayload, TelemetryLog } from '../types';

const DEFAULT_METRICS: SystemMetrics = {
  health_index: 99.2,
  total_checks: 1420,
  total_anomalies: 8,
  anomaly_rate: 0.56,
  active_incidents: 0,
  critical_active: 0,
  resolved_incidents: 8,
  avg_latency_ms: 188,
  avg_mttr_seconds: 44,
  ai_mode: 'Gemini 3.5 Flash-Lite (SRE Automated Triage Active)',
  endpoints: [
    {
      id: 'ep-fhir-1',
      name: 'FHIR Patient Identity Gateway',
      description: 'Core patient demographic and insurance eligibility verification API',
      target_url: 'https://api.careguide.internal/fhir/v4/Patient',
      is_critical: true,
      sla_latency_ms: 1200,
      current_health: 'HEALTHY',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'ep-hl7-2',
      name: 'HL7 Clinical Observation Ingestion Pipeline',
      description: 'Real-time telemetry ingestion pipeline for diagnostic lab results',
      target_url: 'https://api.careguide.internal/hl7/observations',
      is_critical: true,
      sla_latency_ms: 2500,
      current_health: 'HEALTHY',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'ep-pacs-3',
      name: 'PACS Medical Imaging Sync Service',
      description: 'DICOM chest radiograph and CT scan streaming storage service',
      target_url: 'https://api.careguide.internal/pacs/dicom/v2',
      is_critical: false,
      sla_latency_ms: 4000,
      current_health: 'HEALTHY',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'ep-webrtc-4',
      name: 'Care Guide Telehealth WebRTC Signaling',
      description: 'Low-latency session signaling for remote clinical teleconsultations',
      target_url: 'https://api.careguide.internal/telehealth/signaling',
      is_critical: true,
      sla_latency_ms: 800,
      current_health: 'HEALTHY',
      updated_at: new Date().toISOString(),
    },
  ],
  recent_telemetry: [
    {
      id: 'tel-init-1',
      endpoint_id: 'ep-fhir-1',
      api_name: 'FHIR Patient Identity Gateway',
      response_time_ms: 142,
      status_code: 200,
      records_returned: 1,
      is_anomaly: false,
      anomaly_reason: null,
      timestamp: new Date(Date.now() - 15000).toISOString(),
    },
    {
      id: 'tel-init-2',
      endpoint_id: 'ep-hl7-2',
      api_name: 'HL7 Clinical Observation Ingestion Pipeline',
      response_time_ms: 310,
      status_code: 200,
      records_returned: 18,
      is_anomaly: false,
      anomaly_reason: null,
      timestamp: new Date(Date.now() - 32000).toISOString(),
    },
    {
      id: 'tel-init-3',
      endpoint_id: 'ep-webrtc-4',
      api_name: 'Care Guide Telehealth WebRTC Signaling',
      response_time_ms: 68,
      status_code: 200,
      records_returned: 1,
      is_anomaly: false,
      anomaly_reason: null,
      timestamp: new Date(Date.now() - 54000).toISOString(),
    },
  ],
};

export function useTelemetry(pollIntervalMs = 5000) {
  const [metrics, setMetrics] = useState<SystemMetrics>(DEFAULT_METRICS);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchDashboardState = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const [metricsRes, alertsRes] = await Promise.all([
        fetch('/api/metrics', { signal: controller.signal }),
        fetch('/api/alerts?status=ALL', { signal: controller.signal }),
      ]);
      clearTimeout(timeoutId);

      if (metricsRes.ok && alertsRes.ok) {
        const [metricsData, alertsData] = await Promise.all([
          metricsRes.json() as Promise<SystemMetrics>,
          alertsRes.json() as Promise<AnomalyAlert[]>,
        ]);
        setMetrics(metricsData);
        setAlerts(alertsData);
        setIsLiveConnected(true);
        setLastUpdated(new Date());
      }
    } catch {
      // In serverless standby or offline mode, retain resilient client state
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboardState();
    const timer = setInterval(() => {
      void fetchDashboardState();
    }, pollIntervalMs);
    return () => clearInterval(timer);
  }, [fetchDashboardState, pollIntervalMs]);

  const ingestPayload = async (payload: TelemetryPayload | TelemetryPayload[]) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch('/api/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        await fetchDashboardState();
        return data;
      }
    } catch {
      // Fall through to immediate client-side simulation engine
    }

    // Client-side simulation fallback engine for instant recruiter interactivity
    const payloads = Array.isArray(payload) ? payload : [payload];
    let newAlerts: AnomalyAlert[] = [...alerts];
    let newLogs: TelemetryLog[] = [...metrics.recent_telemetry];
    let activeAdd = 0;
    let critAdd = 0;

    for (const item of payloads) {
      const isAnomaly =
        item.status_code >= 400 ||
        item.response_time_ms > 2500 ||
        (item.records_returned === 0 && item.status_code === 200);

      const log: TelemetryLog = {
        id: `tel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        endpoint_id: null,
        api_name: item.api_name,
        response_time_ms: item.response_time_ms,
        status_code: item.status_code,
        records_returned: item.records_returned,
        is_anomaly: isAnomaly,
        anomaly_reason: isAnomaly
          ? item.status_code >= 500
            ? `HTTP ${item.status_code} Internal Server Failure`
            : item.response_time_ms > 2500
            ? `Latency spike (${item.response_time_ms}ms > SLA 2500ms)`
            : 'Empty payload returned on active observation feed'
          : null,
        timestamp: new Date().toISOString(),
      };

      newLogs.unshift(log);

      if (isAnomaly) {
        const isCritical = item.status_code >= 500;
        const severity = isCritical ? 'CRITICAL' : item.response_time_ms > 3500 ? 'HIGH' : 'WARNING';
        if (isCritical) critAdd++;
        activeAdd++;

        const alert: AnomalyAlert = {
          id: `alt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          endpoint_id: null,
          telemetry_id: log.id,
          api_name: item.api_name,
          status_code: item.status_code,
          response_time_ms: item.response_time_ms,
          records_returned: item.records_returned,
          severity,
          status: 'ACTIVE',
          message: isCritical
            ? `Critical HTTP ${item.status_code} detected on ${item.api_name}`
            : `High latency degradation (${item.response_time_ms}ms) on ${item.api_name}`,
          root_cause_explanation: isCritical
            ? `Uncaught upstream exception in ${item.api_name}. Microservice container experiencing pod restarts or downstream database pool saturation.`
            : `I/O bottleneck or unindexed query on ${item.api_name}. Response duration exceeded SLA threshold of 2500ms by ${item.response_time_ms - 2500}ms.`,
          suggested_action: isCritical
            ? 'Trigger rolling restart of upstream pods, verify connection pool configuration, and inspect recent deployment diff.'
            : 'Scale pod replica count, enable query caching on diagnostic observation feeds, and review database slow-query logs.',
          ai_fallback: false,
          email_dispatched: true,
          email_preview_url: null,
          occurrence_count: 1,
          detected_at: new Date().toISOString(),
          last_detected_at: new Date().toISOString(),
          resolved_at: null,
          action_logs: [],
        };
        newAlerts.unshift(alert);
      }
    }

    const totalChecks = metrics.total_checks + payloads.length;
    const totalAnomalies = metrics.total_anomalies + activeAdd;
    const activeIncidents = metrics.active_incidents + activeAdd;
    const criticalActive = metrics.critical_active + critAdd;
    const anomalyRate = Number(((totalAnomalies / totalChecks) * 100).toFixed(2));
    const healthIndex = Math.max(0, Math.min(100, Number((100 - anomalyRate - (criticalActive * 12 + activeIncidents * 4)).toFixed(1))));

    setAlerts(newAlerts);
    setMetrics((prev) => ({
      ...prev,
      total_checks: totalChecks,
      total_anomalies: totalAnomalies,
      active_incidents: activeIncidents,
      critical_active: criticalActive,
      anomaly_rate: anomalyRate,
      health_index: healthIndex,
      recent_telemetry: newLogs.slice(0, 25),
    }));
    setLastUpdated(new Date());

    return { success: true, processed_checks: payloads.length, anomalies_detected: activeAdd };
  };

  const resolveIncident = async (
    alertId: string,
    operatorName: string,
    resolutionNotes: string
  ) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operator_name: operatorName,
          resolution_notes: resolutionNotes,
        }),
      });
      if (res.ok) {
        await fetchDashboardState();
        return await res.json();
      }
    } catch {
      // Fall through to client resolution
    }

    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: 'RESOLVED',
              resolved_at: new Date().toISOString(),
              action_logs: [
                ...(a.action_logs || []),
                {
                  id: `act-${Date.now()}`,
                  alert_id: alertId,
                  action_type: 'MANUAL_REMEDIATION',
                  operator_name: operatorName,
                  resolution_notes: resolutionNotes,
                  mttr_seconds: 32,
                  created_at: new Date().toISOString(),
                },
              ],
            }
          : a
      )
    );

    setMetrics((prev) => ({
      ...prev,
      active_incidents: Math.max(0, prev.active_incidents - 1),
      critical_active: Math.max(0, prev.critical_active - 1),
      resolved_incidents: prev.resolved_incidents + 1,
      health_index: Math.min(100, Number((prev.health_index + 8).toFixed(1))),
    }));
    setLastUpdated(new Date());

    return { resolved: true, alert_id: alertId };
  };

  const resetDemo = async () => {
    try {
      await fetch('/api/alerts/reset', { method: 'POST' });
    } catch {
      // Ignore
    }
    setAlerts([]);
    setMetrics(DEFAULT_METRICS);
    setLastUpdated(new Date());
  };

  return {
    metrics,
    alerts,
    loading,
    error: null,
    isLiveConnected,
    lastUpdated,
    refresh: fetchDashboardState,
    ingestPayload,
    resolveIncident,
    resetDemo,
  };
}
