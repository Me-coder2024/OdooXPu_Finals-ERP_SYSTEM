import { Prisma, OrderStatus, StockMovement, WorkOrderStatus } from '@prisma/client';
import prisma from '../config/database';
import { writeAuditLog } from '../utils/auditLogger';
import { writeStockLedgerEntry } from '../utils/stockLedgerHelper';

export class ManufacturingOrderService {
  static async getAll(page = 1, limit = 20, status?: OrderStatus) {
    const skip = (page - 1) * limit;
    const where: Prisma.ManufacturingOrderWhereInput = {};
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.manufacturingOrder.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          bom: { select: { id: true, bom_reference: true } },
          creator: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
          source_so: { select: { id: true, so_number: true } },
        },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.manufacturingOrder.count({ where }),
    ]);

    return { orders, total, page, limit };
  }

  static async getById(id: string) {
    const order = await prisma.manufacturingOrder.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true, name: true, sku: true,
            on_hand_qty: true, reserved_qty: true,
          },
        },
        bom: {
          include: {
            components: {
              include: { product: { select: { id: true, name: true, sku: true } } },
            },
            operations: {
              include: { work_center: { select: { id: true, name: true } } },
              orderBy: { sequence_order: 'asc' },
            },
          },
        },
        creator: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
        source_so: { select: { id: true, so_number: true } },
        components: {
          include: {
            product: {
              select: {
                id: true, name: true, sku: true,
                on_hand_qty: true, reserved_qty: true,
              },
            },
          },
        },
        work_orders: {
          include: {
            operation: { select: { id: true, name: true, sequence_order: true } },
            work_center: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true } },
          },
          orderBy: { operation: { sequence_order: 'asc' } },
        },
      },
    });

    if (!order) throw { status: 404, message: 'Manufacturing order not found.' };

    // Add free_to_use_qty to product
    const enrichedProduct = {
      ...order.product,
      free_to_use_qty: Math.max(0, Number(order.product.on_hand_qty) - Number(order.product.reserved_qty)),
    };

    return { ...order, product: enrichedProduct };
  }

  static async create(
    data: {
      product_id: string;
      bom_id: string;
      qty_to_produce: number;
      scheduled_date: string;
      assigned_to?: string;
      notes?: string;
    },
    performedBy: string,
    ipAddress?: string
  ) {
    const bom = await prisma.billOfMaterials.findUnique({ where: { id: data.bom_id } });
    if (!bom) throw { status: 400, message: 'Invalid BoM ID.' };

    const product = await prisma.product.findUnique({ where: { id: data.product_id } });
    if (!product) throw { status: 400, message: 'Invalid product ID.' };

    const lastMO = await prisma.manufacturingOrder.findFirst({
      orderBy: { created_at: 'desc' },
      select: { mo_number: true },
    });
    const nextNum = lastMO ? parseInt(lastMO.mo_number.replace('MO-', '')) + 1 : 1;
    const moNumber = `MO-${String(nextNum).padStart(4, '0')}`;

    const order = await prisma.manufacturingOrder.create({
      data: {
        mo_number: moNumber,
        product_id: data.product_id,
        bom_id: data.bom_id,
        qty_to_produce: new Prisma.Decimal(data.qty_to_produce),
        scheduled_date: new Date(data.scheduled_date),
        assigned_to: data.assigned_to || null,
        created_by: performedBy,
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        bom: { select: { id: true, bom_reference: true } },
      },
    });

    await writeAuditLog({
      userId: performedBy,
      module: 'MANUFACTURING',
      action: 'CREATE',
      entity: 'ManufacturingOrder',
      entityId: order.id,
      oldValue: null,
      newValue: { mo_number: moNumber, product: product.name, qty: data.qty_to_produce, status: 'DRAFT' },
      ipAddress,
    });

    return order;
  }

  static async update(
    id: string,
    data: { qty_to_produce?: number; scheduled_date?: string; assigned_to?: string | null },
    performedBy: string,
    ipAddress?: string
  ) {
    const existing = await prisma.manufacturingOrder.findUnique({ where: { id } });
    if (!existing) throw { status: 404, message: 'Manufacturing order not found.' };
    if (existing.status !== OrderStatus.DRAFT) {
      throw { status: 400, message: 'Can only edit orders in DRAFT status.' };
    }

    const updateData: Record<string, unknown> = {};
    const oldValue: Record<string, unknown> = {};
    const newValue: Record<string, unknown> = {};

    if (data.qty_to_produce !== undefined) {
      oldValue.qty_to_produce = Number(existing.qty_to_produce);
      newValue.qty_to_produce = data.qty_to_produce;
      updateData.qty_to_produce = new Prisma.Decimal(data.qty_to_produce);
    }
    if (data.scheduled_date) {
      oldValue.scheduled_date = existing.scheduled_date;
      newValue.scheduled_date = data.scheduled_date;
      updateData.scheduled_date = new Date(data.scheduled_date);
    }
    if (data.assigned_to !== undefined) {
      updateData.assigned_to = data.assigned_to;
    }

    const order = await prisma.manufacturingOrder.update({
      where: { id },
      data: updateData,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        bom: { select: { id: true, bom_reference: true } },
      },
    });

    await writeAuditLog({
      userId: performedBy,
      module: 'MANUFACTURING',
      action: 'UPDATE',
      entity: 'ManufacturingOrder',
      entityId: id,
      oldValue,
      newValue,
      ipAddress,
    });

    return order;
  }

  /**
   * MO CONFIRM — read BoM → create mo_components → reserve components → create work_orders
   */
  static async confirm(id: string, performedBy: string, ipAddress?: string) {
    const order = await prisma.manufacturingOrder.findUnique({
      where: { id },
      include: {
        bom: {
          include: {
            components: { include: { product: true } },
            operations: {
              include: { work_center: true },
              orderBy: { sequence_order: 'asc' },
            },
          },
        },
        product: true,
      },
    });

    if (!order) throw { status: 404, message: 'Manufacturing order not found.' };
    if (order.status !== OrderStatus.DRAFT) {
      throw { status: 400, message: 'Can only confirm orders in DRAFT status.' };
    }

    const result = await prisma.$transaction(async (tx) => {
      const qtyToProduce = Number(order.qty_to_produce);
      const bomQtyProduced = Number(order.bom.qty_produced);
      const multiplier = qtyToProduce / bomQtyProduced;

      // Create MO components from BoM components
      for (const bomComp of order.bom.components) {
        const requiredQty = Number(bomComp.quantity) * multiplier;
        const product = await tx.product.findUnique({ where: { id: bomComp.product_id } });
        if (!product) throw new Error(`Component product not found: ${bomComp.product_id}`);

        const onHand = Number(product.on_hand_qty);
        const reserved = Number(product.reserved_qty);
        const freeToUse = onHand - reserved;
        const isAvailable = freeToUse >= requiredQty;

        // Create MO component row
        await tx.manufacturingOrderComponent.create({
          data: {
            mo_id: id,
            product_id: bomComp.product_id,
            required_qty: new Prisma.Decimal(requiredQty),
            consumed_qty: new Prisma.Decimal(0),
            is_available: isAvailable,
          },
        });

        // Reserve components if available
        if (isAvailable) {
          const newReserved = reserved + requiredQty;
          await tx.product.update({
            where: { id: product.id },
            data: { reserved_qty: new Prisma.Decimal(newReserved) },
          });

          await writeStockLedgerEntry({
            productId: product.id,
            movementType: StockMovement.RESERVATION,
            qtyChange: requiredQty,
            balanceAfter: onHand,
            referenceType: 'ManufacturingOrder',
            referenceId: id,
            notes: `Reserved ${requiredQty} units for ${order.mo_number}`,
            performedBy,
            tx,
          });
        }
      }

      // Create work orders from BoM operations
      for (const operation of order.bom.operations) {
        await tx.workOrder.create({
          data: {
            mo_id: id,
            operation_id: operation.id,
            work_center_id: operation.work_center_id,
            planned_duration_mins: Math.round(operation.duration_mins * multiplier),
            status: WorkOrderStatus.PENDING,
          },
        });
      }

      // Update MO status
      const updatedOrder = await tx.manufacturingOrder.update({
        where: { id },
        data: { status: OrderStatus.CONFIRMED },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          bom: { select: { id: true, bom_reference: true } },
          components: {
            include: { product: { select: { id: true, name: true, sku: true } } },
          },
          work_orders: {
            include: {
              operation: { select: { name: true, sequence_order: true } },
              work_center: { select: { name: true } },
            },
            orderBy: { operation: { sequence_order: 'asc' } },
          },
        },
      });

      await writeAuditLog({
        userId: performedBy,
        module: 'MANUFACTURING',
        action: 'CONFIRM',
        entity: 'ManufacturingOrder',
        entityId: id,
        oldValue: { status: 'DRAFT' },
        newValue: {
          status: 'CONFIRMED',
          components_created: order.bom.components.length,
          work_orders_created: order.bom.operations.length,
        },
        ipAddress,
        tx,
      });

      return updatedOrder;
    });

    return result;
  }

  /**
   * MO PRODUCE — ALL WORK ORDERS MUST BE DONE (both frontend + backend check)
   * Deduct consumed_qty from components, add qty_produced to finished product
   * Writes 4 types of stock ledger entries
   */
  static async produce(id: string, performedBy: string, ipAddress?: string) {
    const order = await prisma.manufacturingOrder.findUnique({
      where: { id },
      include: {
        product: true,
        components: { include: { product: true } },
        work_orders: true,
      },
    });

    if (!order) throw { status: 404, message: 'Manufacturing order not found.' };
    if (order.status !== OrderStatus.CONFIRMED && order.status !== OrderStatus.IN_PROGRESS) {
      throw { status: 400, message: 'Can only produce CONFIRMED or IN_PROGRESS orders.' };
    }

    // ============================================
    // HARD CHECK: ALL work orders must be DONE
    // ============================================
    const allWorkOrdersDone = order.work_orders.every(
      (wo) => wo.status === WorkOrderStatus.DONE
    );

    if (!allWorkOrdersDone) {
      throw {
        status: 400,
        message: 'Cannot produce: All work orders must be completed (DONE) before production.',
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      const qtyToProduce = Number(order.qty_to_produce);

      // Deduct consumed components
      for (const comp of order.components) {
        const product = await tx.product.findUnique({ where: { id: comp.product_id } });
        if (!product) throw new Error(`Component product not found: ${comp.product_id}`);

        const requiredQty = Number(comp.required_qty);
        const currentOnHand = Number(product.on_hand_qty);
        const currentReserved = Number(product.reserved_qty);

        // Deduct from on_hand (MFG_CONSUMPTION)
        const newOnHand = currentOnHand - requiredQty;
        // Reduce reserved
        const newReserved = Math.max(0, currentReserved - requiredQty);

        await tx.product.update({
          where: { id: product.id },
          data: {
            on_hand_qty: new Prisma.Decimal(Math.max(0, newOnHand)),
            reserved_qty: new Prisma.Decimal(newReserved),
          },
        });

        // Update consumed_qty on MO component
        await tx.manufacturingOrderComponent.update({
          where: { id: comp.id },
          data: { consumed_qty: new Prisma.Decimal(requiredQty) },
        });

        // MFG_CONSUMPTION ledger entry (negative)
        await writeStockLedgerEntry({
          productId: product.id,
          movementType: StockMovement.MFG_CONSUMPTION,
          qtyChange: -requiredQty,
          balanceAfter: Math.max(0, newOnHand),
          referenceType: 'ManufacturingOrder',
          referenceId: id,
          notes: `Consumed ${requiredQty} units for ${order.mo_number}`,
          performedBy,
          tx,
        });

        // UNRESERVATION ledger entry
        await writeStockLedgerEntry({
          productId: product.id,
          movementType: StockMovement.UNRESERVATION,
          qtyChange: -requiredQty,
          balanceAfter: Math.max(0, newOnHand),
          referenceType: 'ManufacturingOrder',
          referenceId: id,
          notes: `Unreserved ${requiredQty} units after consumption for ${order.mo_number}`,
          performedBy,
          tx,
        });
      }

      // Add finished product to stock
      const finishedProduct = await tx.product.findUnique({ where: { id: order.product_id } });
      if (!finishedProduct) throw new Error('Finished product not found');

      const newFinishedOnHand = Number(finishedProduct.on_hand_qty) + qtyToProduce;

      await tx.product.update({
        where: { id: order.product_id },
        data: { on_hand_qty: new Prisma.Decimal(newFinishedOnHand) },
      });

      // MFG_PRODUCTION ledger entry (positive)
      await writeStockLedgerEntry({
        productId: order.product_id,
        movementType: StockMovement.MFG_PRODUCTION,
        qtyChange: qtyToProduce,
        balanceAfter: newFinishedOnHand,
        referenceType: 'ManufacturingOrder',
        referenceId: id,
        notes: `Produced ${qtyToProduce} units from ${order.mo_number}`,
        performedBy,
        tx,
      });

      // Update MO status and qty_produced
      const updatedOrder = await tx.manufacturingOrder.update({
        where: { id },
        data: {
          status: OrderStatus.DONE,
          qty_produced: new Prisma.Decimal(qtyToProduce),
        },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          components: {
            include: { product: { select: { id: true, name: true, sku: true } } },
          },
        },
      });

      await writeAuditLog({
        userId: performedBy,
        module: 'MANUFACTURING',
        action: 'PRODUCE',
        entity: 'ManufacturingOrder',
        entityId: id,
        oldValue: { status: order.status, qty_produced: 0 },
        newValue: { status: 'DONE', qty_produced: qtyToProduce },
        ipAddress,
        tx,
      });

      return updatedOrder;
    });

    return result;
  }

  /**
   * Update work order status: PENDING → IN_PROGRESS → DONE
   */
  static async updateWorkOrder(
    moId: string,
    woId: string,
    data: { status: WorkOrderStatus; actual_duration_mins?: number; assigned_to?: string },
    performedBy: string,
    ipAddress?: string
  ) {
    const wo = await prisma.workOrder.findFirst({
      where: { id: woId, mo_id: moId },
    });

    if (!wo) throw { status: 404, message: 'Work order not found.' };

    const updateData: Record<string, unknown> = { status: data.status };

    if (data.status === WorkOrderStatus.IN_PROGRESS && !wo.started_at) {
      updateData.started_at = new Date();
    }
    if (data.status === WorkOrderStatus.DONE) {
      updateData.completed_at = new Date();
      if (data.actual_duration_mins) {
        updateData.actual_duration_mins = data.actual_duration_mins;
      }
    }
    if (data.assigned_to) {
      updateData.assigned_to = data.assigned_to;
    }

    const updated = await prisma.workOrder.update({
      where: { id: woId },
      data: updateData,
      include: {
        operation: { select: { name: true, sequence_order: true } },
        work_center: { select: { name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    // Check if MO should move to IN_PROGRESS
    if (data.status === WorkOrderStatus.IN_PROGRESS) {
      const mo = await prisma.manufacturingOrder.findUnique({ where: { id: moId } });
      if (mo && mo.status === OrderStatus.CONFIRMED) {
        await prisma.manufacturingOrder.update({
          where: { id: moId },
          data: { status: OrderStatus.IN_PROGRESS },
        });
      }
    }

    await writeAuditLog({
      userId: performedBy,
      module: 'MANUFACTURING',
      action: 'UPDATE_WORK_ORDER',
      entity: 'WorkOrder',
      entityId: woId,
      oldValue: { status: wo.status },
      newValue: { status: data.status },
      ipAddress,
    });

    return updated;
  }

  static async cancel(id: string, performedBy: string, ipAddress?: string) {
    const order = await prisma.manufacturingOrder.findUnique({
      where: { id },
      include: { components: { include: { product: true } } },
    });

    if (!order) throw { status: 404, message: 'Manufacturing order not found.' };
    if (order.status === OrderStatus.DONE || order.status === OrderStatus.CANCELLED) {
      throw { status: 400, message: 'Cannot cancel a completed or already cancelled order.' };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Unreserve components
      for (const comp of order.components) {
        if (Number(comp.consumed_qty) === 0) {
          const product = await tx.product.findUnique({ where: { id: comp.product_id } });
          if (!product) continue;

          const requiredQty = Number(comp.required_qty);
          const newReserved = Math.max(0, Number(product.reserved_qty) - requiredQty);

          await tx.product.update({
            where: { id: product.id },
            data: { reserved_qty: new Prisma.Decimal(newReserved) },
          });

          await writeStockLedgerEntry({
            productId: product.id,
            movementType: StockMovement.UNRESERVATION,
            qtyChange: -requiredQty,
            balanceAfter: Number(product.on_hand_qty),
            referenceType: 'ManufacturingOrder',
            referenceId: id,
            notes: `Unreserved ${requiredQty} units due to ${order.mo_number} cancellation`,
            performedBy,
            tx,
          });
        }
      }

      const updated = await tx.manufacturingOrder.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
      });

      await writeAuditLog({
        userId: performedBy,
        module: 'MANUFACTURING',
        action: 'CANCEL',
        entity: 'ManufacturingOrder',
        entityId: id,
        oldValue: { status: order.status },
        newValue: { status: 'CANCELLED' },
        ipAddress,
        tx,
      });

      return updated;
    });

    return result;
  }
}
