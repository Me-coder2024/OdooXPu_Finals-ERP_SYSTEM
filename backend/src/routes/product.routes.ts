import { Router, Response } from 'express';
import { ProductService } from '../services/product.service';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkModuleAccess } from '../middleware/rbac';
import { ERPModule, AccessType } from '@prisma/client';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/', checkModuleAccess(ERPModule.PRODUCTS, AccessType.VIEW), async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const isActive = req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined;
    const result = await ProductService.getAll(page, limit, search, isActive);
    res.json({ success: true, data: result.products, pagination: { total: result.total, page, limit, totalPages: Math.ceil(result.total / limit) } });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to fetch products' }] });
  }
});

router.get('/:id', checkModuleAccess(ERPModule.PRODUCTS, AccessType.VIEW), [param('id').isUUID()], validate, async (req: AuthRequest, res: Response) => {
  try {
    const product = await ProductService.getById(req.params.id);
    res.json({ success: true, data: product });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to fetch product' }] });
  }
});

router.post(
  '/',
  checkModuleAccess(ERPModule.PRODUCTS, AccessType.FULL),
  [
    body('name').notEmpty().withMessage('Product name is required'),
    body('sku').notEmpty().withMessage('SKU is required'),
    body('sales_price').isFloat({ min: 0 }).withMessage('Sales price must be positive'),
    body('cost_price').isFloat({ min: 0 }).withMessage('Cost price must be positive'),
  ],
  validate,
  async (req: AuthRequest, res: Response) => {
    try {
      const product = await ProductService.create(req.body, req.user!.id, req.ip);
      res.status(201).json({ success: true, data: product });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to create product' }] });
    }
  }
);

router.patch('/:id', checkModuleAccess(ERPModule.PRODUCTS, AccessType.FULL), [param('id').isUUID()], validate, async (req: AuthRequest, res: Response) => {
  try {
    const product = await ProductService.update(req.params.id, req.body, req.user!.id, req.ip);
    res.json({ success: true, data: product });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to update product' }] });
  }
});

router.delete('/:id', checkModuleAccess(ERPModule.PRODUCTS, AccessType.FULL), [param('id').isUUID()], validate, async (req: AuthRequest, res: Response) => {
  try {
    await ProductService.delete(req.params.id, req.user!.id, req.ip);
    res.json({ success: true, data: { message: 'Product deactivated' } });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to delete product' }] });
  }
});

export default router;
