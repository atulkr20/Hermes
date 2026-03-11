import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hermes — Webhook Delivery System',
      version: '1.0.0',
      description: `
  A production-grade webhook delivery infrastructure inspired by Stripe's internal event pipeline.
  
  ## Features
  - Merchant registration with auto-generated HMAC signing secrets
  - Reliable webhook delivery with exponential backoff retries
  - Full delivery attempt audit trail
  - Dead Letter Queue with requeue support
  - HMAC-SHA256 payload signing and verification
      `,
      contact: {
        name: 'Hermes API',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        // Defines the Bearer token auth scheme
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      // Reusable response schemas, define once, reference everywhere
      schemas: {
        Merchant: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            endpointUrl: { type: 'string', format: 'uri' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        WebhookEvent: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            merchantId: { type: 'string', format: 'uuid' },
            eventType: { type: 'string', example: 'payment.success' },
            payload: { type: 'object' },
            status: {
              type: 'string',
              enum: ['PENDING', 'DELIVERED', 'FAILED', 'DEAD'],
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        DeliveryAttempt: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            eventId: { type: 'string', format: 'uuid' },
            attemptNumber: { type: 'integer' },
            statusCode: { type: 'integer', nullable: true },
            responseBody: { type: 'string', nullable: true },
            success: { type: 'boolean' },
            deliveredAt: { type: 'string', format: 'date-time' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
      },
    },
  },
  
  // It scans these files and builds the full spec from the comments
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);