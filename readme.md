# Hermes 🪽

Production-grade webhook delivery infrastructure built with Node.js + TypeScript.
Inspired by how Stripe and Razorpay handle reliable event delivery internally.

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

## Stack

Node.js · TypeScript · Express · PostgreSQL · Prisma · Redis · BullMQ · Zod

---

## Retry Schedule

| Attempt | Delay      |
|---------|------------|
| 1       | Immediate  |
| 2       | 1 minute   |
| 3       | 5 minutes  |
| 4       | 30 minutes |
| 5       | 2 hours    |

After 5 failed attempts the event is marked `DEAD` and moved to the Dead Letter Queue.

---

## Setup
```bash
git clone https://github.com/yourusername/hermes.git
cd hermes
npm install
cp .env.example .env
docker-compose up -d
npm run db:migrate
npm run dev
```

Mock receiver (for local testing):
```bash
npm run mock
```

---

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/merchants/register` | Register merchant, returns secretKey once |
| GET | `/api/merchants/:id` | Get merchant |
| PATCH | `/api/merchants/:id/toggle` | Enable or disable merchant |
| POST | `/api/events` | Publish a webhook event |
| GET | `/api/events/:id` | Get event + delivery attempts |
| GET | `/api/events?merchantId=` | List events for a merchant |
| GET | `/api/dlq` | List all dead events |
| POST | `/api/dlq/:eventId/requeue` | Requeue a dead event |

---

## Signature Verification

Every webhook includes `X-Webhook-Signature: sha256=<hmac>`.
```typescript
import crypto from 'crypto';

function verify(payload: object, signature: string, secret: string): boolean {
  const expected = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

---

## License

MIT