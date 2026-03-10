import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        name: string;
    };
}

export const authMiddleware = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error('JWT_SECRET is not configured');
            return res.status(500).json({ error: 'Authentication is not configured' });
        }

        const decoded = jwt.verify(token, secret);
        req.user = decoded as any;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
