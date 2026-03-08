import { Queue } from 'bullmq';
import { redisConnection } from  '../config/redis.js';

export const deliveryQueue = new Queue('Webhook-delivery', {
    connection: redisConnection,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
    },
});


console.log('Webhook delivery queue initialized');