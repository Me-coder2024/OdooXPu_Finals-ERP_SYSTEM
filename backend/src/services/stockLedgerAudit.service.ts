import { Prisma, StockMovement } from '@prisma/client';
import prisma from '../config/database';

export class StockLedgerService {
  static async getAll(
    page = 1,
    limit = 50,
    productId?: string,
    movementType?: StockMovement,
    startDate?: string,
    endDate?: string
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.StockLedgerWhereInput = {};

    if (productId) where.product_id = productId;
    if (movementType) where.movement_type = movementType;
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = new Date(startDate);
      if (endDate) where.created_at.lte = new Date(endDate);
    }

    const [entries, total] = await Promise.all([
      prisma.stockLedger.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          user: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.stockLedger.count({ where }),
    ]);

    return { entries, total, page, limit };
  }
}

export class AuditLogService {
  static async getAll(
    page = 1,
    limit = 50,
    module?: string,
    userId?: string,
    startDate?: string,
    endDate?: string
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.AuditLogWhereInput = {};

    if (module) where.module = module;
    if (userId) where.user_id = userId;
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = new Date(startDate);
      if (endDate) where.created_at.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  }
}
