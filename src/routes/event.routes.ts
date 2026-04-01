import { Router } from 'express';
import { eventController } from '../controllers/event.controller.js';

const router = Router();
router.post('/', eventController.publish);
router.get('/:id', eventController.getById);
router.get('/', eventController.getByMerchant);

export default router;