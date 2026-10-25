import { describe, it, expect } from 'vitest';
import { evaluateTelemetry } from '../src/services/anomaly.service';
import { buildDeterministicDiagnosis } from '../src/services/ai.service';

describe('Deterministic Anomaly Detection Engine', () => {
  it('classifies normal 200 OK within SLA and positive records as HEALTHY (P4)', () => {
    const result = evaluateTelemetry({
      api_name: 'PatientDataAPI',
      response_time_ms: 1200,
      status_code: 200,
      records_returned: 50,
    });

    expect(result.isAnomaly).toBe(false);
    expect(result.severity).toBe('HEALTHY');
    expect(result.targetEndpointHealth).toBe('HEALTHY');
  });

  it('classifies HTTP 500 with 0 records as CRITICAL (P1)', () => {
    const result = evaluateTelemetry({
      api_name: 'AppointmentAPI',
      response_time_ms: 5500,
      status_code: 500,
      records_returned: 0,
    });

    expect(result.isAnomaly).toBe(true);
    expect(result.severity).toBe('CRITICAL');
    expect(result.targetEndpointHealth).toBe('DOWN');
    expect(result.breachedRules).toContain('HTTP_500_SERVER_ERROR');
    expect(result.breachedRules).toContain('ZERO_RECORDS_RETURNED');
  });

  it('classifies latency spike above SLA (>2500ms) with 200 OK as HIGH (P2)', () => {
    const result = evaluateTelemetry({
      api_name: 'BillingAPI',
      response_time_ms: 3800,
      status_code: 200,
      records_returned: 24,
    });

    expect(result.isAnomaly).toBe(true);
    expect(result.severity).toBe('HIGH');
    expect(result.targetEndpointHealth).toBe('DEGRADED');
  });

  it('classifies 200 OK with 0 records returned as HIGH (P2)', () => {
    const result = evaluateTelemetry({
      api_name: 'PatientDataAPI',
      response_time_ms: 310,
      status_code: 200,
      records_returned: 0,
    });

    expect(result.isAnomaly).toBe(true);
    expect(result.severity).toBe('HIGH');
    expect(result.breachedRules).toContain('ZERO_RECORDS_RETURNED');
  });

  it('classifies HTTP 403 client error with error payload records as WARNING (P3)', () => {
    const result = evaluateTelemetry({
      api_name: 'CaregiverComplianceAPI',
      response_time_ms: 190,
      status_code: 403,
      records_returned: 1,
    });

    expect(result.isAnomaly).toBe(true);
    expect(result.severity).toBe('WARNING');
  });

  it('synthesizes human-readable alert message with root cause and suggested action', () => {
    const diagnosis = buildDeterministicDiagnosis(
      {
        api_name: 'AppointmentAPI',
        response_time_ms: 5500,
        status_code: 500,
        records_returned: 0,
      },
      'CRITICAL'
    );

    expect(diagnosis.message).toContain('AppointmentAPI failed with status 500 and returned 0 records');
    expect(diagnosis.root_cause_explanation.length).toBeGreaterThan(15);
    expect(diagnosis.suggested_action.length).toBeGreaterThan(15);
    expect(diagnosis.ai_fallback).toBe(true);
  });
});
