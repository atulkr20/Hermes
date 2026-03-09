import type { Request, Response, NextFunction } from 'express';
import { webhookService } from '../services/webhook.service.js';
import { CreateEventDto } from '../dtos/event.dto.js';

export const eventController = {
    async publish(req: Request, res: Response, next: NextFunction) {
        try {
            const data = CreateEventDto.parse(req.body);
            const event = await webhookService.publishEvent(data);

            return res.status(202).json({
                // 201 - means the resource was created and the action is complete
                // 202 - means that the request is received and it will get processed asynchronously
                success: true, 
                message: 'Event accepted for delivery',
                data: {
                    eventId: event.id,
                    status: event.status,
                    eventType: event.eventType,
                    createdAt: event.createdAt,
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

            const event = await webhookService.getEventById(id);

            if(!event) {
                return res.status(404).json({
                    success: false, 
                    message: 'Event not found',
                });
            }

            return res.status(200).json({
                success: true, 
                data: event, 
            });
        } catch (error) {
            next(error);
        }
    },

    async getByMerchant(req: Request, res: Response, next: NextFunction) {
        try {
            const { merchantId, status } = req.query;

            if(!merchantId || typeof merchantId !== 'string') {
                return res.status(400).json({
                    success: false, 
                    message: 'MerchantId query parameter is required',
                });
            }

            const events = await webhookService.getEventsByMerchant(
                merchantId,
                typeof status === 'string' ? status: undefined
            );

            return res.status(200).json({
                success: true, 
                count: events.length,
                data: events,

            });
        } catch (error) {
            next (error);
        }
    },
};