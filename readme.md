# Hermes 🪽

A production-grade webhook delivery infrastructure built with Node.js and TypeScript.
Inspired by how Stripe and Razorpay handle reliable event delivery internally.

---

## What is Hermes?

When a payment event occurs (like `payment.success` or `refund.processed`), Hermes
reliably delivers an HTTP notification to a registered merchant's endpoint.

It handles the hard parts:
- Retries on failure using exponential backoff
- Signs every payload with HMAC-SHA256 so merchants can verify authenticity
- Logs every delivery attempt as a full audit trail
- Moves permanently failed webhooks to a Dead Letter Queue
- Supports requeuing dead events once the underlying issue is fixed

---

## Architecture
```
                        ┌─────────────────────────────────────────────┐
                        │                  Hermes                      │
                        │                                              │
   POST /api/events     │   ┌──────────────┐      ┌────────────────┐  │
  ──────────────────>   │   │   Express    │      │   BullMQ       │  │
                        │   │   REST API   │─────>│   Queue        │  │
                        │   └──────────────┘      └───────┬────────┘  │
                        │          │                      │           │
                        │          ▼                      ▼           │
                        │   ┌──────────────┐      ┌────────────────┐  │
                        │   │  PostgreSQL  │      │  Delivery      │  │
                        │   │  (Prisma)    │<─────│  Worker        │  │
                        │   └──────────────┘      └───────┬────────┘  │
                        │                                 │           │
                        └─────────────────────────────────┼───────────┘
                                                          │
                                    ┌─────────────────────┼──────────────────────┐
                                    │                     │                      │
                                    ▼                     ▼                      ▼
                              ┌──────────┐        ┌─────────────┐        ┌─────────────┐
                              │  200 OK  │        │  Non-2xx /  │        │  Max retries│
                              │          │        │  Timeout    │        │  exceeded   │
                              └────┬─────┘        └──────┬──────┘        └──────┬──────┘
                                   │                     │                      │
                                   ▼                     ▼                      ▼
                            Mark DELIVERED        Exponential              Move to DLQ
                            Log attempt           Backoff retry            Mark DEAD
                                                  (up to 5x)              Log attempt
```

---

## Retry Schedule

| Attempt | Delay       |
|---------|-------------|
| 1       | Immediate   |
| 2       | 1 minute    |
| 3       | 5 minutes   |
| 4       | 30 minutes  |
| 5       | 2 hours     |

After 5 failed attempts the event is marked `DEAD` and moved to the Dead Letter Queue.

---

## Tech Stack

| Layer       | Technology                |
|-------------|---------------------------|
| Runtime     | Node.js + TypeScript       |
| Framework   | Express.js                |
| Database    | PostgreSQL + Prisma ORM   |
| Queue       | Redis + BullMQ            |
| Signing     | HMAC-SHA256 (crypto)      |
| Validation  | Zod                       |
| Docs        | Swagger / OpenAPI 3.0     |
| Infra       | Docker Compose            |

---

## Database Schema
```
Merchant
├── id (uuid)
├── name
├── endpointUrl
├── secretKey        ← HMAC signing key, shown only at registration
├── isActive
└── createdAt

WebhookEvent
├── id (uuid)
├── merchantId       → Merchant
├── eventType        (e.g. payment.success)
├── payload          (jsonb)
├── status           PENDING | DELIVERED | FAILED | DEAD
└── createdAt

DeliveryAttempt
├── id (uuid)
├── eventId          → WebhookEvent
├── attemptNumber
├── statusCode       (nullable — null on timeout)
├── responseBody     (first 500 chars)
├── success
└── deliveredAt

DeadLetterQueue
├── id (uuid)
├── eventId          → WebhookEvent (unique)
├── reason
├── failedAt
└── requeuedAt       (nullable — set when requeued)
```

---

