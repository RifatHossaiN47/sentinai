import { Router } from 'express';
import { getAlerts, resolveAlert, resetDemoState } from '../controllers/alert.controller';
import { validateBody, resolveAlertSchema } from '../middleware/validate';

const router = Router();

router.get('/', getAlerts);
router.post('/reset', resetDemoState);
router.patch('/:id/resolve', validateBody(resolveAlertSchema), resolveAlert);

export default router;
