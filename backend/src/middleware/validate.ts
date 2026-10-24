import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export const telemetryItemSchema = z.object({
  api_name: z.string().trim().min(1, 'api_name is required').max(100),
  response_time_ms: z
    .number({ invalid_type_error: 'response_time_ms must be a number' })
    .int('response_time_ms must be an integer')
    .min(0, 'response_time_ms cannot be negative'),
  status_code: z
    .number({ invalid_type_error: 'status_code must be a number' })
    .int('status_code must be an integer')
    .min(100, 'status_code must be between 100 and 599')
    .max(599, 'status_code must be between 100 and 599'),
  records_returned: z
    .number({ invalid_type_error: 'records_returned must be a number' })
    .int('records_returned must be an integer')
    .min(0, 'records_returned cannot be negative'),
  timestamp: z.string().optional(),
});

// Support both single telemetry payloads and batch arrays
export const monitorIngestionSchema = z.union([
  telemetryItemSchema,
  z.array(telemetryItemSchema).min(1, 'Batch telemetry array cannot be empty'),
]);

export const resolveAlertSchema = z.object({
  operator_name: z.string().trim().min(1).max(80).optional().default('SRE On-Call'),
  resolution_notes: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .optional()
    .default('Incident mitigated and verified healthy via SentinAI console.'),
});

export type TelemetryInput = z.infer<typeof telemetryItemSchema>;
export type ResolveAlertInput = z.infer<typeof resolveAlertSchema>;

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
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
