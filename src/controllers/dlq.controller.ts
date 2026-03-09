import { Request, Response, NextFunction } from 'express';
import { dlqService } from '../services/dlq.service.js';
import { RequestEventDto, RequeueEventDto } from '../dtos/dlq.dto.js';

export const dlqController = {
    async getAllDeadEvents(req: Request, res: Response, next: NextFunction) {
        try {
            const deadEvents = await dlqService.getAllDeadEvents();

            return res.status(200).json({
                success: true, 
                count: deadEvents.length,
                data: deadEvents,
            }); 
        } catch (error) {
            next(error);
        }
    },

    async getDeadEventById(req: Request, res: Response, next: NextFunction) {
        try {
            const { eventId } = req.params;
            const entry = await dlqService.getDeadEventById(eventId);

            if(!entry) {
                return res.status(404).json.json({
                    success: false,
                    message: 'No DLQ entry found for this event',
                });
            }

            return res.status(200).json({
                success: true, 
                data: entry,
            });
        } catch (error) {
            next(error);
        }
    },

    async requeueEvent(req: Request, res: Response, next: NextFunction){
        try {
            // validate the eventId from URL params using zod DTO

            const { eventId } = RequeueEventDto.parse(req.params);

            const result = await dlqService.requeueEvent(eventId);

            return res.status(200).json({
                success: true, 
                message: 'Event successfully requeued for delivery',
                data: result,
            });
        } catch (error) {
            // Handle our businedd logic errors before passing to the global error middleware

            if(error instanceof Error) {
                if (error.message === 'DLQ_ENTRY_NOT_FOUND') {
                    return res.status(404).json({
                        success: false,
                        message: 'No DLQ entry found for this eventId',
                    });
                }

                if (error.message === 'EVENT_ALREADY_REQUEUED') {
                    return res.status(409).json({
                        // 409 - The resource exists but in conflicting state
                        success: false, 
                        message: 'This event has already been requeued',
                    });
                }
            }

            next(error);
        }
    },
};