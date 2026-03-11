import { Router } from 'express';
import { eventController } from '../controllers/event.controller.js';

const router = Router();

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Publish a new webhook event
 *     description: >
 *       Creates a webhook event and immediately queues it for delivery.
 *       Returns 202 Accepted because delivery happens asynchronously.
 *     tags: [Events]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [merchantId, eventType, payload]
 *             properties:
 *               merchantId:
 *                 type: string
 *                 format: uuid
 *               eventType:
 *                 type: string
 *                 example: payment.success
 *                 description: Must follow format category.action
 *               payload:
 *                 type: object
 *                 example:
 *                   amount: 5000
 *                   currency: INR
 *                   orderId: ord_123
 *     responses:
 *       202:
 *         description: Event accepted for async delivery
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/WebhookEvent'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Merchant not found
 *       403:
 *         description: Merchant is inactive
 */
router.post('/', eventController.publish);

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get event details with all delivery attempts
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Event with delivery history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/WebhookEvent'
 *                     - type: object
 *                       properties:
 *                         deliveryAttempts:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/DeliveryAttempt'
 *       404:
 *         description: Event not found
 */
router.get('/:id', eventController.getById);

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: Get all events for a merchant
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [PENDING, DELIVERED, FAILED, DEAD]
 *     responses:
 *       200:
 *         description: List of events
 *       400:
 *         description: merchantId is required
 */
router.get('/', eventController.getByMerchant);

export default router;