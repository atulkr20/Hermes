import crypto from 'crypto';
import prisma from '../config/db.js';
import { RegisterMerchantInput } from '../dtos/merchant.dto.js';


export const merchantService ={

    // register a new merchant and auto-generate their secret key
    async register (data: RegisterMerchantInput) {

        const secretKey = `whsec_${crypto.randomBytes(32).toString('hex')}`;

        const merchant = await prisma.merchant.create({
            data: {
                name: data.name,
                endpointUrl: data.endpointUrl,
                secretKey,
            }
        });

        return merchant;
    },

    // Get a single merchant by ID
    async getById(id: string) {
        const merchant = await prisma.merchant.findUnique({
            where: { id },
        });

        return merchant;
    },

    async toggle(id: string, isActive: boolean) {
        const existing = await prisma.merchant.findUnique({
            where: { id },
        });

        if (!existing) return null;

        const updated = await prisma.merchant.update({
            where: { id },
            data: { isActive },
        });

        return updated;
    },
};