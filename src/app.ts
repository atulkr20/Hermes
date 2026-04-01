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

// Public test endpoint for demos
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
