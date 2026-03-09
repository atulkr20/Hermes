import prisma from "../config/db.js";
import  { deliveryQueue } from '../queue/delivery.queue.js';

export const dlqService = {

    // Get all dead events with their original event details

    async getAllDeadEvents() {
        const deadEvents = await prisma.deadLetterQueue.findMany({
            include: {
                event: {
                    include: {
                        merchant: {
                            select: {
                                id: true,
                                name: true, 
                                endpointUrl: true,
                            },
                        },
                        deliveryAttempts: {
                            orderBy: { attemptNumber: 'asc' },
                        },
                    },
                },
            },
            orderBy: { failedAt: 'desc' },
        });
        return deadEvents;
    },

    // Requeue a dead event -  (giving another chance at delivery)
    async requeueEvent(eventId: string) {
        // Find teh DLQ entry

        const dlqEntry = await prisma.deadLetterQueue.findUnique({
            where: { eventId },
            include: { event: true },
        });

        if (!dlqEntry) {
            throw new Error('DLQ_ENTRY_NOT_FOUND');
        }

        if (dlqEntry.requeuedAt) {
            throw new Error('EVENT_ALREADY_REQUIRED');
        }

        await prisma.$transaction(async (tx) => {
            await tx.webhookEvent.update({
                where: { id: eventId },
                data: { status: 'PENDING' },
            });

            // Deleting previous delivery attempts so worker starts counting from attempt 1 again
            await tx.deliveryAttempt.deleteMany({
                where: { eventId },
            });

            // Mark DLQ entry as requeued with timestamp
            await tx.deadLetterQueue.update({
                where: { eventId },
                data: { requeuedAt: new Date() },
            });
            
        });

        // Push back to delivery queue
        await deliveryQueue.add(
            'deliver.webhook',
            { eventId },
            {
                attempts: 1,
                removeOnComplete: true, 
                removeOnFail: false,
            }
        );

        return { eventId, requested: true };
    },

    // Get a single DLQ entry by eventId
    async getDeadEventById(eventId: string) {
        const entry = await prisma.deadLetterQueue.findUnique({
            where: { eventId },
            include: {
                event: {
                    include: {
                        deliveryAttempts: {
                            orderBy: { attemptNumber: 'asc'},
                        },
                    },
                },
            },
        });
        return entry;
    },
};