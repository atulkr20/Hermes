import { z } from 'zod';

export const CreateEventDto = z.object({
    merchantId: z.string()
    .uuid('merchantId must be a valid UUID'),

    eventType: z.string()
    .min(1, 'eventType is required')
    .regex(
        /^[a-z]+\.[a-z_]+$/,
        'eventType must follow format: category.action e.g. payment.success'
    ),

    payload: z.record(z.string(), z.unknown())
    .refine(
        (val) => Object.keys(val).length > 0,
        'payload cannot be empty'
    )
});

export type createEventInput = z.infer<typeof CreateEventDto>;
