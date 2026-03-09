import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';

import './queue/delivery.worker.js';

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, () => {
    console.log('');
    console.log(`Hermes is runnig on port ${PORT} `);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Health: http://localhost:${PORT}/health`);
});

process.on('SIGTERM', async () => {
    console.log(' SIGTERM received - shutting down gracefully');

    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0)
    });
});

process.on('SIGINT', async () => {
    console.log(' SIGINT received - shutting down gracefully');

    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

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