## Project Structure
```
hermes/
├── src/
│   ├── config/
│   │   ├── db.ts                  # Prisma singleton
│   │   ├── redis.ts               # Redis connections (app + BullMQ)
│   │   └── swagger.ts             # OpenAPI spec config
│   ├── controllers/               # HTTP request handlers
│   ├── services/                  # Business logic
│   ├── routes/                    # Express routers + Swagger annotations
│   ├── queue/
│   │   ├── delivery.queue.ts      # BullMQ queue instance
│   │   └── delivery.worker.ts     # Core delivery worker with retry logic
│   ├── middlewares/
│   │   ├── error.middleware.ts    # Global error handler
│   │   └── auth.middleware.ts     # JWT authentication
│   ├── dtos/                      # Zod validation schemas
│   ├── mock-receiver/
│   │   └── receiver.ts            # Simulated merchant endpoint (port 4000)
│   ├── app.ts                     # Express app setup
│   └── server.ts                  # HTTP server + worker boot
├── prisma/
│   └── schema.prisma
├── docker-compose.yml
└── .env.example
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose

### 1. Clone and install
```bash
git clone https://github.com/yourusername/hermes.git
cd hermes
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```

The defaults work out of the box with Docker Compose. No changes needed to get started.

### 3. Start infrastructure
```bash
docker-compose up -d
```

This starts PostgreSQL on port 5433 and Redis on port 6379.

### 4. Run database migrations
```bash
npm run db:migrate
```

### 5. Start the server
```bash
# Terminal 1 — main API server
npm run dev

# Terminal 2 — mock merchant receiver
npx ts-node src/mock-receiver/receiver.ts
```

---

## API Reference

Full interactive docs available at:
```
http://localhost:3000/api-docs
```

### Quick Reference

#### Merchants
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/merchants/register` | Register merchant, get secretKey |
| GET | `/api/merchants/:id` | Get merchant details |
| PATCH | `/api/merchants/:id/toggle` | Enable or disable merchant |

#### Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/events` | Publish a webhook event |
| GET | `/api/events/:id` | Get event + delivery attempts |
| GET | `/api/events?merchantId=` | List events for a merchant |

#### Dead Letter Queue
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dlq` | List all dead events |
| GET | `/api/dlq/:eventId` | Get specific dead event |
| POST | `/api/dlq/:eventId/requeue` | Requeue a dead event |

---

## Testing the Full Flow

### Happy path — successful delivery
```bash
# 1. Register a merchant pointing to the mock receiver
curl -X POST http://localhost:3000/api/merchants/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Payments",
    "endpointUrl": "http://localhost:4000/receive"
  }'

# Copy the secretKey and merchantId from the response

# 2. Publish a webhook event
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "<paste-merchant-id>",
    "eventType": "payment.success",
    "payload": {
      "amount": 5000,
      "currency": "INR",
      "orderId": "ord_123"
    }
  }'

# 3. Check delivery status
curl http://localhost:3000/api/events/<event-id>
```

You will see the mock receiver log the incoming webhook and the event status
change to `DELIVERED`.

### Retry and DLQ flow — failed delivery
```bash
# 1. Register a merchant pointing to the failing endpoint
curl -X POST http://localhost:3000/api/merchants/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Broken Merchant",
    "endpointUrl": "http://localhost:4000/receive/fail"
  }'

# 2. Publish an event — it will retry 5 times then go to DLQ
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "<paste-merchant-id>",
    "eventType": "refund.processed",
    "payload": { "refundId": "ref_456", "amount": 1000 }
  }'

# 3. Watch it move to DLQ
curl http://localhost:3000/api/dlq

# 4. Requeue it
curl -X POST http://localhost:3000/api/dlq/<event-id>/requeue
```

---

## Webhook Signature Verification

Every webhook includes an `X-Webhook-Signature` header:
```
X-Webhook-Signature: sha256=a3f2c1...
```

Merchants verify it like this:
```typescript
import crypto from 'crypto';

function verifyWebhook(payload: object, signature: string, secret: string): boolean {
  const expected = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex')}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

---

## Key Design Decisions

**Why manual retry control instead of BullMQ built-in retries?**
Every attempt is stored in PostgreSQL. If Redis crashes, the DB is the source of truth — no jobs are silently lost and we always know exactly which attempt we're on.

**Why thin queue pattern?**
Only the `eventId` is stored in Redis. The full payload lives in PostgreSQL. This keeps Redis memory usage minimal and the DB as the single source of truth.

**Why `timingSafeEqual` for signature comparison?**
Standard string comparison (`===`) is vulnerable to timing attacks. `timingSafeEqual` runs in constant time regardless of where strings differ, making it impossible to deduce the secret character by character from response times.

**Why 202 instead of 201 for event publishing?**
202 Accepted means the request was received and will be processed asynchronously. 201 Created implies the action is complete. Since delivery happens in a background worker, 202 is semantically correct.

---

## License

MIT