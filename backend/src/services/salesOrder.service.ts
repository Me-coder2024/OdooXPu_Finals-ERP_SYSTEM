import { Prisma, OrderStatus, StockMovement } from '@prisma/client';
import prisma from '../config/database';
import { writeAuditLog } from '../utils/auditLogger';
import { writeStockLedgerEntry } from '../utils/stockLedgerHelper';
import { ManufacturingOrderService } from './manufacturingOrder.service';

export class SalesOrderService {
  static async getAll(page = 1, limit = 20, status?: OrderStatus) {
    const skip = (page - 1) * limit;
    const where: Prisma.SalesOrderWhereInput = {};
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true } },
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
      prisma.salesOrder.count({ where }),
    ]);

    return { orders, total, page, limit };
  }

  static async getById(id: string) {
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        creator: { select: { id: true, name: true } },
        lines: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                on_hand_qty: true,
                reserved_qty: true,
                procure_on_demand: true,
                procurement_type: true,
              },
            },
          },
        },
        triggered_pos: {
          select: { id: true, po_number: true, status: true, auto_generated: true },
        },
        triggered_mos: {
          select: { id: true, mo_number: true, status: true, auto_generated: true },
        },
      },
    });

    if (!order) {
      throw { status: 404, message: 'Sales order not found.' };
    }

    // Add free_to_use_qty to each line's product
    const enrichedLines = order.lines.map((line) => ({
      ...line,
      product: {
        ...line.product,
        free_to_use_qty: Math.max(
          0,
          Number(line.product.on_hand_qty) - Number(line.product.reserved_qty)
        ),
      },
    }));

    return { ...order, lines: enrichedLines };
  }

  static async create(
    data: {
      customer_id: string;
      order_date: string;
      expected_delivery?: string;
      notes?: string;
      lines: {
        product_id: string;
        ordered_qty: number;
        unit_price: number;
      }[];
    },
    performedBy: string,
    ipAddress?: string
  ) {
    if (!data.lines || data.lines.length === 0) {
      throw { status: 400, message: 'At least one order line is required.' };
    }

    const customer = await prisma.customer.findUnique({ where: { id: data.customer_id } });
    if (!customer) {
      throw { status: 400, message: 'Invalid customer ID.' };
    }

    // Generate SO number
    const lastSO = await prisma.salesOrder.findFirst({
      orderBy: { created_at: 'desc' },
      select: { so_number: true },
    });
    const nextNum = lastSO
      ? parseInt(lastSO.so_number.replace('SO-', '')) + 1
      : 1;
    const soNumber = `SO-${String(nextNum).padStart(4, '0')}`;

    // Calculate totals
    const lines = data.lines.map((line) => ({
      product_id: line.product_id,
      ordered_qty: new Prisma.Decimal(line.ordered_qty),
      delivered_qty: new Prisma.Decimal(0),
      unit_price: new Prisma.Decimal(line.unit_price),
      subtotal: new Prisma.Decimal(line.ordered_qty * line.unit_price),
    }));

    const totalAmount = lines.reduce(
      (sum, line) => sum.add(line.subtotal),
      new Prisma.Decimal(0)
    );

    const order = await prisma.salesOrder.create({
      data: {
        so_number: soNumber,
        customer_id: data.customer_id,
        order_date: new Date(data.order_date),
        expected_delivery: data.expected_delivery ? new Date(data.expected_delivery) : null,
        total_amount: totalAmount,
        notes: data.notes,
        created_by: performedBy,
        lines: { create: lines },
      },
      include: {
        customer: { select: { id: true, name: true } },
        lines: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    });

    await writeAuditLog({
      userId: performedBy,
      module: 'SALES',
      action: 'CREATE',
      entity: 'SalesOrder',
      entityId: order.id,
      oldValue: null,
      newValue: { so_number: soNumber, customer: customer.name, total_amount: Number(totalAmount), status: 'DRAFT' },
      ipAddress,
    });

    return order;
  }

  static async update(
    id: string,
    data: {
      customer_id?: string;
      expected_delivery?: string;
      notes?: string;
      lines?: {
        product_id: string;
        ordered_qty: number;
        unit_price: number;
      }[];
    },
    performedBy: string,
    ipAddress?: string
  ) {
    const existing = await prisma.salesOrder.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!existing) {
      throw { status: 404, message: 'Sales order not found.' };
    }

    if (existing.status !== OrderStatus.DRAFT) {
      throw { status: 400, message: 'Can only edit orders in DRAFT status.' };
    }

    const oldValue: Record<string, unknown> = {};
    const newValue: Record<string, unknown> = {};
    const updateData: Prisma.SalesOrderUpdateInput = {};

    if (data.customer_id) {
      oldValue.customer_id = existing.customer_id;
      newValue.customer_id = data.customer_id;
      updateData.customer = { connect: { id: data.customer_id } };
    }
    if (data.expected_delivery) {
      oldValue.expected_delivery = existing.expected_delivery;
      newValue.expected_delivery = data.expected_delivery;
      updateData.expected_delivery = new Date(data.expected_delivery);
    }
    if (data.notes !== undefined) {
      oldValue.notes = existing.notes;
      newValue.notes = data.notes;
      updateData.notes = data.notes;
    }

    // If lines are being updated, replace all
    if (data.lines && data.lines.length > 0) {
      await prisma.salesOrderLine.deleteMany({ where: { so_id: id } });

      const newLines = data.lines.map((line) => ({
        so_id: id,
        product_id: line.product_id,
        ordered_qty: new Prisma.Decimal(line.ordered_qty),
        delivered_qty: new Prisma.Decimal(0),
        unit_price: new Prisma.Decimal(line.unit_price),
        subtotal: new Prisma.Decimal(line.ordered_qty * line.unit_price),
      }));

      await prisma.salesOrderLine.createMany({ data: newLines });

      const totalAmount = newLines.reduce(
        (sum, line) => sum.add(line.subtotal),
        new Prisma.Decimal(0)
      );
      updateData.total_amount = totalAmount;
    }

    const order = await prisma.salesOrder.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true } },
        lines: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    });

    await writeAuditLog({
      userId: performedBy,
      module: 'SALES',
      action: 'UPDATE',
      entity: 'SalesOrder',
      entityId: id,
      oldValue,
      newValue,
      ipAddress,
    });

    return order;
  }

  /**
   * ATOMIC SO CONFIRM — the most critical transaction in the system.
   * Uses prisma.$transaction() to ensure all-or-nothing:
   * 1. Check free_to_use per line
   * 2. If sufficient: reserve qty, insert RESERVATION ledger
   * 3. If shortage + procure_on_demand: auto-create PO or MO
   * 4. Status → CONFIRMED, audit log
   * ANY FAILURE = FULL ROLLBACK
   */
  static async confirm(id: string, performedBy: string, ipAddress?: string) {
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw { status: 404, message: 'Sales order not found.' };
    }

    if (order.status !== OrderStatus.DRAFT) {
      throw { status: 400, message: 'Can only confirm orders in DRAFT status.' };
    }

    // ============================================================
    // ATOMIC TRANSACTION — reserve stock + auto MTO = all or nothing
    // ============================================================
    const result = await prisma.$transaction(async (tx) => {
      const autoCreatedPOs: string[] = [];
      const autoCreatedMOs: string[] = [];

      for (const line of order.lines) {
        const product = await tx.product.findUnique({
          where: { id: line.product_id },
        });

        if (!product) {
          throw new Error(`Product not found: ${line.product_id}`);
        }

        const onHand = Number(product.on_hand_qty);
        const reserved = Number(product.reserved_qty);
        const freeToUse = onHand - reserved;
        const orderedQty = Number(line.ordered_qty);

        if (freeToUse >= orderedQty) {
          // SUFFICIENT STOCK — reserve fully
          const newReserved = reserved + orderedQty;
          await tx.product.update({
            where: { id: product.id },
            data: { reserved_qty: new Prisma.Decimal(newReserved) },
          });

          await tx.salesOrderLine.update({
            where: { id: line.id },
            data: { reserved: true },
          });

          // RESERVATION stock ledger entry
          await writeStockLedgerEntry({
            productId: product.id,
            movementType: StockMovement.RESERVATION,
            qtyChange: orderedQty,
            balanceAfter: onHand,
            referenceType: 'SalesOrder',
            referenceId: order.id,
            notes: `Reserved ${orderedQty} units for ${order.so_number}`,
            performedBy,
            tx,
          });
        } else {
          // SHORTAGE — reserve what's available
          const availableToReserve = Math.max(0, freeToUse);

          if (availableToReserve > 0) {
            const newReserved = reserved + availableToReserve;
            await tx.product.update({
              where: { id: product.id },
              data: { reserved_qty: new Prisma.Decimal(newReserved) },
            });

            await writeStockLedgerEntry({
              productId: product.id,
              movementType: StockMovement.RESERVATION,
              qtyChange: availableToReserve,
              balanceAfter: onHand,
              referenceType: 'SalesOrder',
              referenceId: order.id,
              notes: `Partially reserved ${availableToReserve} of ${orderedQty} units for ${order.so_number}`,
              performedBy,
              tx,
            });
          }

          const shortageQty = orderedQty - availableToReserve;

          // AUTO PROCUREMENT (MTO) — if procure_on_demand is enabled
          if (product.procure_on_demand && shortageQty > 0) {
            if (product.procurement_type === 'PURCHASE') {
              // Auto-create Purchase Order
              const lastPO = await tx.purchaseOrder.findFirst({
                orderBy: { created_at: 'desc' },
                select: { po_number: true },
              });
              const nextPONum = lastPO
                ? parseInt(lastPO.po_number.replace('PO-', '')) + 1
                : 1;
              const poNumber = `PO-${String(nextPONum).padStart(4, '0')}`;

              if (!product.preferred_vendor_id) {
                throw new Error(
                  `Product ${product.name} (${product.sku}) requires a preferred vendor for auto purchase.`
                );
              }

              const po = await tx.purchaseOrder.create({
                data: {
                  po_number: poNumber,
                  vendor_id: product.preferred_vendor_id,
                  order_date: new Date(),
                  auto_generated: true,
                  source_so_id: order.id,
                  created_by: performedBy,
                  total_amount: new Prisma.Decimal(shortageQty * Number(product.cost_price)),
                  notes: `Auto-generated from ${order.so_number} for shortage of ${shortageQty} units`,
                  lines: {
                    create: [{
                      product_id: product.id,
                      ordered_qty: new Prisma.Decimal(shortageQty),
                      received_qty: new Prisma.Decimal(0),
                      unit_cost: product.cost_price,
                      subtotal: new Prisma.Decimal(shortageQty * Number(product.cost_price)),
                    }],
                  },
                },
              });

              autoCreatedPOs.push(poNumber);

              await writeAuditLog({
                userId: performedBy,
                module: 'PURCHASE',
                action: 'AUTO_CREATE',
                entity: 'PurchaseOrder',
                entityId: po.id,
                oldValue: null,
                newValue: {
                  po_number: poNumber,
                  auto_generated: true,
                  source_so: order.so_number,
                  shortage_qty: shortageQty,
                  product: product.name,
                },
                ipAddress,
                tx,
              });
            } else if (product.procurement_type === 'MANUFACTURING') {
              // Auto-create Manufacturing Order
              const lastMO = await tx.manufacturingOrder.findFirst({
                orderBy: { created_at: 'desc' },
                select: { mo_number: true },
              });
              const nextMONum = lastMO
                ? parseInt(lastMO.mo_number.replace('MO-', '')) + 1
                : 1;
              const moNumber = `MO-${String(nextMONum).padStart(4, '0')}`;

              if (!product.bom_id) {
                throw new Error(
                  `Product ${product.name} (${product.sku}) requires a BoM for auto manufacturing.`
                );
              }

              const mo = await tx.manufacturingOrder.create({
                data: {
                  mo_number: moNumber,
                  product_id: product.id,
                  bom_id: product.bom_id,
                  qty_to_produce: new Prisma.Decimal(shortageQty),
                  scheduled_date: new Date(),
                  auto_generated: true,
                  source_so_id: order.id,
                  created_by: performedBy,
                },
              });

              autoCreatedMOs.push(moNumber);

              await writeAuditLog({
                userId: performedBy,
                module: 'MANUFACTURING',
                action: 'AUTO_CREATE',
                entity: 'ManufacturingOrder',
                entityId: mo.id,
                oldValue: null,
                newValue: {
                  mo_number: moNumber,
                  auto_generated: true,
                  source_so: order.so_number,
                  shortage_qty: shortageQty,
                  product: product.name,
                },
                ipAddress,
                tx,
              });

              // ═══ AUTO-CONFIRM the MO (cascades: creates components, work orders, POs for raw materials) ═══
              const moConfirmResult = await ManufacturingOrderService._confirmInTx(
                tx, mo.id, performedBy, ipAddress
              );
              // Merge cascaded POs/MOs into the response
              autoCreatedPOs.push(...moConfirmResult.autoCreatedPOs);
              autoCreatedMOs.push(...moConfirmResult.autoCreatedMOs);
            }
          }

          // Mark line as partially reserved or not reserved
          await tx.salesOrderLine.update({
            where: { id: line.id },
            data: { reserved: availableToReserve > 0 },
          });
        }
      }

      // Update SO status to CONFIRMED
      const updatedOrder = await tx.salesOrder.update({
        where: { id },
        data: { status: OrderStatus.CONFIRMED },
        include: {
          customer: { select: { id: true, name: true } },
          lines: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
          triggered_pos: {
            select: { id: true, po_number: true, status: true, auto_generated: true },
          },
          triggered_mos: {
            select: { id: true, mo_number: true, status: true, auto_generated: true },
          },
        },
      });

      // Audit log for status change
      await writeAuditLog({
        userId: performedBy,
        module: 'SALES',
        action: 'CONFIRM',
        entity: 'SalesOrder',
        entityId: id,
        oldValue: { status: 'DRAFT' },
        newValue: {
          status: 'CONFIRMED',
          auto_created_pos: autoCreatedPOs,
          auto_created_mos: autoCreatedMOs,
        },
        ipAddress,
        tx,
      });

      return {
        order: updatedOrder,
        autoCreatedPOs,
        autoCreatedMOs,
      };
    });

    return result;
  }

  /**
   * SO DELIVER — deduct on_hand, reduce reserved, insert SALE ledger
   */
  static async deliver(
    id: string,
    deliveryData: { lines: { line_id: string; delivered_qty: number }[] },
    performedBy: string,
    ipAddress?: string
  ) {
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        lines: { include: { product: true } },
      },
    });

    if (!order) {
      throw { status: 404, message: 'Sales order not found.' };
    }

    if (order.status !== OrderStatus.CONFIRMED && order.status !== OrderStatus.PARTIALLY_DELIVERED) {
      throw { status: 400, message: 'Can only deliver CONFIRMED or PARTIALLY_DELIVERED orders.' };
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const delivery of deliveryData.lines) {
        const line = order.lines.find((l) => l.id === delivery.line_id);
        if (!line) {
          throw new Error(`Order line not found: ${delivery.line_id}`);
        }

        const alreadyDelivered = Number(line.delivered_qty);
        const ordered = Number(line.ordered_qty);
        const toDeliver = delivery.delivered_qty;

        if (alreadyDelivered + toDeliver > ordered) {
          throw new Error(`Cannot deliver more than ordered for product ${line.product.name}`);
        }

        const product = await tx.product.findUnique({ where: { id: line.product_id } });
        if (!product) throw new Error('Product not found');

        const currentOnHand = Number(product.on_hand_qty);
        const currentReserved = Number(product.reserved_qty);

        if (currentOnHand < toDeliver) {
          throw new Error(`Insufficient stock for ${product.name}. On hand: ${currentOnHand}, Required: ${toDeliver}`);
        }

        // Deduct on_hand and reduce reserved
        const newOnHand = currentOnHand - toDeliver;
        const newReserved = Math.max(0, currentReserved - toDeliver);

        await tx.product.update({
          where: { id: product.id },
          data: {
            on_hand_qty: new Prisma.Decimal(newOnHand),
            reserved_qty: new Prisma.Decimal(newReserved),
          },
        });

        // Update delivered qty on line
        await tx.salesOrderLine.update({
          where: { id: line.id },
          data: {
            delivered_qty: new Prisma.Decimal(alreadyDelivered + toDeliver),
          },
        });

        // SALE stock ledger entry (negative)
        await writeStockLedgerEntry({
          productId: product.id,
          movementType: StockMovement.SALE,
          qtyChange: -toDeliver,
          balanceAfter: newOnHand,
          referenceType: 'SalesOrder',
          referenceId: order.id,
          notes: `Delivered ${toDeliver} units for ${order.so_number}`,
          performedBy,
          tx,
        });

        // UNRESERVATION entry
        await writeStockLedgerEntry({
          productId: product.id,
          movementType: StockMovement.UNRESERVATION,
          qtyChange: -toDeliver,
          balanceAfter: newOnHand,
          referenceType: 'SalesOrder',
          referenceId: order.id,
          notes: `Unreserved ${toDeliver} units after delivery for ${order.so_number}`,
          performedBy,
          tx,
        });
      }

      // Determine new status
      const updatedLines = await tx.salesOrderLine.findMany({
        where: { so_id: id },
      });

      const allFullyDelivered = updatedLines.every(
        (l) => Number(l.delivered_qty) >= Number(l.ordered_qty)
      );

      const someDelivered = updatedLines.some(
        (l) => Number(l.delivered_qty) > 0
      );

      let newStatus: OrderStatus;
      if (allFullyDelivered) {
        newStatus = OrderStatus.FULLY_DELIVERED;
      } else if (someDelivered) {
        newStatus = OrderStatus.PARTIALLY_DELIVERED;
      } else {
        newStatus = order.status;
      }

      const updatedOrder = await tx.salesOrder.update({
        where: { id },
        data: { status: newStatus },
        include: {
          customer: { select: { id: true, name: true } },
          lines: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
      });

      await writeAuditLog({
        userId: performedBy,
        module: 'SALES',
        action: 'DELIVER',
        entity: 'SalesOrder',
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
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: { lines: { include: { product: true } } },
    });

    if (!order) {
      throw { status: 404, message: 'Sales order not found.' };
    }

    if (order.status === OrderStatus.FULLY_DELIVERED || order.status === OrderStatus.CANCELLED) {
      throw { status: 400, message: 'Cannot cancel a fully delivered or already cancelled order.' };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Unreserve stock for all lines
      for (const line of order.lines) {
        if (line.reserved) {
          const product = await tx.product.findUnique({ where: { id: line.product_id } });
          if (!product) continue;

          const currentReserved = Number(product.reserved_qty);
          const reservedQty = Number(line.ordered_qty) - Number(line.delivered_qty);
          const newReserved = Math.max(0, currentReserved - reservedQty);

          await tx.product.update({
            where: { id: product.id },
            data: { reserved_qty: new Prisma.Decimal(newReserved) },
          });

          await writeStockLedgerEntry({
            productId: product.id,
            movementType: StockMovement.UNRESERVATION,
            qtyChange: -reservedQty,
            balanceAfter: Number(product.on_hand_qty),
            referenceType: 'SalesOrder',
            referenceId: order.id,
            notes: `Unreserved ${reservedQty} units due to ${order.so_number} cancellation`,
            performedBy,
            tx,
          });
        }
      }

      const updatedOrder = await tx.salesOrder.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
        include: {
          customer: { select: { id: true, name: true } },
          lines: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
      });

      await writeAuditLog({
        userId: performedBy,
        module: 'SALES',
        action: 'CANCEL',
        entity: 'SalesOrder',
        entityId: id,
        oldValue: { status: order.status },
        newValue: { status: 'CANCELLED' },
        ipAddress,
        tx,
      });

      return updatedOrder;
    });

    return result;
  }
}
