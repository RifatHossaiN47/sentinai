import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { initializeDatabase, prisma } from '../src/config/prisma';

describe('SentinAI REST API Integration Suite', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await initializeDatabase();
    await prisma.alertActionLog.deleteMany();
    await prisma.anomalyAlert.deleteMany();
    await prisma.telemetryLog.deleteMany();
  }, 30000);

  afterAll(async () => {
    await prisma.$disconnect();
  }, 15000);

  it('POST /monitor ingests healthy telemetry on zero-token fast path', async () => {
    const res = await request(app).post('/monitor').send({
      api_name: 'PatientDataAPI',
      response_time_ms: 420,
      status_code: 200,
      records_returned: 50,
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.is_anomaly).toBe(false);
  }, 15000);

  it('POST /api/monitor rejects invalid negative latency with HTTP 422', async () => {
    const res = await request(app).post('/api/monitor').send({
      api_name: 'PatientDataAPI',
      response_time_ms: -100,
      status_code: 200,
      records_returned: 10,
    });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation Failed');
  }, 15000);

  it('POST /monitor detects P1 Critical outage and deduplicates repeated hits', async () => {
    const firstHit = await request(app).post('/monitor').send({
      api_name: 'AppointmentAPI',
      response_time_ms: 5500,
      status_code: 500,
      records_returned: 0,
    });

    expect(firstHit.status).toBe(200);
    expect(firstHit.body.status).toBe('anomaly_detected');
    expect(firstHit.body.severity).toBe('CRITICAL');
    expect(firstHit.body.deduplicated).toBe(false);
    expect(firstHit.body.occurrence_count).toBe(1);

    const secondHit = await request(app).post('/monitor').send({
      api_name: 'AppointmentAPI',
      response_time_ms: 5200,
      status_code: 500,
      records_returned: 0,
    });

    expect(secondHit.status).toBe(200);
    expect(secondHit.body.deduplicated).toBe(true);
    expect(secondHit.body.occurrence_count).toBe(2);
    expect(secondHit.body.alert_id).toBe(firstHit.body.alert_id);
  }, 20000);

  it('POST /monitor accepts batch array payload directly', async () => {
    const batchRes = await request(app)
      .post('/monitor')
      .send([
        {
          api_name: 'PatientDataAPI',
          response_time_ms: 1200,
          status_code: 200,
          records_returned: 50,
        },
        {
          api_name: 'BillingAPI',
          response_time_ms: 3400,
          status_code: 200,
          records_returned: 12,
        },
      ]);

    expect(batchRes.status).toBe(200);
    expect(batchRes.body.status).toBe('batch_processed');
    expect(batchRes.body.total_processed).toBe(2);
    expect(batchRes.body.healthy_count).toBe(1);
    expect(batchRes.body.anomaly_count).toBe(1);
  }, 20000);

  it('GET /alerts returns active anomalies and PATCH /alerts/:id/resolve computes MTTR', async () => {
    const alertsRes = await request(app).get('/alerts');
    expect(alertsRes.status).toBe(200);
    expect(Array.isArray(alertsRes.body)).toBe(true);
    expect(alertsRes.body.length).toBeGreaterThanOrEqual(2);

    const targetAlertId = alertsRes.body[0].id;
    const resolveRes = await request(app)
      .patch(`/alerts/${targetAlertId}/resolve`)
      .send({
        operator_name: 'Md Rifat Hossen',
        resolution_notes: 'Restarted AppointmentAPI pod and verified DB pool.',
      });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.status).toBe('resolved');
    expect(resolveRes.body.mttr_seconds).toBeGreaterThanOrEqual(1);
    expect(resolveRes.body.alert.status).toBe('RESOLVED');
  }, 15000);

  it('GET /metrics returns health index, total checks, and endpoint statuses', async () => {
    const metricsRes = await request(app).get('/metrics');
    expect(metricsRes.status).toBe(200);
    expect(typeof metricsRes.body.health_index).toBe('number');
    expect(metricsRes.body.total_checks).toBeGreaterThanOrEqual(5);
    expect(Array.isArray(metricsRes.body.endpoints)).toBe(true);
  }, 15000);
});
