import { Router } from 'express';
import { dlqController } from '../controllers/dlq.controller.js';

const router = Router();

router.get('/', dlqController.getAllDeadEvents);

router.get('/:eventId', dlqController.getDeadEventById);

router.post('/:eventId/requeue', dlqController.requeueEvent);

export default router;