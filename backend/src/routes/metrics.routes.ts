import { Router } from 'express';
import { getSystemMetrics } from '../controllers/metrics.controller';

const router = Router();

router.get('/', getSystemMetrics);

export default router;
