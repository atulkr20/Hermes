import { Router } from 'express';
import { merchantController } from '../controllers/merchant.controller.js';

const router = Router();

router.post('/register', merchantController.register);

router.get('/:id', merchantController.getById);

router.patch('/:id/toggle', merchantController.toggle);

export default router;