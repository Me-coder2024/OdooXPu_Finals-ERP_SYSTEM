import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { rateLimitLogin } from '../middleware/rateLimiter';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';
import { env } from '../config/env';

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

export default router;
