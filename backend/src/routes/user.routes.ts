import { Router, Response } from 'express';
import { UserService } from '../services/user.service';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkModuleAccess } from '../middleware/rbac';
import { ERPModule, AccessType } from '@prisma/client';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate);

// GET /api/users
router.get(
  '/',
  checkModuleAccess(ERPModule.USERS, AccessType.VIEW),
  async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const result = await UserService.getAll(page, limit, search);
      res.json({ success: true, data: result.users, pagination: { total: result.total, page, limit, totalPages: Math.ceil(result.total / limit) } });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to fetch users' }] });
    }
  }
);

// GET /api/users/:id
router.get(
  '/:id',
  checkModuleAccess(ERPModule.USERS, AccessType.VIEW),
  [param('id').isUUID().withMessage('Invalid user ID')],
  validate,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = await UserService.getById(req.params.id);
      res.json({ success: true, data: user });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to fetch user' }] });
    }
  }
);

// POST /api/users
router.post(
  '/',
  checkModuleAccess(ERPModule.USERS, AccessType.FULL),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['ADMIN', 'SALES', 'PURCHASE', 'MANUFACTURING', 'INVENTORY', 'OWNER']).withMessage('Invalid role'),
  ],
  validate,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = await UserService.create(req.body, req.user!.id, req.ip);
      res.status(201).json({ success: true, data: user });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to create user' }] });
    }
  }
);

// PATCH /api/users/:id
router.patch(
  '/:id',
  checkModuleAccess(ERPModule.USERS, AccessType.FULL),
  [param('id').isUUID().withMessage('Invalid user ID')],
  validate,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = await UserService.update(req.params.id, req.body, req.user!.id, req.ip);
      res.json({ success: true, data: user });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to update user' }] });
    }
  }
);

// DELETE /api/users/:id
router.delete(
  '/:id',
  checkModuleAccess(ERPModule.USERS, AccessType.FULL),
  [param('id').isUUID().withMessage('Invalid user ID')],
  validate,
  async (req: AuthRequest, res: Response) => {
    try {
      await UserService.delete(req.params.id, req.user!.id, req.ip);
      res.json({ success: true, data: { message: 'User deactivated successfully' } });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to delete user' }] });
    }
  }
);

// PATCH /api/users/:id/access
router.patch(
  '/:id/access',
  checkModuleAccess(ERPModule.USERS, AccessType.FULL),
  [
    param('id').isUUID().withMessage('Invalid user ID'),
    body('module_access').isArray({ min: 1 }).withMessage('Module access array is required'),
  ],
  validate,
  async (req: AuthRequest, res: Response) => {
    try {
      const result = await UserService.updateAccess(req.params.id, req.body.module_access, req.user!.id, req.ip);
      res.json({ success: true, data: result });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to update access' }] });
    }
  }
);

export default router;
