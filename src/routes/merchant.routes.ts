import { Router } from 'express';
import { merchantController } from '../controllers/merchant.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();
router.post('/register', merchantController.register);
router.get('/:id', merchantController.getById);
router.patch('/:id/toggle', authMiddleware, merchantController.toggle);

export default router;