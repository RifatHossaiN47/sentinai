"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDeterministicDiagnosis = buildDeterministicDiagnosis;
exports.generateAnomalyDiagnosis = generateAnomalyDiagnosis;
const genai_1 = require("@google/genai");
const env_1 = require("../config/env");
const SYSTEM_INSTRUCTION = `You are SentinAI's Senior Site Reliability Engineering (SRE) Diagnostic Agent for a healthcare technology platform.
Analyze failing API telemetry and synthesize a concise, accurate, human-readable alert report.
Strict rules:
1. 'message': A single human-readable alert sentence summarizing the API name, failing metrics, and suspected issue:
   - For 5xx errors: "<API> failed with status <status_code> and returned <records_returned> records. Possible outage or data issue."
   - For high latency (> SLA) with 200 OK: "<API> experienced high response time of <response_time_ms>ms (SLA: <sla>ms). Possible performance or database bottleneck."
   - For 0 records with 200 OK: "<API> returned 0 records despite HTTP 200 (<response_time_ms>ms). Possible missing data or upstream sync issue."
2. 'root_cause_explanation': Under 30 words explaining the technical root cause based strictly on status code, latency, and record count.
3. 'suggested_action': Under 35 words providing concrete SRE remediation steps.`;
function buildDeterministicDiagnosis(payload, severity, slaLatencyMs = 2500) {
    const { api_name, status_code, response_time_ms, records_returned } = payload;
    if (status_code >= 500 && records_returned === 0) {
        return {
            message: `${api_name} failed with status ${status_code} and returned 0 records (${response_time_ms}ms). Possible outage or data issue.`,
            root_cause_explanation: `Upstream microservice returned HTTP ${status_code} after ${response_time_ms}ms with an empty payload, indicating an unhandled runtime exception, exhausted database connection pool, or crashed container.`,
            suggested_action: `Inspect ${api_name} container error logs, verify primary database connectivity and pool saturation, and roll back recent deployments if error rate persists.`,
            ai_fallback: true,
        };
    }
    if (status_code >= 500) {
        return {
            message: `${api_name} failed with HTTP status ${status_code} (${response_time_ms}ms). Possible upstream server outage.`,
            root_cause_explanation: `Endpoint returned server error HTTP ${status_code} in ${response_time_ms}ms. Downstream service dependency or internal transaction handler failed mid-execution.`,
            suggested_action: `Check upstream application logs for stack traces, verify dependent microservice health checks, and trigger pod restart if unresponsive.`,
            ai_fallback: true,
        };
    }
    if (response_time_ms > slaLatencyMs && records_returned === 0) {
        return {
            message: `${api_name} experienced high latency (${response_time_ms}ms) and returned 0 records. Possible query timeout or lock contention.`,
            root_cause_explanation: `Response time (${response_time_ms}ms) breached the ${slaLatencyMs}ms SLA while returning zero records, pointing to a database query timeout or lock wait expiration.`,
            suggested_action: `Inspect database slow query logs for ${api_name}, terminate blocking transactions, and verify indexing on filtered columns.`,
            ai_fallback: true,
        };
    }
    if (response_time_ms > slaLatencyMs) {
        return {
            message: `${api_name} response time spiked to ${response_time_ms}ms (SLA: ${slaLatencyMs}ms) returning ${records_returned} records. Possible performance degradation.`,
            root_cause_explanation: `Latency of ${response_time_ms}ms exceeded the ${slaLatencyMs}ms threshold for ${records_returned} records, suggesting unindexed table scans, high CPU utilization, or network throttling.`,
            suggested_action: `Profile slow SQL queries on ${api_name}, verify composite indexes, and review worker thread or container CPU/memory saturation.`,
            ai_fallback: true,
        };
    }
    if (records_returned === 0) {
        return {
            message: `${api_name} returned 0 records with status ${status_code} (${response_time_ms}ms). Possible silent data sync failure or empty dataset.`,
            root_cause_explanation: `Endpoint returned HTTP ${status_code} in ${response_time_ms}ms but yielded 0 records. Likely caused by a silent upstream ingestion stall, overly restrictive query filter, or cache invalidation bug.`,
            suggested_action: `Verify upstream ETL sync jobs for ${api_name}, validate query date-range parameters, and inspect source table row counts.`,
            ai_fallback: true,
        };
    }
    return {
        message: `${api_name} returned client error status ${status_code} (${response_time_ms}ms, ${records_returned} records). Possible authentication or schema mismatch.`,
        root_cause_explanation: `Endpoint rejected request with HTTP ${status_code} (${severity}). Commonly triggered by expired API credentials, malformed request parameters, or rate limiting.`,
        suggested_action: `Validate service-to-service API tokens, inspect request payload contract against ${api_name} schema, and check rate-limit headers.`,
        ai_fallback: true,
    };
}
async function generateAnomalyDiagnosis(payload, severity, reasonCode, slaLatencyMs = 2500) {
    if (!env_1.env.GEMINI_API_KEY || env_1.env.GEMINI_API_KEY.trim() === '') {
        return buildDeterministicDiagnosis(payload, severity, slaLatencyMs);
    }
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), env_1.env.AI_TIMEOUT_MS);
    try {
        const ai = new genai_1.GoogleGenAI({ apiKey: env_1.env.GEMINI_API_KEY });
        const prompt = `Analyze the following healthcare API telemetry anomaly:
- Endpoint Name: ${payload.api_name}
- HTTP Status Code: ${payload.status_code}
- Response Time: ${payload.response_time_ms}ms (SLA Threshold: ${slaLatencyMs}ms)
- Records Returned: ${payload.records_returned}
- Triggered Severity: ${severity} (${reasonCode})

Synthesize a concise human-readable alert message, technical root cause explanation, and actionable SRE mitigation steps.`;
        const response = await ai.models.generateContent({
            model: env_1.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                temperature: 0.1,
                maxOutputTokens: 220,
                abortSignal: controller.signal,
                responseMimeType: 'application/json',
                responseJsonSchema: {
                    type: genai_1.Type.OBJECT,
                    properties: {
                        message: {
                            type: genai_1.Type.STRING,
                            description: 'Single-sentence human-readable alert summary accurately describing the specific anomaly (5xx error, high response time, or 0 records returned).',
                        },
                        root_cause_explanation: {
                            type: genai_1.Type.STRING,
                            description: 'Concise SRE technical root cause explanation under 30 words.',
                        },
                        suggested_action: {
                            type: genai_1.Type.STRING,
                            description: 'Actionable SRE remediation steps under 35 words.',
                        },
                    },
                    required: ['message', 'root_cause_explanation', 'suggested_action'],
                },
            },
        });
        const rawText = response.text?.trim();
        if (!rawText) {
            return buildDeterministicDiagnosis(payload, severity, slaLatencyMs);
        }
        const parsed = JSON.parse(rawText);
        if (!parsed.message || !parsed.root_cause_explanation || !parsed.suggested_action) {
            return buildDeterministicDiagnosis(payload, severity, slaLatencyMs);
        }
        return {
            message: parsed.message,
            root_cause_explanation: parsed.root_cause_explanation,
            suggested_action: parsed.suggested_action,
            ai_fallback: false,
        };
    }
    catch (err) {
        console.warn(`[AI Circuit Breaker] Falling back to deterministic SRE rules for ${payload.api_name}: ${err.message}`);
        return buildDeterministicDiagnosis(payload, severity, slaLatencyMs);
    }
    finally {
        clearTimeout(timeoutHandle);
    }
}
