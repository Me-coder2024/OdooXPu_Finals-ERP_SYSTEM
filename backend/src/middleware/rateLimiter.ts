import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';

const generalLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60,
});

const loginLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
});

export const rateLimitGeneral = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await generalLimiter.consume(req.ip || 'unknown');
    next();
  } catch {
    res.status(429).json({
      errors: [{ field: 'rate_limit', message: 'Too many requests. Please try again later.' }],
    });
  }
};

export const rateLimitLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await loginLimiter.consume(req.ip || 'unknown');
    next();
  } catch {
    res.status(429).json({
      errors: [{ field: 'rate_limit', message: 'Too many login attempts. Please try again in a minute.' }],
    });
  }
};
