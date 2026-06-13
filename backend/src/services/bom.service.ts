import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { writeAuditLog } from '../utils/auditLogger';

export class BoMService {
  static async getAll(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.BillOfMaterialsWhereInput = search
      ? {
          OR: [
            { bom_reference: { contains: search, mode: 'insensitive' } },
            { product: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};

    const [boms, total] = await Promise.all([
      prisma.billOfMaterials.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          components: {
            include: { product: { select: { id: true, name: true, sku: true } } },
          },
          operations: {
            include: { work_center: { select: { id: true, name: true } } },
            orderBy: { sequence_order: 'asc' },
          },
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.billOfMaterials.count({ where }),
    ]);

    return { boms, total, page, limit };
  }

  static async getById(id: string) {
    const bom = await prisma.billOfMaterials.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        components: {
          include: { product: { select: { id: true, name: true, sku: true, on_hand_qty: true, cost_price: true } } },
        },
        operations: {
          include: { work_center: { select: { id: true, name: true } } },
          orderBy: { sequence_order: 'asc' },
        },
        manufacturing_orders: {
          select: { id: true, mo_number: true, status: true, qty_to_produce: true },
          take: 10,
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!bom) throw { status: 404, message: 'Bill of Materials not found.' };
    return bom;
  }

  static async create(
    data: {
      product_id: string;
      bom_reference: string;
      qty_produced?: number;
      notes?: string;
      components: { product_id: string; quantity: number; unit?: string }[];
      operations?: { work_center_id: string; name: string; duration_mins: number; sequence_order: number }[];
    },
    performedBy: string,
    ipAddress?: string
  ) {
    const existingProduct = await prisma.billOfMaterials.findUnique({
      where: { product_id: data.product_id },
    });
    if (existingProduct) throw { status: 400, message: 'A BoM already exists for this product.' };

    const existingRef = await prisma.billOfMaterials.findUnique({
      where: { bom_reference: data.bom_reference },
    });
    if (existingRef) throw { status: 400, message: 'BoM reference already exists.' };

    const bom = await prisma.billOfMaterials.create({
      data: {
        product_id: data.product_id,
        bom_reference: data.bom_reference,
        qty_produced: new Prisma.Decimal(data.qty_produced || 1),
        notes: data.notes,
        components: {
          create: data.components.map((c) => ({
            product_id: c.product_id,
            quantity: new Prisma.Decimal(c.quantity),
            unit: c.unit || 'pcs',
          })),
        },
        operations: data.operations
          ? {
              create: data.operations.map((op) => ({
                work_center_id: op.work_center_id,
                name: op.name,
                duration_mins: op.duration_mins,
                sequence_order: op.sequence_order,
              })),
            }
          : undefined,
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        components: {
          include: { product: { select: { id: true, name: true, sku: true } } },
        },
        operations: {
          include: { work_center: { select: { id: true, name: true } } },
          orderBy: { sequence_order: 'asc' },
        },
      },
    });

    // Update product's bom_id reference
    await prisma.product.update({
      where: { id: data.product_id },
      data: { bom_id: bom.id },
    });

    await writeAuditLog({
      userId: performedBy,
      module: 'BOM',
      action: 'CREATE',
      entity: 'BillOfMaterials',
      entityId: bom.id,
      oldValue: null,
      newValue: { bom_reference: data.bom_reference, components: data.components.length },
      ipAddress,
    });

    return bom;
  }

  static async update(
    id: string,
    data: {
      qty_produced?: number;
      notes?: string;
      components?: { product_id: string; quantity: number; unit?: string }[];
      operations?: { work_center_id: string; name: string; duration_mins: number; sequence_order: number }[];
    },
    performedBy: string,
    ipAddress?: string
  ) {
    const existing = await prisma.billOfMaterials.findUnique({
      where: { id },
      include: { components: true, operations: true },
    });
    if (!existing) throw { status: 404, message: 'Bill of Materials not found.' };

    const updateData: Prisma.BillOfMaterialsUpdateInput = {};
    if (data.qty_produced !== undefined) {
      updateData.qty_produced = new Prisma.Decimal(data.qty_produced);
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    // Replace components if provided
    if (data.components) {
      await prisma.boMComponent.deleteMany({ where: { bom_id: id } });
      await prisma.boMComponent.createMany({
        data: data.components.map((c) => ({
          bom_id: id,
          product_id: c.product_id,
          quantity: new Prisma.Decimal(c.quantity),
          unit: c.unit || 'pcs',
        })),
      });
    }

    // Replace operations if provided
    if (data.operations) {
      await prisma.boMOperation.deleteMany({ where: { bom_id: id } });
      await prisma.boMOperation.createMany({
        data: data.operations.map((op) => ({
          bom_id: id,
          work_center_id: op.work_center_id,
          name: op.name,
          duration_mins: op.duration_mins,
          sequence_order: op.sequence_order,
        })),
      });
    }

    const bom = await prisma.billOfMaterials.update({
      where: { id },
      data: updateData,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        components: {
          include: { product: { select: { id: true, name: true, sku: true } } },
        },
        operations: {
          include: { work_center: { select: { id: true, name: true } } },
          orderBy: { sequence_order: 'asc' },
        },
      },
    });

    await writeAuditLog({
      userId: performedBy,
      module: 'BOM',
      action: 'UPDATE',
      entity: 'BillOfMaterials',
      entityId: id,
      oldValue: { components: existing.components.length, operations: existing.operations.length },
      newValue: { components: data.components?.length, operations: data.operations?.length },
      ipAddress,
    });

    return bom;
  }

  static async delete(id: string, performedBy: string, ipAddress?: string) {
    const existing = await prisma.billOfMaterials.findUnique({ where: { id } });
    if (!existing) throw { status: 404, message: 'Bill of Materials not found.' };

    // Remove bom_id reference from products
    await prisma.product.updateMany({
      where: { bom_id: id },
      data: { bom_id: null },
    });

    await prisma.boMComponent.deleteMany({ where: { bom_id: id } });
    await prisma.boMOperation.deleteMany({ where: { bom_id: id } });
    await prisma.billOfMaterials.delete({ where: { id } });

    await writeAuditLog({
      userId: performedBy,
      module: 'BOM',
      action: 'DELETE',
      entity: 'BillOfMaterials',
      entityId: id,
      oldValue: { bom_reference: existing.bom_reference },
      newValue: null,
      ipAddress,
    });
  }
}

export class WorkCenterService {
  static async getAll() {
    return prisma.workCenter.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { operations: true, work_orders: true } },
      },
    });
  }

  static async create(
    data: { name: string; description?: string },
    performedBy: string,
    ipAddress?: string
  ) {
    const wc = await prisma.workCenter.create({ data });

    await writeAuditLog({
      userId: performedBy,
      module: 'MANUFACTURING',
      action: 'CREATE',
      entity: 'WorkCenter',
      entityId: wc.id,
      oldValue: null,
      newValue: { name: data.name },
      ipAddress,
    });

    return wc;
  }

  static async update(
    id: string,
    data: { name?: string; description?: string; is_active?: boolean },
    performedBy: string,
    ipAddress?: string
  ) {
    const existing = await prisma.workCenter.findUnique({ where: { id } });
    if (!existing) throw { status: 404, message: 'Work center not found.' };

    const wc = await prisma.workCenter.update({ where: { id }, data });

    await writeAuditLog({
      userId: performedBy,
      module: 'MANUFACTURING',
      action: 'UPDATE',
      entity: 'WorkCenter',
      entityId: id,
      oldValue: { name: existing.name },
      newValue: { name: wc.name },
      ipAddress,
    });

    return wc;
  }
}
