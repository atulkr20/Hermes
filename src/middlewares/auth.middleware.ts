import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
    namespace Express {
        interface Request {
            admin?: {
                id: string;
                role: string;
            };
        }
    }
}

export function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer')) {
        res.status(401).json({
            success: false, 
            message: 'Authorization header missing or malformed. Expected: Bearer < token >',
        });
        return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({
            success: false,
            message: 'Authorization header missing or malformed. Expected: Bearer <token>',
        });
        return;
    }

    try {
        const jwtSecret = process.env.JWT_SECRET;

        if(!jwtSecret) {

            throw new Error('JWT_SECRET environment variable is not set');
        }

        // Verify the token, throws if invalid

        const decoded = jwt.verify(token, jwtSecret) as unknown as {
            id: string;
            role: string;
        };

        req.admin = decoded;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                message: 'Invalid token',
            });
            return;
        }

        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({
                success: false,
                message: 'Token has expired',
            });
            return;
        }

        // Unknown error during Verification
        res.status(500).json({
            success: false, 
            message: 'Token verification failed',
        });
    }
}