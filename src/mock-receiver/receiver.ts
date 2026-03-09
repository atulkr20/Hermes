import express, { Request, Response } from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// verify the HMAC signature
function verifyWebhookSignature(
    payload: Record<string, unknown>,
    signature: string, 
    secretKey: string
): boolean {
    try {
        const expectedSignature = `sha256=${crypto
            .createHmac('sha256', secretKey)
            .update(JSON.stringify(payload))
            .digest('hex')
        }`;

        const sigBuffer = Buffer.from(signature);
        const expectedBuffer = Buffer.from(expectedSignature);

        if(sigBuffer.length !== expectedBuffer.length) return false;
        return crypto.timingSafeEqual(sigBuffer, expectedBuffer);


    } catch {
        return false;
    }
}

// Simulates a merchant endpoint that successfully processes webhooks

app.post('/receive', (req: Request, res: Response) => {
    const signature = req.headers['x-webhook-signature'] as string;
    const eventType = req.headers['x-webhook-event'] as string;
    const attemptNumber = req.headers['x-delivery-attempt'] as string;
    const webhookId = req.headers['x-webhook-id'] as string;
    const payload = req.body;

    console.log('Webhook received at /receive');
    console.log('Event Type :', eventType);
    console.log('Webhook ID :', webhookId);
    console.log('Attempt Number :', attemptNumber);
    console.log('Signature :', signature);
    console.log('Payload :', JSON.stringify(payload, null, 2));


    const merchantSecret = process.env.MERCHANT_SECRET ?? '';

    if (merchantSecret) {
        const isValid = verifyWebhookSignature(payload, signature, merchantSecret);
        console.log('Signatre Valid:', isValid ? 'YES' : 'NO');
    } else {
        console.log('Signature valid: MERCHANT_SECRET not set - skipping verification');

    }

    return res.status(200).json({
        received: true, 
        message: 'Webhook processed successfully',
        webhookId,
    });
});

// Merchant endpoint that is broken or temporarily down

app.post('/receive/fail', (req: Request, res: Response) => {
    const eventType = req.headers['x-webhook-event'] as string;
    const attemptNumber = req.headers['x-webhook-attempt'] as string;
    const webhookId = req.headers['x-webhook-id'] as string;
    

    console.log('Webhook received ar /receive/fail');
    console.log('EventType :', eventType);
    console.log('Webhook Id :', webhookId);
    console.log('Atempt Number :', attemptNumber);
    console.log('Simulating server failure ...');

    // returning 500 here whcih simulates broken merchant endpoint
    // and this will trigger the retry logic in delivery.wroker.ts

    return res.status(500).json({
        received: false, 
        message: "Internal server error - simulated failure",
    });

});

app.get('/health', (_req: Request, res: Response) => {
    return res.status(200).json({ status: 'ok', port: process.env.MOCK_RECEIVER_PORT});
});

// start the mock receiver
const PORT = Number(process.env.MOCK_RECEIVER_PORT) || 4000;
app.listen(PORT, () => {
    console.log(`Mock receiver running on http://localhost:${PORT}`);
    console.log(`POST http://localhost:${PORT}/receive always 200`);
    console.log(`POST http://localhost:${PORT}/receive/fail always 500`);
});

export default app;