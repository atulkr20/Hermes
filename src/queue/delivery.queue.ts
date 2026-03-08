import { Queue } from 'bullmq';
import { redis } from  '../config/redis.js';

export const deliveryQueue = new Queue('Webhook-delivery', {
    connection: redis,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
    },
});


console.log('Webhook delivery queue initialized');