import { Queue } from 'bullmq';
import { redisConnection } from  '../config/redis.js';

export const DELIVERY_QUEUE_NAME = 'webhook-delivery';

export const deliveryQueue = new Queue(DELIVERY_QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
    },
});


console.log('Webhook delivery queue initialized');