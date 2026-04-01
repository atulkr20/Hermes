import { Router } from 'express';
import { dlqController } from '../controllers/dlq.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();
router.get('/', dlqController.getAllDeadEvents);
router.get('/:eventId', dlqController.getDeadEventById);
router.post('/:eventId/requeue', authMiddleware, dlqController.requeueEvent);

export default router;