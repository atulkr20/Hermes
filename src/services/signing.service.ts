import crypto from 'crypto';

export const signingService = {
    generateSignature(payload: Record<string, unknown>, secretKey: string): string {

        const payloadString = JSON.stringify(payload);

        const signature = crypto
        .createHmac('sha256', secretKey)
        .update(payloadString)
        .digest('hex');

        return `sha256=${signature}`;
    },

    verifySignature(
        payload: Record<string, unknown>,
        signature: string,
        secretKey: string
    ): boolean {

        const expectedSignature = this.generateSignature(payload, secretKey);

        try {
            const signatureBuffer = Buffer.from(signature);
            const expectedBuffer = Buffer.from(expectedSignature);

            if(signatureBuffer.length !== expectedBuffer.length) {
                return false;
            }

            return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
        } catch {
            return false;
        }
    },

    // Generate the HMAC and also return the raw payload
    // Used by the worker to sign before delivery
    signPayload(
        payload: Record<string, unknown>,
        secretKey: string
    ): { signature: string; payloadString: string} {
        const payloadString = JSON.stringify(payload);

        const signature = crypto
        .createHmac('sha256', secretKey)
        .update(payloadString)
        .digest('hex');

        return {
            signature: `sha256=${signature}`,
            payloadString,
        };

    },
};