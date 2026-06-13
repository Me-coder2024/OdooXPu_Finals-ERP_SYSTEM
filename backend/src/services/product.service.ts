import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { writeAuditLog } from '../utils/auditLogger';

// Helper to add computed free_to_use_qty to product response
function addFreeToUse(product: Record<string, unknown>): Record<string, unknown> {
  const onHand = Number(product.on_hand_qty || 0);
  const reserved = Number(product.reserved_qty || 0);
  return {
    ...product,
    free_to_use_qty: Math.max(0, onHand - reserved),
  };
}

export class ProductService {
  static async getAll(page = 1, limit = 20, search?: string, isActive?: boolean) {
    const skip = (page - 1) * limit;
    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (isActive !== undefined) {
      where.is_active = isActive;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          vendor: { select: { id: true, name: true } },
          bom: { select: { id: true, bom_reference: true } },
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    // Compute free_to_use_qty on EVERY response — NEVER stored
    const productsWithFTU = products.map((p) => addFreeToUse(p as unknown as Record<string, unknown>));

    return { products: productsWithFTU, total, page, limit };
  }

  static async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        vendor: { select: { id: true, name: true } },
        bom: {
          select: {
            id: true,
            bom_reference: true,
            qty_produced: true,
            components: {
              include: { product: { select: { id: true, name: true, sku: true } } },
            },
          },
        },
        bom_record: {
          select: { id: true, bom_reference: true },
        },
      },
    });

    if (!product) {
      throw { status: 404, message: 'Product not found.' };
    }

    // free_to_use_qty computed, NEVER stored
    return addFreeToUse(product as unknown as Record<string, unknown>);
  }

  static async create(
    data: {
      name: string;
      sku: string;
      sales_price: number;
      cost_price: number;
      on_hand_qty?: number;
      min_stock_qty?: number;
      procure_on_demand?: boolean;
      procurement_type?: 'PURCHASE' | 'MANUFACTURING';
      preferred_vendor_id?: string;
      bom_id?: string;
    },
    performedBy: string,
    ipAddress?: string
  ) {
    const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (existing) {
      throw { status: 400, message: 'SKU already exists.' };
    }

    if (data.procure_on_demand && !data.procurement_type) {
      throw { status: 400, message: 'Procurement type is required when procure on demand is enabled.' };
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        sku: data.sku,
        sales_price: new Prisma.Decimal(data.sales_price),
        cost_price: new Prisma.Decimal(data.cost_price),
        on_hand_qty: new Prisma.Decimal(data.on_hand_qty || 0),
        min_stock_qty: new Prisma.Decimal(data.min_stock_qty || 0),
        procure_on_demand: data.procure_on_demand || false,
        procurement_type: data.procurement_type || null,
        preferred_vendor_id: data.preferred_vendor_id || null,
        bom_id: data.bom_id || null,
      },
      include: {
        vendor: { select: { id: true, name: true } },
      },
    });

    await writeAuditLog({
      userId: performedBy,
      module: 'PRODUCTS',
      action: 'CREATE',
      entity: 'Product',
      entityId: product.id,
      oldValue: null,
      newValue: { name: data.name, sku: data.sku, sales_price: data.sales_price, cost_price: data.cost_price },
      ipAddress,
    });

    return addFreeToUse(product as unknown as Record<string, unknown>);
  }

  static async update(
    id: string,
    data: {
      name?: string;
      sku?: string;
      sales_price?: number;
      cost_price?: number;
      on_hand_qty?: number;
      min_stock_qty?: number;
      procure_on_demand?: boolean;
      procurement_type?: 'PURCHASE' | 'MANUFACTURING' | null;
      preferred_vendor_id?: string | null;
      bom_id?: string | null;
      is_active?: boolean;
    },
    performedBy: string,
    ipAddress?: string
  ) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw { status: 404, message: 'Product not found.' };
    }

    if (data.sku && data.sku !== existing.sku) {
      const skuTaken = await prisma.product.findUnique({ where: { sku: data.sku } });
      if (skuTaken) {
        throw { status: 400, message: 'SKU already in use.' };
      }
    }

    const oldValue: Record<string, unknown> = {};
    const newValue: Record<string, unknown> = {};
    const updateData: Record<string, unknown> = {};

    const fields = ['name', 'sku', 'is_active', 'procure_on_demand', 'procurement_type', 'preferred_vendor_id', 'bom_id'] as const;
    for (const field of fields) {
      if (data[field] !== undefined) {
        oldValue[field] = (existing as Record<string, unknown>)[field];
        newValue[field] = data[field];
        updateData[field] = data[field];
      }
    }

    const decimalFields = ['sales_price', 'cost_price', 'on_hand_qty', 'min_stock_qty'] as const;
    for (const field of decimalFields) {
      if (data[field] !== undefined) {
        oldValue[field] = Number((existing as Record<string, unknown>)[field]);
        newValue[field] = data[field];
        updateData[field] = new Prisma.Decimal(data[field]!);
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        vendor: { select: { id: true, name: true } },
      },
    });

    await writeAuditLog({
      userId: performedBy,
      module: 'PRODUCTS',
      action: 'UPDATE',
      entity: 'Product',
      entityId: id,
      oldValue,
      newValue,
      ipAddress,
    });

    return addFreeToUse(product as unknown as Record<string, unknown>);
  }

  static async delete(id: string, performedBy: string, ipAddress?: string) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw { status: 404, message: 'Product not found.' };
    }

    await prisma.product.update({
      where: { id },
      data: { is_active: false },
    });

    await writeAuditLog({
      userId: performedBy,
      module: 'PRODUCTS',
      action: 'DELETE',
      entity: 'Product',
      entityId: id,
      oldValue: { is_active: true },
      newValue: { is_active: false },
      ipAddress,
    });
  }
}
