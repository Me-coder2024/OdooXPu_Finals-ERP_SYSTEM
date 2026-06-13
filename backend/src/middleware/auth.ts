import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import prisma from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies?.access_token;

    if (!token) {
      res.status(401).json({
        errors: [{ field: 'auth', message: 'Authentication required. Please login.' }],
      });
      return;
    }

    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
      id: string;
      email: string;
      role: string;
      name: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, name: true, is_active: true },
    });

    if (!user || !user.is_active) {
      res.status(401).json({
        errors: [{ field: 'auth', message: 'User account is inactive or not found.' }],
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        errors: [{ field: 'auth', message: 'Token expired. Please refresh.' }],
      });
      return;
    }
    res.status(401).json({
      errors: [{ field: 'auth', message: 'Invalid authentication token.' }],
    });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        errors: [{ field: 'auth', message: 'Authentication required.' }],
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        errors: [{ field: 'auth', message: 'Insufficient role permissions.' }],
      });
      return;
    }

    next();
  };
};
