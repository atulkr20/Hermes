import type { Request, Response, NextFunction } from 'express';
import { merchantService } from '../services/merchant.service.js';
import { RegisterMerchantDto, ToggleMerchanatDto } from '../dtos/merchant.dto.js';


export const merchantController = {
    async register(req: Request, res: Response, next: NextFunction ) {
        try {

            const data = RegisterMerchantDto.parse(req.body);

            const merchant = await merchantService.register(data);

            return res.status(201).json({
                success: true, 
                message: 'Merchant registered successfully. Store your scretKey - it will not be shown aain.',
                data: {
                    id: merchant.id,
                    name: merchant.name,
                    endpointUrl: merchant.endpointUrl,
                    secretKey: merchant.secretKey,
                    isActive: merchant.isActive,
                    createdAt: merchant.createdAt,
                },
            });
        } catch (error) {
            next(error);
        }
    },

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            if (!id || typeof id !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'id path parameter is required',
                });
            }

            const merchant = await merchantService.getById(id);

            if(!merchant) {
                return  res.status(404).json({
                    sucess: false, 
                    message: 'Merchant not found',
                });
            }

            const { secretKey: _, ...safeMerchant } = merchant;

            return res.status(200).json({
                success: true, 
                data: safeMerchant,
            });
        } catch (error) {
            next(error);
        }
    },

    async toggle(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            if (!id || typeof id !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: 'id path parameter is required',
                });
            }

            const { isActive } = ToggleMerchanatDto.parse(req.body);

            const merchant = await merchantService.toggle(id, isActive);

            if(!merchant) {
                return res.status(404).json({
                    success: false, 
                    message: 'Merchant not found',
                });
            }

            return res.status(200).json({
                success: true, 
                message: `Merchant ${isActive ? 'activated' : 'deactivated'} successfully`,
                data: { id: merchant.id, isActive: merchant.isActive },
            });
        } catch (error) {
            next(error);
        }
    },
};