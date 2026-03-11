import { Worker, Job } from 'bullmq';
import axios, { AxiosError } from 'axios';
import prisma from '../config/db.js';
import { redisConnection } from '../config/redis.js';
import { signingService } from '../services/signing.service.js';
import { deliveryQueue, DELIVERY_QUEUE_NAME } from './delivery.queue.js';

interface DeliveryJobData {
    eventId: string;
}

// Exponential Backoff delay in milliseconds

const BACKOFF_DELAYS: Record<number, number> = {
    2: 60_000,
    3: 300_000,
    4: 1_800_000,
    5: 7_200_000,
};

const MAX_ATTEMPTS = Number(process.env.MAX_RETRY_ATTEMPTS) || 5;
const REQUEST_TIMEOUT = Number(process.env.REQUEST_TIMEOUT_MS) || 5000;

// The core processing function - called by BullMQ for every job 
async function processDelivery(job: Job<DeliveryJobData>): Promise<void> {
    const { eventId } = job.data;

    // Fetch event and merchant from DB 
    const event = await prisma.webhookEvent.findUnique({
        where: { id: eventId },
        include: { merchant: true },
    });

    if(!event) {
        throw new Error(`Event ${eventId} not found in database`);
    }

    if (event.status === 'DELIVERED') {
        console.log(`Event ${eventId} already delivered, skipping`);
        return;
    }

    const { merchant } = event;

    // Figure out which attempt number this is

    const previousAttempts = await prisma.deliveryAttempt.count({
        where: { eventId },
    });

    const attemptNumber = previousAttempts + 1;

    console.log(`Attempting delivery for event ${eventId} - attempt ${attemptNumber}/${MAX_ATTEMPTS}`);

    // Sign the payloasd
    // payload is stored as Prisma's jsonvalue type

    const payload = event.payload as Record<string, unknown>;
    const { signature } = signingService.signPayload(payload, merchant.secretKey);

    // Attempt HTTP delivery
    let statusCode: number | null = null;
    let responseBody: string | null = null;
    let success = false;

    try {
        const response = await axios.post(
            merchant.endpointUrl,
            payload,
            {
                timeout: REQUEST_TIMEOUT,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Signature': signature,
                    'X-Webhook-Event': event.eventType,
                    'X-Delivery-Attempt': String(attemptNumber),
                    'X-Webhook-Id': event.id,
                },
            }
        );

        statusCode = response.status;

        // Store only first 500 chars - response bodies can be huge

        responseBody = JSON.stringify(response.data).substring(0, 500);
        success = true;

        console.log(`Event ${eventId} delivered successfully - status ${statusCode}`);
    } catch (error) {
        const axiosError = error as AxiosError;

        if (axiosError.response) {
            statusCode = axiosError.response.status;
            responseBody = JSON.stringify(axiosError.response.data).substring(0, 500);
        } else if (axiosError.code === 'ECONNABORTED') {
            statusCode = null;
            responseBody = axiosError.message.substring(0, 500);
        }

        success = false;
        console.log(`Event ${eventId} delivery failed - attempt ${attemptNumber} - ${responseBody}`);
    }

    // log the delivery asttempy in DB
    await prisma.deliveryAttempt.create({
        data: {
            eventId,
            attemptNumber,
            statusCode,
            responseBody,
            success,
        },
    });

    // Handle Outcome

    if (success) {
        await prisma.webhookEvent.update({
            where: { id: eventId },
            data: { status: 'DELIVERED'},
        });
        return; // Job is done here

    }

    //  if delivery failed 
    if(attemptNumber >= MAX_ATTEMPTS) {
        // if used all retries move to DLQ (dead Leter Queues)
        console.log(`Event ${eventId} exhausted all ${MAX_ATTEMPTS} attempts - moving to DLQ`);

        // Update event status to Dead

        await prisma.webhookEvent.update({
            where: { id: eventId },
            data: { status: 'DEAD'},
        });

        // Create DLQ entry
        await prisma.deadLetterQueue.create({
            data: {
                eventId,
                reason: `Max retries exhausted. Last attempt: status=${statusCode ?? 'timeout'}, response=${responseBody}`,

            },
        });
    } else {
        // More retries remaining -- re-add to queue with backoff
        const nextAttempt = attemptNumber + 1;
        const delay = BACKOFF_DELAYS[nextAttempt] ?? 60_000;

        console.log(`Re-queuing event ${eventId} - next attempt ${nextAttempt} in ${delay / 1000}s`);

        // mark event as failed 
        await prisma.webhookEvent.update({
            where: { id: eventId },
            data: { status: 'FAILED' },
        });

        // Re-add to queue with delay

        await deliveryQueue.add(
            'deliver.webhook',
            { eventId },
            {
                delay,
                attempts: 1,
                removeOnComplete: true, 
                removeOnFail: false,
            }
        );
    }

}

// Create and export the worker
export const deliveryWorker = new Worker<DeliveryJobData>(
    DELIVERY_QUEUE_NAME,
    processDelivery,
    {
        connection: redisConnection,
        concurrency: 5, // Process up to 5 jobs simultaneously

    }
);

// Worker lifecycle event handlers 

deliveryWorker.on('completed', (Job) => {
    console.log(`Job ${Job.id} completed`);
});

deliveryWorker.on('failed', (job, error) => {
    console.error(`Job ${job?.id} failed:`, error.message);
});

deliveryWorker.on('error', (error) => {
    console.error('worker error:', error);
});

console.log('Delivery worker started');