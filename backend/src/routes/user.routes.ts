import { Router, Response } from 'express';
import { UserService } from '../services/user.service';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkModuleAccess } from '../middleware/rbac';
import { ERPModule, AccessType } from '@prisma/client';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import multer from 'multer';
import prisma from '../config/database';

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

// ============ Self Profile Update (MUST be before /:id routes) ============
// PATCH /api/users/me/profile — User updates own profile (name, address, mobile)
router.patch(
  '/me/profile',
  [
    body('name').optional().isString().isLength({ min: 1, max: 100 }),
    body('address').optional().isString().isLength({ max: 500 }),
    body('mobile').optional().isString().isLength({ max: 20 }),
  ],
  validate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, address, mobile } = req.body;
      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (address !== undefined) updateData.address = address;
      if (mobile !== undefined) updateData.mobile = mobile;

      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data: updateData,
        select: {
          id: true, name: true, email: true, role: true, mobile: true,
          address: true, is_active: true,
          module_access: { select: { module: true, access_type: true } },
        },
      });

      res.json({ success: true, data: user });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to update profile' }] });
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

// ============ Photo Upload (BYTEA via Multer) ============

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// POST /api/users/:id/photo — Upload profile photo
router.post(
  '/:id/photo',
  upload.single('photo'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ errors: [{ field: 'photo', message: 'No image file provided' }] });
        return;
      }

      // Only allow self-upload or admin
      const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'OWNER';
      if (req.user?.id !== req.params.id && !isAdmin) {
        res.status(403).json({ errors: [{ field: 'access', message: 'Not authorized' }] });
        return;
      }

      await prisma.user.update({
        where: { id: req.params.id },
        data: {
          profile_photo: req.file.buffer,
          photo_mime_type: req.file.mimetype,
        },
      });

      res.json({ success: true, message: 'Photo uploaded successfully' });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to upload photo' }] });
    }
  }
);

// GET /api/users/:id/photo — Serve profile photo as binary
router.get('/:id/photo', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { profile_photo: true, photo_mime_type: true },
    });

    if (!user?.profile_photo) {
      res.status(404).json({ errors: [{ field: 'photo', message: 'No photo found' }] });
      return;
    }

    res.set('Content-Type', user.photo_mime_type || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(user.profile_photo));
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to fetch photo' }] });
  }
});

// DELETE /api/users/:id/photo — Remove profile photo
router.delete('/:id/photo', async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'OWNER';
    if (req.user?.id !== req.params.id && !isAdmin) {
      res.status(403).json({ errors: [{ field: 'access', message: 'Not authorized' }] });
      return;
    }

    await prisma.user.update({
      where: { id: req.params.id },
      data: { profile_photo: null, photo_mime_type: null },
    });

    res.json({ success: true, message: 'Photo removed' });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to delete photo' }] });
  }
});

export default router;
