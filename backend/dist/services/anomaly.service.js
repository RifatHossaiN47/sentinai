"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateTelemetry = evaluateTelemetry;
function evaluateTelemetry(payload, slaLatencyMs = 2500, isCriticalEndpoint = true) {
    const { status_code, response_time_ms, records_returned } = payload;
    const breachedRules = [];
    const isServerError = status_code >= 500;
    const isClientError = status_code >= 400 && status_code < 500;
    const isLatencyBreached = response_time_ms > slaLatencyMs;
    const isZeroRecords = records_returned === 0;
    if (isServerError) {
        breachedRules.push(`HTTP_${status_code}_SERVER_ERROR`);
    }
    if (isClientError) {
        breachedRules.push(`HTTP_${status_code}_CLIENT_ERROR`);
    }
    if (isLatencyBreached) {
        breachedRules.push(`LATENCY_SLA_BREACH_${response_time_ms}MS`);
    }
    if (isZeroRecords) {
        breachedRules.push('ZERO_RECORDS_RETURNED');
    }
    // P1 Critical: 5xx server outages or 4xx with empty payload on critical endpoints
    if (isServerError || (isClientError && isZeroRecords && isCriticalEndpoint)) {
        return {
            isAnomaly: true,
            severity: 'CRITICAL',
            reasonCode: breachedRules.join(' | '),
            breachedRules,
            targetEndpointHealth: 'DOWN',
        };
    }
    // P2 High covers latency SLA spikes (>2500ms) or silent data drops (200 OK with 0 records)
    if (isLatencyBreached || isZeroRecords) {
        return {
            isAnomaly: true,
            severity: 'HIGH',
            reasonCode: breachedRules.join(' | '),
            breachedRules,
            targetEndpointHealth: 'DEGRADED',
        };
    }
    // P3 Warning covers 4xx client/auth errors where error metadata records were still returned
    if (isClientError) {
        return {
            isAnomaly: true,
            severity: 'WARNING',
            reasonCode: breachedRules.join(' | '),
            breachedRules,
            targetEndpointHealth: 'DEGRADED',
        };
    }
    // Fast-path: Normal 2xx response within latency SLA and non-empty record count
    return {
        isAnomaly: false,
        severity: 'HEALTHY',
        reasonCode: 'NOMINAL',
        breachedRules: [],
        targetEndpointHealth: 'HEALTHY',
    };
}
