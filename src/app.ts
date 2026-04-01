import express from 'express';
import type { Application, Request, Response } from 'express';
import dotenv from 'dotenv';


// Routes
import merchantRoutes from './routes/merchant.routes.js';
import eventRoutes from './routes/event.routes.js';
import dlqRoutes from './routes/dlq.routes.js';

// Middlewares
import { errorMiddleware } from './middlewares/error.middleware.js';

dotenv.config();

const app: Application = express();

//Global Middlewares

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// GET - for browser visits
app.get('/test-receiver', (_req: Request, res: Response) => {
    return res.status(200).json({
        message: 'Hermes test receiver is live',
        usage: 'Register this URL as your merchant endpointUrl to test webhook delivery',
        endpoint: 'https://hermes.itsatul.tech/test-receiver',
    });
});

// POST - for actual webhook delivery
app.post('/test-receiver', (req: Request, res: Response) => {
    console.log('Test receiver hit:', {
        event: req.headers['x-webhook-event'],
        attempt: req.headers['x-delivery-attempt'],
        signature: req.headers['x-webhook-signature'],
        payload: req.body,
    });

    return res.status(200).json({
        received: true,
        message: 'Webhook received successfully',
        event: req.headers['x-webhook-event'],
        deliveredAt: new Date().toISOString(),
    });
});

app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        service: 'hermes',
        timestamp: new Date().toISOString(),
    });
});
app.use('/dashboard', express.static(process.cwd() + '/src/public'));

//API Routes
app.use('/api/merchants', merchantRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/dlq', dlqRoutes);

// 404 Handler

app.use((_req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

// Gloabl error middleware

app.use(errorMiddleware);

export default app;
