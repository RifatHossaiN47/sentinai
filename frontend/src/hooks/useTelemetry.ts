import { useState, useEffect, useCallback } from 'react';
import { AnomalyAlert, SystemMetrics, TelemetryPayload } from '../types';

export function useTelemetry(pollIntervalMs = 4000) {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchDashboardState = useCallback(async () => {
    try {
      const [metricsRes, alertsRes] = await Promise.all([
        fetch('/api/metrics'),
        fetch('/api/alerts?status=ALL'),
      ]);

      if (!metricsRes.ok || !alertsRes.ok) {
        throw new Error('Backend telemetry service unreachable');
      }

      const [metricsData, alertsData] = await Promise.all([
        metricsRes.json() as Promise<SystemMetrics>,
        alertsRes.json() as Promise<AnomalyAlert[]>,
      ]);

      setMetrics(metricsData);
      setAlerts(alertsData);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError((err as Error).message);
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
    const res = await fetch('/api/monitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to ingest telemetry payload');
    }

    await fetchDashboardState();
    return data;
  };

  const resolveIncident = async (
    alertId: string,
    operatorName: string,
    resolutionNotes: string
  ) => {
    const res = await fetch(`/api/alerts/${alertId}/resolve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operator_name: operatorName,
        resolution_notes: resolutionNotes,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to resolve incident');
    }

    await fetchDashboardState();
    return data;
  };

  const resetDemo = async () => {
    const res = await fetch('/api/alerts/reset', {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error('Failed to reset demo data');
    }
    await fetchDashboardState();
  };

  return {
    metrics,
    alerts,
    loading,
    error,
    lastUpdated,
    refresh: fetchDashboardState,
    ingestPayload,
    resolveIncident,
    resetDemo,
  };
}
