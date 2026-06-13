import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { rateLimitLogin } from '../middleware/rateLimiter';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';
import { env } from '../config/env';
import prisma from '../config/database';

const router = Router();

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

router.post(
  '/login',
  rateLimitLogin,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);

      res.cookie('access_token', result.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refresh_token', result.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({ success: true, data: result.user });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      res.status(err.status || 500).json({
        errors: [{ field: 'auth', message: err.message || 'Login failed' }],
      });
    }
  }
);

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      res.status(401).json({
        errors: [{ field: 'auth', message: 'Refresh token not found' }],
      });
      return;
    }

    const result = await AuthService.refresh(refreshToken);

    res.cookie('access_token', result.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', result.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, data: result.user });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({
      errors: [{ field: 'auth', message: err.message || 'Token refresh failed' }],
    });
  }
});

router.post('/logout', authenticate, (_req: AuthRequest, res: Response) => {
  res.clearCookie('access_token', cookieOptions);
  res.clearCookie('refresh_token', cookieOptions);
  res.json({ success: true, data: { message: 'Logged out successfully' } });
});

router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: req.user });
});

router.post(
  '/signup',
  [
    body('login_id')
      .isLength({ min: 6, max: 12 })
      .withMessage('Login ID must be between 6 and 12 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Login ID can only contain letters, numbers, and underscores'),
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[a-z]/)
      .withMessage('Password must contain a lowercase letter')
      .matches(/[A-Z]/)
      .withMessage('Password must contain an uppercase letter')
      .matches(/[^a-zA-Z0-9]/)
      .withMessage('Password must contain a special character'),
  ],
  validate,
  async (req: Request, res: Response) => {
    try {
      const { login_id, name, email, password } = req.body;

      // Check if email already exists
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        res.status(400).json({
          errors: [{ field: 'email', message: 'Email is already registered' }],
        });
        return;
      }

      // Check if login_id already exists (stored as name for simplicity, or use email prefix)
      const existingLoginId = await prisma.user.findFirst({
        where: { name: login_id },
      });
      if (existingLoginId) {
        res.status(400).json({
          errors: [{ field: 'login_id', message: 'Login ID is already taken' }],
        });
        return;
      }

      const password_hash = await AuthService.hashPassword(password);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password_hash,
          role: 'SALES', // Default role, admin can change later
          module_access: {
            create: [
              { module: 'PRODUCTS', access_type: 'VIEW' },
              { module: 'SALES', access_type: 'VIEW' },
            ],
          },
        },
        include: { module_access: true },
      });

      // Auto-login after signup
      const result = await AuthService.login(email, password);

      res.cookie('access_token', result.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('refresh_token', result.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({ success: true, data: result.user });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      res.status(err.status || 500).json({
        errors: [{ field: 'auth', message: err.message || 'Signup failed' }],
      });
    }
  }
);

export default router;
