import { Router } from 'express';
import { merchantController } from '../controllers/merchant.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @swagger
 * /api/merchants/register:
 *   post:
 *     summary: Register a new merchant
 *     description: >
 *       Creates a new merchant and auto-generates an HMAC signing secret.
 *       The secretKey is returned ONLY in this response — store it securely.
 *       It cannot be retrieved again.
 *     tags: [Merchants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, endpointUrl]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Acme Payments
 *               endpointUrl:
 *                 type: string
 *                 format: uri
 *                 example: http://localhost:4000/receive
 *     responses:
 *       201:
 *         description: Merchant registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Merchant'
 *                     - type: object
 *                       properties:
 *                         secretKey:
 *                           type: string
 *                           example: whsec_a3f2...
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', merchantController.register);

/**
 * @swagger
 * /api/merchants/{id}:
 *   get:
 *     summary: Get merchant by ID
 *     tags: [Merchants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The merchant UUID
 *     responses:
 *       200:
 *         description: Merchant found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Merchant'
 *       404:
 *         description: Merchant not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', authMiddleware, merchantController.getById);

/**
 * @swagger
 * /api/merchants/{id}/toggle:
 *   patch:
 *     summary: Toggle merchant active status
 *     tags: [Merchants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isActive]
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Merchant status updated
 *       404:
 *         description: Merchant not found
 */
router.patch('/:id/toggle', authMiddleware, merchantController.toggle);

export default router;