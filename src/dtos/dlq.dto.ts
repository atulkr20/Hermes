import { z } from 'zod';

export const RequeueEventDto = z.object({
    eventId: z.string()
    .uuid('eventId must be a valid UUID')
});

export type RequeueEventInput = z.infer<typeof RequeueEventDto>;