import { Router, Response } from 'express';
import { PurchaseOrderService } from '../services/purchaseOrder.service';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkModuleAccess } from '../middleware/rbac';
import { ERPModule, AccessType } from '@prisma/client';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authenticate);

router.get('/', checkModuleAccess(ERPModule.PURCHASE, AccessType.VIEW), async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const result = await PurchaseOrderService.getAll(page, limit, status as any);
    res.json({ success: true, data: result.orders, pagination: { total: result.total, page, limit, totalPages: Math.ceil(result.total / limit) } });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to fetch purchase orders' }] });
  }
});

router.get('/:id', checkModuleAccess(ERPModule.PURCHASE, AccessType.VIEW), [param('id').isUUID()], validate, async (req: AuthRequest, res: Response) => {
  try {
    const order = await PurchaseOrderService.getById(req.params.id);
    res.json({ success: true, data: order });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to fetch purchase order' }] });
  }
});

router.post(
  '/',
  checkModuleAccess(ERPModule.PURCHASE, AccessType.FULL),
  [
    body('vendor_id').isUUID().withMessage('Valid vendor ID required'),
    body('order_date').isISO8601().withMessage('Valid order date required'),
    body('lines').isArray({ min: 1 }).withMessage('At least one line item required'),
    body('lines.*.product_id').isUUID().withMessage('Valid product ID required'),
    body('lines.*.ordered_qty').isFloat({ gt: 0 }).withMessage('Quantity must be positive'),
    body('lines.*.unit_cost').isFloat({ min: 0 }).withMessage('Cost must be non-negative'),
  ],
  validate,
  async (req: AuthRequest, res: Response) => {
    try {
      const order = await PurchaseOrderService.create(req.body, req.user!.id, req.ip);
      res.status(201).json({ success: true, data: order });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to create purchase order' }] });
    }
  }
);

router.patch('/:id', checkModuleAccess(ERPModule.PURCHASE, AccessType.FULL), [param('id').isUUID()], validate, async (req: AuthRequest, res: Response) => {
  try {
    const order = await PurchaseOrderService.update(req.params.id, req.body, req.user!.id, req.ip);
    res.json({ success: true, data: order });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to update purchase order' }] });
  }
});

router.post('/:id/confirm', checkModuleAccess(ERPModule.PURCHASE, AccessType.FULL), [param('id').isUUID()], validate, async (req: AuthRequest, res: Response) => {
  try {
    const order = await PurchaseOrderService.confirm(req.params.id, req.user!.id, req.ip);
    res.json({ success: true, data: order });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to confirm purchase order' }] });
  }
});

router.post('/:id/receive', checkModuleAccess(ERPModule.PURCHASE, AccessType.FULL), [param('id').isUUID()], validate, async (req: AuthRequest, res: Response) => {
  try {
    const order = await PurchaseOrderService.receive(req.params.id, req.body, req.user!.id, req.ip);
    res.json({ success: true, data: order });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to receive purchase order' }] });
  }
});

router.post('/:id/cancel', checkModuleAccess(ERPModule.PURCHASE, AccessType.FULL), [param('id').isUUID()], validate, async (req: AuthRequest, res: Response) => {
  try {
    const order = await PurchaseOrderService.cancel(req.params.id, req.user!.id, req.ip);
    res.json({ success: true, data: order });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to cancel purchase order' }] });
  }
});

export default router;
