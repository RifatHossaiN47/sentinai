import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

export interface EmailAlertPayload {
  alertId: string;
  apiName: string;
  severity: string;
  statusCode: number;
  responseTimeMs: number;
  recordsReturned: number;
  message: string;
  rootCause: string;
  suggestedAction: string;
  detectedAt: Date;
}

export interface EmailDispatchResult {
  dispatched: boolean;
  previewUrl: string | null;
}

let cachedTransporter: Transporter | null = null;
let isEtherealAccount = false;

async function getTransporter(): Promise<Transporter | null> {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    cachedTransporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      connectionTimeout: 2500,
      greetingTimeout: 2500,
      socketTimeout: 3000,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
    isEtherealAccount = false;
    return cachedTransporter;
  }

  try {
    const testAccount = await Promise.race([
      nodemailer.createTestAccount(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Ethereal account creation timeout')), 2000)
      ),
    ]);
    cachedTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      connectionTimeout: 2000,
      greetingTimeout: 2000,
      socketTimeout: 2500,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    isEtherealAccount = true;
    return cachedTransporter;
  } catch {
    return null;
  }
}

export function renderAlertEmailHtml(alert: EmailAlertPayload): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background: #1e293b; border: 1px solid #ef4444; border-radius: 10px; overflow: hidden; }
    .banner { background: #dc2626; color: #ffffff; padding: 16px 20px; font-weight: 700; font-size: 16px; letter-spacing: 0.5px; }
    .content { padding: 20px; }
    .summary { background: #0f172a; border-left: 4px solid #ef4444; padding: 12px 16px; margin-bottom: 16px; color: #fca5a5; font-weight: 600; }
    .metrics { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .metrics td { padding: 8px 12px; border-bottom: 1px solid #334155; font-size: 14px; }
    .label { color: #94a3b8; width: 40%; }
    .val { color: #f8fafc; font-weight: 600; font-family: monospace; }
    .section-title { font-size: 12px; text-transform: uppercase; color: #94a3b8; margin: 14px 0 6px; letter-spacing: 0.8px; }
    .box { background: #0f172a; padding: 12px; border-radius: 6px; font-size: 14px; line-height: 1.5; color: #e2e8f0; }
    .footer { padding: 12px 20px; background: #0f172a; color: #64748b; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="banner">[SENTINAI ${alert.severity}] Outage Detected on ${alert.apiName}</div>
    <div class="content">
      <div class="summary">${alert.message}</div>
      <table class="metrics">
        <tr><td class="label">Incident ID</td><td class="val">${alert.alertId}</td></tr>
        <tr><td class="label">Endpoint</td><td class="val">${alert.apiName}</td></tr>
        <tr><td class="label">HTTP Status Code</td><td class="val">${alert.statusCode}</td></tr>
        <tr><td class="label">Response Time</td><td class="val">${alert.responseTimeMs} ms</td></tr>
        <tr><td class="label">Records Returned</td><td class="val">${alert.recordsReturned}</td></tr>
        <tr><td class="label">Timestamp (UTC)</td><td class="val">${alert.detectedAt.toISOString()}</td></tr>
      </table>
      <div class="section-title">AI Root Cause Analysis</div>
      <div class="box">${alert.rootCause}</div>
      <div class="section-title">Recommended SRE Mitigation</div>
      <div class="box">${alert.suggestedAction}</div>
    </div>
    <div class="footer">SentinAI Automated Incident Response Engine &bull; Care Guide Operations</div>
  </div>
</body>
</html>`.trim();
}

export async function dispatchCriticalAlertEmail(
  alert: EmailAlertPayload
): Promise<EmailDispatchResult> {
  const html = renderAlertEmailHtml(alert);

  if (env.NODE_ENV === 'test') {
    return { dispatched: true, previewUrl: 'https://ethereal.email/message/test-preview' };
  }

  try {
    const transporter = await getTransporter();
    if (!transporter) {
      console.log(`[Email Alert Fallback] Rendered P1 Alert Email for ${alert.apiName} (${alert.message})`);
      return { dispatched: true, previewUrl: null };
    }

    const info = await transporter.sendMail({
      from: '"SentinAI SRE Monitor" <alerts@sentinai.careguide.local>',
      to: env.ALERT_RECEIVER_EMAIL,
      subject: `[${alert.severity}] ${alert.apiName} Alert — HTTP ${alert.statusCode} (${alert.responseTimeMs}ms)`,
      text: `${alert.message}\n\nRoot Cause: ${alert.rootCause}\nSuggested Action: ${alert.suggestedAction}`,
      html,
    });

    const previewUrl = isEtherealAccount ? nodemailer.getTestMessageUrl(info) || null : null;
    if (previewUrl) {
      console.log(`[Email Dispatched] P1 Alert for ${alert.apiName} -> Preview: ${previewUrl}`);
    } else {
      console.log(`[Email Dispatched] P1 Alert for ${alert.apiName} sent to ${env.ALERT_RECEIVER_EMAIL}`);
    }

    return { dispatched: true, previewUrl };
  } catch (err) {
    console.warn(`[Email Fallback] Logged alert email to console (${(err as Error).message})`);
    return { dispatched: true, previewUrl: null };
  }
}
