import fs from 'fs';
import path from 'path';
import { initializeDatabase, prisma } from '../config/prisma';
import { monitorIngestionSchema, TelemetryInput } from '../middleware/validate';
import { processTelemetryItem } from '../controllers/monitor.controller';

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

async function runStaticFileMonitor() {
  const argPath = process.argv[2] || 'sample_data/sample_input.json';
  const resolvedPath = path.resolve(process.cwd(), argPath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`${ANSI.red}[Error] Static JSON file not found at: ${resolvedPath}${ANSI.reset}`);
    process.exit(1);
  }

  await initializeDatabase();

  const rawContent = fs.readFileSync(resolvedPath, 'utf-8');
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch {
    console.error(`${ANSI.red}[Error] Invalid JSON syntax in file: ${resolvedPath}${ANSI.reset}`);
    process.exit(1);
  }

  const validation = monitorIngestionSchema.safeParse(parsedJson);
  if (!validation.success) {
    console.error(`${ANSI.red}[Validation Error] JSON payload failed schema validation:${ANSI.reset}`);
    for (const issue of validation.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  const items: TelemetryInput[] = Array.isArray(validation.data)
    ? validation.data
    : [validation.data];

  console.log(`\n${ANSI.bold}${ANSI.cyan}SentinAI Static JSON Telemetry Processor${ANSI.reset}`);
  console.log(`${ANSI.dim}Source File : ${resolvedPath}`);
  console.log(`Records     : ${items.length}${ANSI.reset}\n`);

  let healthyCount = 0;
  let anomalyCount = 0;

  for (const item of items) {
    const result = await processTelemetryItem(item);
    if (!result.is_anomaly) {
      healthyCount++;
      console.log(
        `${ANSI.green}✔ [HEALTHY]${ANSI.reset}  ${ANSI.bold}${item.api_name.padEnd(22)}${ANSI.reset} | HTTP ${item.status_code} | ${String(item.response_time_ms).padStart(4)}ms | ${item.records_returned} records`
      );
    } else {
      anomalyCount++;
      const badgeColor = result.severity === 'CRITICAL' ? ANSI.red : ANSI.yellow;
      console.log(
        `${badgeColor}✖ [${result.severity.padEnd(8)}]${ANSI.reset} ${ANSI.bold}${item.api_name.padEnd(22)}${ANSI.reset} | HTTP ${item.status_code} | ${String(item.response_time_ms).padStart(4)}ms | ${item.records_returned} records`
      );
      console.log(`   ${ANSI.cyan}↳ Alert:${ANSI.reset} ${result.message}`);
      if (result.ai_diagnosis) {
        console.log(`   ${ANSI.dim}↳ Root Cause: ${result.ai_diagnosis.root_cause_explanation}${ANSI.reset}`);
        console.log(`   ${ANSI.dim}↳ Action    : ${result.ai_diagnosis.suggested_action}${ANSI.reset}`);
      }
    }
  }

  console.log(`\n${ANSI.bold}Summary:${ANSI.reset} ${items.length} processed (${ANSI.green}${healthyCount} healthy${ANSI.reset}, ${ANSI.red}${anomalyCount} anomalies${ANSI.reset})\n`);
  await prisma.$disconnect();
}

runStaticFileMonitor().catch(async (err) => {
  console.error('[CLI Runner Error]', err);
  await prisma.$disconnect();
  process.exit(1);
});
