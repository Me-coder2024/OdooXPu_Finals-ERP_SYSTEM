import prisma from '../config/database';
import { writeAuditLog } from '../utils/auditLogger';

export class VendorService {
  static async getAll(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? { name: { contains: search, mode: 'insensitive' as const } }
      : {};

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.vendor.count({ where }),
    ]);

    return { vendors, total, page, limit };
  }

  static async getById(id: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        products: { select: { id: true, name: true, sku: true } },
        purchase_orders: {
          select: { id: true, po_number: true, status: true, total_amount: true },
          take: 10,
          orderBy: { created_at: 'desc' },
        },
      },
    });
    if (!vendor) throw { status: 404, message: 'Vendor not found.' };
    return vendor;
  }

  static async create(
    data: { name: string; email?: string; phone?: string; address?: string },
    performedBy: string,
    ipAddress?: string
  ) {
    const vendor = await prisma.vendor.create({ data });

    await writeAuditLog({
      userId: performedBy,
      module: 'PURCHASE',
      action: 'CREATE',
      entity: 'Vendor',
      entityId: vendor.id,
      oldValue: null,
      newValue: { name: data.name, email: data.email },
      ipAddress,
    });

    return vendor;
  }

  static async update(
    id: string,
    data: { name?: string; email?: string; phone?: string; address?: string },
    performedBy: string,
    ipAddress?: string
  ) {
    const existing = await prisma.vendor.findUnique({ where: { id } });
    if (!existing) throw { status: 404, message: 'Vendor not found.' };

    const vendor = await prisma.vendor.update({ where: { id }, data });

    await writeAuditLog({
      userId: performedBy,
      module: 'PURCHASE',
      action: 'UPDATE',
      entity: 'Vendor',
      entityId: id,
      oldValue: { name: existing.name, email: existing.email },
      newValue: { name: vendor.name, email: vendor.email },
      ipAddress,
    });

    return vendor;
  }
}

export class CustomerService {
  static async getAll(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? { name: { contains: search, mode: 'insensitive' as const } }
      : {};

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);

    return { customers, total, page, limit };
  }

  static async getById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sales_orders: {
          select: { id: true, so_number: true, status: true, total_amount: true },
          take: 10,
          orderBy: { created_at: 'desc' },
        },
      },
    });
    if (!customer) throw { status: 404, message: 'Customer not found.' };
    return customer;
  }

  static async create(
    data: { name: string; email?: string; phone?: string; address?: string },
    performedBy: string,
    ipAddress?: string
  ) {
    const customer = await prisma.customer.create({ data });

    await writeAuditLog({
      userId: performedBy,
      module: 'SALES',
      action: 'CREATE',
      entity: 'Customer',
      entityId: customer.id,
      oldValue: null,
      newValue: { name: data.name, email: data.email },
      ipAddress,
    });

    return customer;
  }

  static async update(
    id: string,
    data: { name?: string; email?: string; phone?: string; address?: string },
    performedBy: string,
    ipAddress?: string
  ) {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) throw { status: 404, message: 'Customer not found.' };

    const customer = await prisma.customer.update({ where: { id }, data });

    await writeAuditLog({
      userId: performedBy,
      module: 'SALES',
      action: 'UPDATE',
      entity: 'Customer',
      entityId: id,
      oldValue: { name: existing.name, email: existing.email },
      newValue: { name: customer.name, email: customer.email },
      ipAddress,
    });

    return customer;
  }
}
