import { Router, Response } from 'express';
import { SalesOrderService } from '../services/salesOrder.service';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkModuleAccess } from '../middleware/rbac';
import { ERPModule, AccessType } from '@prisma/client';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authenticate);

router.get('/', checkModuleAccess(ERPModule.SALES, AccessType.VIEW), async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const result = await SalesOrderService.getAll(page, limit, status as any);
    res.json({ success: true, data: result.orders, pagination: { total: result.total, page, limit, totalPages: Math.ceil(result.total / limit) } });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to fetch sales orders' }] });
  }
});

router.get('/:id', checkModuleAccess(ERPModule.SALES, AccessType.VIEW), [param('id').isUUID()], validate, async (req: AuthRequest, res: Response) => {
  try {
    const order = await SalesOrderService.getById(req.params.id);
    res.json({ success: true, data: order });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to fetch sales order' }] });
  }
});

router.post(
  '/',
  checkModuleAccess(ERPModule.SALES, AccessType.FULL),
  [
    body('customer_id').isUUID().withMessage('Valid customer ID required'),
    body('order_date').isISO8601().withMessage('Valid order date required'),
    body('lines').isArray({ min: 1 }).withMessage('At least one line item required'),
    body('lines.*.product_id').isUUID().withMessage('Valid product ID required'),
    body('lines.*.ordered_qty').isFloat({ gt: 0 }).withMessage('Quantity must be positive'),
    body('lines.*.unit_price').isFloat({ min: 0 }).withMessage('Price must be non-negative'),
  ],
  validate,
  async (req: AuthRequest, res: Response) => {
    try {
      const order = await SalesOrderService.create(req.body, req.user!.id, req.ip);
      res.status(201).json({ success: true, data: order });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to create sales order' }] });
    }
  }
);

router.patch('/:id', checkModuleAccess(ERPModule.SALES, AccessType.FULL), [param('id').isUUID()], validate, async (req: AuthRequest, res: Response) => {
  try {
    const order = await SalesOrderService.update(req.params.id, req.body, req.user!.id, req.ip);
    res.json({ success: true, data: order });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to update sales order' }] });
  }
});

// POST /api/sales-orders/:id/confirm — ATOMIC MTO TRANSACTION
router.post('/:id/confirm', checkModuleAccess(ERPModule.SALES, AccessType.FULL), [param('id').isUUID()], validate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await SalesOrderService.confirm(req.params.id, req.user!.id, req.ip);
    res.json({
      success: true,
      data: result.order,
      meta: {
        auto_created_pos: result.autoCreatedPOs,
        auto_created_mos: result.autoCreatedMOs,
        message: result.autoCreatedPOs.length > 0 || result.autoCreatedMOs.length > 0
          ? `Order confirmed. Auto-created: ${result.autoCreatedPOs.length} PO(s), ${result.autoCreatedMOs.length} MO(s)`
          : 'Order confirmed. All items reserved from available stock.',
      },
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to confirm sales order' }] });
  }
});

router.post('/:id/deliver', checkModuleAccess(ERPModule.SALES, AccessType.FULL), [param('id').isUUID()], validate, async (req: AuthRequest, res: Response) => {
  try {
    const order = await SalesOrderService.deliver(req.params.id, req.body, req.user!.id, req.ip);
    res.json({ success: true, data: order });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to deliver sales order' }] });
  }
});

router.post('/:id/cancel', checkModuleAccess(ERPModule.SALES, AccessType.FULL), [param('id').isUUID()], validate, async (req: AuthRequest, res: Response) => {
  try {
    const order = await SalesOrderService.cancel(req.params.id, req.user!.id, req.ip);
    res.json({ success: true, data: order });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to cancel sales order' }] });
  }
});

export default router;
