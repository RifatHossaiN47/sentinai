export interface ApiEndpoint {
  id: string;
  name: string;
  description: string | null;
  target_url: string | null;
  is_critical: boolean;
  sla_latency_ms: number;
  current_health: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  updated_at: string;
}

export interface TelemetryLog {
  id: string;
  endpoint_id: string | null;
  api_name: string;
  response_time_ms: number;
  status_code: number;
  records_returned: number;
  is_anomaly: boolean;
  anomaly_reason: string | null;
  timestamp: string;
}

export interface AlertActionLog {
  id: string;
  alert_id: string;
  action_type: string;
  operator_name: string;
  resolution_notes: string | null;
  mttr_seconds: number | null;
  created_at: string;
}

export interface AnomalyAlert {
  id: string;
  endpoint_id: string | null;
  telemetry_id: string | null;
  api_name: string;
  status_code: number;
  response_time_ms: number;
  records_returned: number;
  severity: 'CRITICAL' | 'HIGH' | 'WARNING';
  status: 'ACTIVE' | 'RESOLVED';
  message: string;
  root_cause_explanation: string;
  suggested_action: string;
  ai_fallback: boolean;
  email_dispatched: boolean;
  email_preview_url: string | null;
  occurrence_count: number;
  detected_at: string;
  last_detected_at: string;
  resolved_at: string | null;
  action_logs?: AlertActionLog[];
}

export interface SystemMetrics {
  health_index: number;
  total_checks: number;
  total_anomalies: number;
  anomaly_rate: number;
  active_incidents: number;
  critical_active: number;
  resolved_incidents: number;
  avg_latency_ms: number;
  avg_mttr_seconds: number;
  ai_mode: string;
  endpoints: ApiEndpoint[];
  recent_telemetry: TelemetryLog[];
}

export interface TelemetryPayload {
  api_name: string;
  response_time_ms: number;
  status_code: number;
  records_returned: number;
}
