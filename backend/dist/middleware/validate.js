"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAlertSchema = exports.monitorIngestionSchema = exports.telemetryItemSchema = void 0;
exports.validateBody = validateBody;
const zod_1 = require("zod");
exports.telemetryItemSchema = zod_1.z.object({
    api_name: zod_1.z.string().trim().min(1, 'api_name is required').max(100),
    response_time_ms: zod_1.z
        .number({ invalid_type_error: 'response_time_ms must be a number' })
        .int('response_time_ms must be an integer')
        .min(0, 'response_time_ms cannot be negative'),
    status_code: zod_1.z
        .number({ invalid_type_error: 'status_code must be a number' })
        .int('status_code must be an integer')
        .min(100, 'status_code must be between 100 and 599')
        .max(599, 'status_code must be between 100 and 599'),
    records_returned: zod_1.z
        .number({ invalid_type_error: 'records_returned must be a number' })
        .int('records_returned must be an integer')
        .min(0, 'records_returned cannot be negative'),
    timestamp: zod_1.z.string().optional(),
});
// Support both single telemetry payloads and batch arrays
exports.monitorIngestionSchema = zod_1.z.union([
    exports.telemetryItemSchema,
    zod_1.z.array(exports.telemetryItemSchema).min(1, 'Batch telemetry array cannot be empty'),
]);
exports.resolveAlertSchema = zod_1.z.object({
    operator_name: zod_1.z.string().trim().min(1).max(80).optional().default('SRE On-Call'),
    resolution_notes: zod_1.z
        .string()
        .trim()
        .min(1)
        .max(500)
        .optional()
        .default('Incident mitigated and verified healthy via SentinAI console.'),
});
function validateBody(schema) {
    return (req, res, next) => {
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            res.status(422).json({
                error: 'Validation Failed',
                message: 'Incoming payload violated telemetry schema constraints.',
                details: parsed.error.issues.map((issue) => ({
                    path: issue.path.join('.'),
                    message: issue.message,
                })),
            });
            return;
        }
        req.body = parsed.data;
        next();
    };
}
