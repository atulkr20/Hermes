import express from 'express';
import type { Application, Request, Response } from 'express';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import path from 'path';
import { fileURLToPath } from 'url';


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

app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        service: 'hermes',
        timestamp: new Date().toISOString(),
    });
});
app.use('/dashboard', express.static(process.cwd() + '/src/public'));


app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Hermes API Docs',
  customCss: '.swagger-ui .topbar { background-color: #1a1a2e; }',
}));

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
