import { Redis } from 'ioredis';

export const redisConnection = {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null, // Required for BullMQ blocking commands
};

// Single Redis instance for both BullMQ and app usage
export const redis = new Redis(redisConnection);

redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err: unknown) => console.error('Redis error:', err));