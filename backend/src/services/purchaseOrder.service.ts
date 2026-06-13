import { Prisma, OrderStatus, StockMovement } from '@prisma/client';
import prisma from '../config/database';
import { writeAuditLog } from '../utils/auditLogger';
import { writeStockLedgerEntry } from '../utils/stockLedgerHelper';

export class PurchaseOrderService {
  static async getAll(page = 1, limit = 20, status?: OrderStatus) {
    const skip = (page - 1) * limit;
    const where: Prisma.PurchaseOrderWhereInput = {};
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          vendor: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true } },
          source_so: { select: { id: true, so_number: true } },
          lines: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return { orders, total, page, limit };
  }

  static async getById(id: string) {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        creator: { select: { id: true, name: true } },
        source_so: { select: { id: true, so_number: true } },
        lines: {
          include: {
            product: {
              select: {
                id: true, name: true, sku: true,
                on_hand_qty: true, reserved_qty: true,
              },
            },
          },
        },
      },
    });

    if (!order) throw { status: 404, message: 'Purchase order not found.' };
    return order;
  }

  static async create(
    data: {
      vendor_id: string;
      order_date: string;
      expected_date?: string;
      notes?: string;
      lines: { product_id: string; ordered_qty: number; unit_cost: number }[];
    },
    performedBy: string,
    ipAddress?: string
  ) {
    if (!data.lines || data.lines.length === 0) {
      throw { status: 400, message: 'At least one order line is required.' };
    }

    const vendor = await prisma.vendor.findUnique({ where: { id: data.vendor_id } });
    if (!vendor) throw { status: 400, message: 'Invalid vendor ID.' };

    const lastPO = await prisma.purchaseOrder.findFirst({
      orderBy: { created_at: 'desc' },
      select: { po_number: true },
    });
    const nextNum = lastPO ? parseInt(lastPO.po_number.replace('PO-', '')) + 1 : 1;
    const poNumber = `PO-${String(nextNum).padStart(4, '0')}`;

    const lines = data.lines.map((line) => ({
      product_id: line.product_id,
      ordered_qty: new Prisma.Decimal(line.ordered_qty),
      received_qty: new Prisma.Decimal(0),
      unit_cost: new Prisma.Decimal(line.unit_cost),
      subtotal: new Prisma.Decimal(line.ordered_qty * line.unit_cost),
    }));

    const totalAmount = lines.reduce((sum, l) => sum.add(l.subtotal), new Prisma.Decimal(0));

    const order = await prisma.purchaseOrder.create({
      data: {
        po_number: poNumber,
        vendor_id: data.vendor_id,
        order_date: new Date(data.order_date),
        expected_date: data.expected_date ? new Date(data.expected_date) : null,
        total_amount: totalAmount,
        notes: data.notes,
        created_by: performedBy,
        lines: { create: lines },
      },
      include: {
        vendor: { select: { id: true, name: true } },
        lines: {
          include: { product: { select: { id: true, name: true, sku: true } } },
        },
      },
    });

    await writeAuditLog({
      userId: performedBy,
      module: 'PURCHASE',
      action: 'CREATE',
      entity: 'PurchaseOrder',
      entityId: order.id,
      oldValue: null,
      newValue: { po_number: poNumber, vendor: vendor.name, total_amount: Number(totalAmount), status: 'DRAFT' },
      ipAddress,
    });

    return order;
  }

  static async update(
    id: string,
    data: { vendor_id?: string; expected_date?: string; notes?: string },
    performedBy: string,
    ipAddress?: string
  ) {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) throw { status: 404, message: 'Purchase order not found.' };
    if (existing.status !== OrderStatus.DRAFT) {
      throw { status: 400, message: 'Can only edit orders in DRAFT status.' };
    }

    const updateData: Prisma.PurchaseOrderUpdateInput = {};
    const oldValue: Record<string, unknown> = {};
    const newValue: Record<string, unknown> = {};

    if (data.vendor_id) {
      oldValue.vendor_id = existing.vendor_id;
      newValue.vendor_id = data.vendor_id;
      updateData.vendor = { connect: { id: data.vendor_id } };
    }
    if (data.expected_date) {
      updateData.expected_date = new Date(data.expected_date);
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    const order = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        vendor: { select: { id: true, name: true } },
        lines: {
          include: { product: { select: { id: true, name: true, sku: true } } },
        },
      },
    });

    await writeAuditLog({
      userId: performedBy,
      module: 'PURCHASE',
      action: 'UPDATE',
      entity: 'PurchaseOrder',
      entityId: id,
      oldValue,
      newValue,
      ipAddress,
    });

    return order;
  }

  static async confirm(id: string, performedBy: string, ipAddress?: string) {
    const order = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) throw { status: 404, message: 'Purchase order not found.' };
    if (order.status !== OrderStatus.DRAFT) {
      throw { status: 400, message: 'Can only confirm orders in DRAFT status.' };
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: OrderStatus.CONFIRMED },
      include: {
        vendor: { select: { id: true, name: true } },
        lines: {
          include: { product: { select: { id: true, name: true, sku: true } } },
        },
      },
    });

    await writeAuditLog({
      userId: performedBy,
      module: 'PURCHASE',
      action: 'CONFIRM',
      entity: 'PurchaseOrder',
      entityId: id,
      oldValue: { status: 'DRAFT' },
      newValue: { status: 'CONFIRMED' },
      ipAddress,
    });

    return updated;
  }

  /**
   * PO RECEIVE — increase on_hand per line, insert PURCHASE_RECEIPT ledger, update status
   */
  static async receive(
    id: string,
    receiveData: { lines: { line_id: string; received_qty: number }[] },
    performedBy: string,
    ipAddress?: string
  ) {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { lines: { include: { product: true } } },
    });

    if (!order) throw { status: 404, message: 'Purchase order not found.' };
    if (order.status !== OrderStatus.CONFIRMED && order.status !== OrderStatus.PARTIALLY_RECEIVED) {
      throw { status: 400, message: 'Can only receive CONFIRMED or PARTIALLY_RECEIVED orders.' };
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const receipt of receiveData.lines) {
        const line = order.lines.find((l) => l.id === receipt.line_id);
        if (!line) throw new Error(`Order line not found: ${receipt.line_id}`);

        const alreadyReceived = Number(line.received_qty);
        const ordered = Number(line.ordered_qty);
        const toReceive = receipt.received_qty;

        if (alreadyReceived + toReceive > ordered) {
          throw new Error(`Cannot receive more than ordered for product ${line.product.name}`);
        }

        // Increase on_hand_qty
        const product = await tx.product.findUnique({ where: { id: line.product_id } });
        if (!product) throw new Error('Product not found');

        const newOnHand = Number(product.on_hand_qty) + toReceive;

        await tx.product.update({
          where: { id: product.id },
          data: { on_hand_qty: new Prisma.Decimal(newOnHand) },
        });

        // Update received qty on line
        await tx.purchaseOrderLine.update({
          where: { id: line.id },
          data: { received_qty: new Prisma.Decimal(alreadyReceived + toReceive) },
        });

        // PURCHASE_RECEIPT stock ledger (positive)
        await writeStockLedgerEntry({
          productId: product.id,
          movementType: StockMovement.PURCHASE_RECEIPT,
          qtyChange: toReceive,
          balanceAfter: newOnHand,
          referenceType: 'PurchaseOrder',
          referenceId: order.id,
          notes: `Received ${toReceive} units from ${order.po_number}`,
          performedBy,
          tx,
        });
      }

      // Determine new status
      const updatedLines = await tx.purchaseOrderLine.findMany({ where: { po_id: id } });
      const allReceived = updatedLines.every((l) => Number(l.received_qty) >= Number(l.ordered_qty));
      const someReceived = updatedLines.some((l) => Number(l.received_qty) > 0);

      const newStatus = allReceived
        ? OrderStatus.FULLY_RECEIVED
        : someReceived
        ? OrderStatus.PARTIALLY_RECEIVED
        : order.status;

      const updatedOrder = await tx.purchaseOrder.update({
        where: { id },
        data: { status: newStatus },
        include: {
          vendor: { select: { id: true, name: true } },
          lines: {
            include: { product: { select: { id: true, name: true, sku: true } } },
          },
        },
      });

      await writeAuditLog({
        userId: performedBy,
        module: 'PURCHASE',
        action: 'RECEIVE',
        entity: 'PurchaseOrder',
        entityId: id,
        oldValue: { status: order.status },
        newValue: { status: newStatus },
        ipAddress,
        tx,
      });

      return updatedOrder;
    });

    return result;
  }

  static async cancel(id: string, performedBy: string, ipAddress?: string) {
    const order = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) throw { status: 404, message: 'Purchase order not found.' };
    if (order.status === OrderStatus.FULLY_RECEIVED || order.status === OrderStatus.CANCELLED) {
      throw { status: 400, message: 'Cannot cancel a fully received or already cancelled order.' };
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
    });

    await writeAuditLog({
      userId: performedBy,
      module: 'PURCHASE',
      action: 'CANCEL',
      entity: 'PurchaseOrder',
      entityId: id,
      oldValue: { status: order.status },
      newValue: { status: 'CANCELLED' },
      ipAddress,
    });

    return updated;
  }
}
