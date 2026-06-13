import { Router, Response } from 'express';
import { BoMService, WorkCenterService } from '../services/bom.service';
import { VendorService, CustomerService } from '../services/vendorCustomer.service';
import { StockLedgerService, AuditLogService } from '../services/stockLedgerAudit.service';
import { DashboardService } from '../services/dashboard.service';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkModuleAccess } from '../middleware/rbac';
import { ERPModule, AccessType } from '@prisma/client';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validate';

// ============ BoM Routes ============
export const bomRouter = Router();
bomRouter.use(authenticate);

bomRouter.get('/', checkModuleAccess(ERPModule.BOM, AccessType.VIEW), async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const result = await BoMService.getAll(page, limit, search);
    res.json({ success: true, data: result.boms, pagination: { total: result.total, page, limit, totalPages: Math.ceil(result.total / limit) } });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to fetch BoMs' }] });
  }
});

bomRouter.get('/:id', checkModuleAccess(ERPModule.BOM, AccessType.VIEW), [param('id').isUUID()], validate, async (req: AuthRequest, res: Response) => {
  try {
    const bom = await BoMService.getById(req.params.id);
    res.json({ success: true, data: bom });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to fetch BoM' }] });
  }
});

bomRouter.post(
  '/',
  checkModuleAccess(ERPModule.BOM, AccessType.FULL),
  [
    body('product_id').isUUID(),
    body('bom_reference').notEmpty(),
    body('components').isArray({ min: 1 }),
  ],
  validate,
  async (req: AuthRequest, res: Response) => {
    try {
      const bom = await BoMService.create(req.body, req.user!.id, req.ip);
      res.status(201).json({ success: true, data: bom });
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to create BoM' }] });
    }
  }
);

bomRouter.patch('/:id', checkModuleAccess(ERPModule.BOM, AccessType.FULL), [param('id').isUUID()], validate, async (req: AuthRequest, res: Response) => {
  try {
    const bom = await BoMService.update(req.params.id, req.body, req.user!.id, req.ip);
    res.json({ success: true, data: bom });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to update BoM' }] });
  }
});

bomRouter.delete('/:id', checkModuleAccess(ERPModule.BOM, AccessType.FULL), [param('id').isUUID()], validate, async (req: AuthRequest, res: Response) => {
  try {
    await BoMService.delete(req.params.id, req.user!.id, req.ip);
    res.json({ success: true, data: { message: 'BoM deleted' } });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to delete BoM' }] });
  }
});

// ============ Work Center Routes ============
export const workCenterRouter = Router();
workCenterRouter.use(authenticate);

workCenterRouter.get('/', checkModuleAccess(ERPModule.MANUFACTURING, AccessType.VIEW), async (_req: AuthRequest, res: Response) => {
  try {
    const workCenters = await WorkCenterService.getAll();
    res.json({ success: true, data: workCenters });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to fetch work centers' }] });
  }
});

workCenterRouter.post('/', checkModuleAccess(ERPModule.MANUFACTURING, AccessType.FULL), [body('name').notEmpty()], validate, async (req: AuthRequest, res: Response) => {
  try {
    const wc = await WorkCenterService.create(req.body, req.user!.id, req.ip);
    res.status(201).json({ success: true, data: wc });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to create work center' }] });
  }
});

// ============ Vendor Routes ============
export const vendorRouter = Router();
vendorRouter.use(authenticate);

vendorRouter.get('/', checkModuleAccess(ERPModule.PURCHASE, AccessType.VIEW), async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const result = await VendorService.getAll(page, limit, search);
    res.json({ success: true, data: result.vendors, pagination: { total: result.total, page, limit, totalPages: Math.ceil(result.total / limit) } });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to fetch vendors' }] });
  }
});

vendorRouter.post('/', checkModuleAccess(ERPModule.PURCHASE, AccessType.FULL), [body('name').notEmpty()], validate, async (req: AuthRequest, res: Response) => {
  try {
    const vendor = await VendorService.create(req.body, req.user!.id, req.ip);
    res.status(201).json({ success: true, data: vendor });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to create vendor' }] });
  }
});

// ============ Customer Routes ============
export const customerRouter = Router();
customerRouter.use(authenticate);

customerRouter.get('/', checkModuleAccess(ERPModule.SALES, AccessType.VIEW), async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const result = await CustomerService.getAll(page, limit, search);
    res.json({ success: true, data: result.customers, pagination: { total: result.total, page, limit, totalPages: Math.ceil(result.total / limit) } });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to fetch customers' }] });
  }
});

customerRouter.post('/', checkModuleAccess(ERPModule.SALES, AccessType.FULL), [body('name').notEmpty()], validate, async (req: AuthRequest, res: Response) => {
  try {
    const customer = await CustomerService.create(req.body, req.user!.id, req.ip);
    res.status(201).json({ success: true, data: customer });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to create customer' }] });
  }
});

// ============ Stock Ledger Routes ============
export const stockLedgerRouter = Router();
stockLedgerRouter.use(authenticate);

stockLedgerRouter.get('/', checkModuleAccess(ERPModule.INVENTORY, AccessType.VIEW), async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const { product_id, movement_type, start_date, end_date } = req.query;
    const result = await StockLedgerService.getAll(page, limit, product_id as string, movement_type as any, start_date as string, end_date as string);
    res.json({ success: true, data: result.entries, pagination: { total: result.total, page, limit, totalPages: Math.ceil(result.total / limit) } });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to fetch stock ledger' }] });
  }
});

// ============ Audit Log Routes ============
export const auditLogRouter = Router();
auditLogRouter.use(authenticate);

auditLogRouter.get('/', checkModuleAccess(ERPModule.AUDIT, AccessType.VIEW), async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const { module, user_id, start_date, end_date } = req.query;
    const result = await AuditLogService.getAll(page, limit, module as string, user_id as string, start_date as string, end_date as string);
    res.json({ success: true, data: result.logs, pagination: { total: result.total, page, limit, totalPages: Math.ceil(result.total / limit) } });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to fetch audit logs' }] });
  }
});

// ============ Dashboard Routes ============
export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

dashboardRouter.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const stats = await DashboardService.getStats();
    res.json({ success: true, data: stats });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    res.status(err.status || 500).json({ errors: [{ field: 'server', message: err.message || 'Failed to fetch dashboard stats' }] });
  }
});
