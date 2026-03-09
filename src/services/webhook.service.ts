import prisma from "../config/db.js";
import type { Prisma } from '@prisma/client';
import type { createEventInput } from "../dtos/event.dto.js";
import { deliveryQueue } from '../queue/delivery.queue.js';
 
export const webhookService = {
    async publishEvent(data: createEventInput) {

        const merchant = await prisma.merchant.findUnique({
            where: { id: data.merchantId},
        });

        if (!merchant) {

            throw new Error('MERCHANT_NOT_FOUND');
        }

        if (!merchant.isActive) {
            throw new Error('MERCHANT_INACTIVE');
        }

        // Create a webhook event

        const event = await prisma.webhookEvent.create({
            data: {
                merchantId: data.merchantId,
                eventType: data.eventType,
                payload: data.payload as Prisma.InputJsonValue,
                status: 'PENDING',
            },
        });

        await deliveryQueue.add(
            'deliver.webhook',
            { eventId: event.id},
            {
                // BullMQ job options
                attempts: 1,
                removeOnComplete: true,
                removeOnFail: false,
            }
        );

        return event;
    },

    async getEventById(id: string) {
        const event = await prisma.webhookEvent.findUnique({
            where: { id },
            include: {
                deliveryAttempts: {
                    orderBy: { attemptNumber: 'asc' },
                },
            },
        });

        return event;
    },

    async getEventsByMerchant(merchantId: string, status?: string ) {
        const event = await prisma.webhookEvent.findMany({
            where: {
                merchantId, 
                ...(status && { status: status as any }),
            },
            include: {
                deliveryAttempts: {
                    orderBy: { attemptNumber: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return event;
    },
};