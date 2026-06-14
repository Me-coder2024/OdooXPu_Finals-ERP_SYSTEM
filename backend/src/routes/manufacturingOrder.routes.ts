import { Router, Response } from 'express';
import { ManufacturingOrderService } from '../services/manufacturingOrder.service';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkModuleAccess } from '../middleware/rbac';
import { ERPModule, AccessType } from '@prisma/client';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authenticate);

router.get('/', checkModuleAccess(ERPModule.MANUFACTURING, AccessType.VIEW), async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string | undefined;
    const result = await ManufacturingOrderService.getAll(page, limit, status as any);
    res.json({ success: true, data: result.orders, pagination: { total: result.total, page, limit, totalPages: Math.ceil(result.total / limit) } });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to fetch manufacturing orders' }] });
  }
});

router.get('/:id', checkModuleAccess(ERPModule.MANUFACTURING, AccessType.VIEW), [param('id').isUUID()], validate, async (req: AuthRequest, res: Response) => {
  try {
    const order = await ManufacturingOrderService.getById(req.params.id);
    res.json({ success: true, data: order });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to fetch manufacturing order' }] });
  }
});

router.post(
  '/',
  checkModuleAccess(ERPModule.MANUFACTURING, AccessType.FULL),
  [
    body('product_id').isUUID().withMessage('Valid product ID required'),
    body('bom_id').isUUID().withMessage('Valid BoM ID required'),
    body('qty_to_produce').isFloat({ gt: 0 }).withMessage('Quantity must be positive'),
    body('scheduled_date').isISO8601().withMessage('Valid scheduled date required'),
  ],
  validate,
  async (req: AuthRequest, res: Response) => {
    try {
      const order = await ManufacturingOrderService.create(req.body, req.user!.id, req.ip);
      res.status(201).json({ success: true, data: order });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to create manufacturing order' }] });
    }
  }
);

router.patch('/:id', checkModuleAccess(ERPModule.MANUFACTURING, AccessType.FULL), [param('id').isUUID()], validate, async (req: AuthRequest, res: Response) => {
  try {
    const order = await ManufacturingOrderService.update(req.params.id, req.body, req.user!.id, req.ip);
    res.json({ success: true, data: order });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to update manufacturing order' }] });
  }
});

router.post('/:id/confirm', checkModuleAccess(ERPModule.MANUFACTURING, AccessType.FULL), [param('id').isUUID()], validate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await ManufacturingOrderService.confirm(req.params.id, req.user!.id, req.ip);
    res.json({
      success: true,
      data: result.order,
      autoCreatedPOs: result.autoCreatedPOs,
      autoCreatedMOs: result.autoCreatedMOs,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to confirm manufacturing order' }] });
  }
});

// POST /api/manufacturing-orders/:id/produce — LOCKED UNTIL ALL WOs DONE
router.post('/:id/produce', checkModuleAccess(ERPModule.MANUFACTURING, AccessType.FULL), [param('id').isUUID()], validate, async (req: AuthRequest, res: Response) => {
  try {
    const order = await ManufacturingOrderService.produce(req.params.id, req.user!.id, req.ip);
    res.json({ success: true, data: order });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to produce manufacturing order' }] });
  }
});

router.post('/:id/cancel', checkModuleAccess(ERPModule.MANUFACTURING, AccessType.FULL), [param('id').isUUID()], validate, async (req: AuthRequest, res: Response) => {
  try {
    const order = await ManufacturingOrderService.cancel(req.params.id, req.user!.id, req.ip);
    res.json({ success: true, data: order });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to cancel manufacturing order' }] });
  }
});

// PATCH /api/manufacturing-orders/:id/work-orders/:woId
router.patch(
  '/:id/work-orders/:woId',
  checkModuleAccess(ERPModule.MANUFACTURING, AccessType.FULL),
  [param('id').isUUID(), param('woId').isUUID()],
  validate,
  async (req: AuthRequest, res: Response) => {
    try {
      const wo = await ManufacturingOrderService.updateWorkOrder(req.params.id, req.params.woId, req.body, req.user!.id, req.ip);
      res.json({ success: true, data: wo });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to update work order' }] });
    }
  }
);

export default router;
