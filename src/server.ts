import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import prisma from './config/db.js';
import { redis } from './config/redis.js';
import { deliveryQueue } from './queue/delivery.queue.js';
import { deliveryWorker } from './queue/delivery.worker.js';

const PORT = Number(process.env.PORT) || 3000;
let isShuttingDown = false;

const server = app.listen(PORT, () => {
    console.log('');
    console.log(`Hermes is runnig on port ${PORT} `);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Health: http://localhost:${PORT}/health`);
});

function closeHttpServer(): Promise<void> {
    return new Promise((resolve, reject) => {
        server.close((error?: Error) => {
            if (error) return reject(error);
            resolve();
        });
    });
}

async function shutdown(signal: string): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`${signal} received - shutting down gracefully`);

    try {
        await closeHttpServer();
        console.log('HTTP server closed');

        await deliveryWorker.close();
        console.log('Delivery worker closed');

        await deliveryQueue.close();
        console.log('Delivery queue closed');

        await redis.quit();
        console.log('Redis connection closed');

        await prisma.$disconnect();
        console.log('Prisma disconnected');

        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
}

process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
    void shutdown('SIGINT');
});

// Handle unhandled promise rejections

// Handle unhandled promise rejections

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection:', promise);
    console.error('Reason:', reason);
});

// Handle uncaught exceptions

process.on('uncaughtException', (error) => {
    console.error('uncaught Exception:', error);
    process.exit(1);
});

export default server;