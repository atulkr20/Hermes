import { z } from 'zod';

export const RegisterMerchantDto = z.object({
    name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be under 100 characters'),

    endpointUrl: z.string()
    .url('endpointUrl must be a valid URL') 
});

export const ToggleMerchanatDto = z.object({
    isActive: z.boolean()
});

export type RegisterMerchantInput = z.infer<typeof RegisterMerchantDto>;
export type ToggleMerchantInput = z.infer<typeof ToggleMerchanatDto>;