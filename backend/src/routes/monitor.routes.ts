import { Router } from 'express';
import { ingestTelemetry } from '../controllers/monitor.controller';
import { validateBody, monitorIngestionSchema } from '../middleware/validate';

const router = Router();

router.post('/', validateBody(monitorIngestionSchema), ingestTelemetry);
router.post('/batch', validateBody(monitorIngestionSchema), ingestTelemetry);

export default router;
