import { Router } from 'express';
import { dlqController } from '../controllers/dlq.controller.js';

const router = Router();

/**
 * @swagger
 * /api/dlq:
 *   get:
 *     summary: List all dead events
 *     description: Returns all webhook events that permanently failed delivery
 *     tags: [Dead Letter Queue]
 *     responses:
 *       200:
 *         description: List of dead events with full delivery history
 */
router.get('/', dlqController.getAllDeadEvents);

/**
 * @swagger
 * /api/dlq/{eventId}:
 *   get:
 *     summary: Get a specific dead event
 *     tags: [Dead Letter Queue]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Dead event details
 *       404:
 *         description: No DLQ entry found
 */
router.get('/:eventId', dlqController.getDeadEventById);

/**
 * @swagger
 * /api/dlq/{eventId}/requeue:
 *   post:
 *     summary: Requeue a dead event
 *     description: >
 *       Resets the event status to PENDING, clears delivery history,
 *       and re-adds it to the delivery queue for another full round of attempts.
 *     tags: [Dead Letter Queue]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Event requeued successfully
 *       404:
 *         description: No DLQ entry found
 *       409:
 *         description: Event already requeued
 */
router.post('/:eventId/requeue', dlqController.requeueEvent);

export default router;