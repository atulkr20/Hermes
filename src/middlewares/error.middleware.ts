import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function errorMiddleware(
    err: unknown, 
    req: Request, 
    res: Response,
    next: NextFunction
): Response {
    // Handling zod validation errors

    if (err instanceof ZodError) {
        return res.status(400).json({
            success: false, 
            message: 'Validation failed',
            errors: err.issues.map((e: typeof err.issues[0]) => ({
                field: e.path.join( '.'), 
                message: e.message,
            })),
        });
    }

    // Handle Prisma Known Request Errors

    if(err instanceof Prisma.PrismaClientKnownRequestError) {


        // P2002 - Unique constriant violation
        if (err.code === 'P2002' ) {
            return res.status(409).json({
                success: false,
                message: 'A record with value already exists',
                field: err.meta?.target,
            });
        }

        // P2025 - Record not found
        if(err.code === 'P2025') {
            return res.status(404).json({
                success: false, 
                message: 'Record not found',
            });
        }

    }

    // Handle our own business logic
    if (err instanceof Error) {
        const businessErrors: Record<string, { status: number; message: string}> = {
            MERCHANT_NOT_FOUND: { status: 404, message: 'Merchant not found' },
            MERCHANT_INACTIVE: { status: 403, message: 'Merchant is currently inactive'},
            DLQ_ENTRY_NOT_FOUND: { status: 404, message: 'No DLQ entry found for this event'},
            EVENT_ALREADY_REQUEUED: { status: 409, message: 'This event has already been requeued'},
        };

        const knownError = businessErrors[err.message];
        if(knownError) {
            return res.status(knownError.status).json({
                success: false, 
                message: knownError.message,
            });
        }
    }

    // Handle completely unknown errors
    console.error('Unhandled error:', err);

    return res.status(500).json({
        success: false, 
        message: 'Internal server error',

        // only xpose error detailes in development

        ...(process.env.NODE_ENV === 'development' && {
            error: err instanceof Error ? err.message : String(err),
        }),
    });


}
