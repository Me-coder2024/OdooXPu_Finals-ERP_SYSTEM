import prisma from '../config/database';
import { Prisma } from '@prisma/client';

export class DashboardService {
  /**
   * Dashboard stats — ALL from live DB aggregates, NEVER static JSON
   */
  static async getStats() {
    const [
      totalProducts,
      activeProducts,
      totalSalesOrders,
      soByStatus,
      totalPurchaseOrders,
      poByStatus,
      totalManufacturingOrders,
      moByStatus,
      totalCustomers,
      totalVendors,
      recentSalesOrders,
      recentPurchaseOrders,
      recentStockMovements,
      totalRevenue,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { is_active: true } }),
      prisma.salesOrder.count(),
      prisma.salesOrder.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.purchaseOrder.count(),
      prisma.purchaseOrder.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.manufacturingOrder.count(),
      prisma.manufacturingOrder.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.customer.count(),
      prisma.vendor.count(),
      // FIX: use only `select` (not both include + select)
      prisma.salesOrder.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          so_number: true,
          status: true,
          total_amount: true,
          created_at: true,
          customer: { select: { name: true } },
        },
      }),
      prisma.purchaseOrder.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          po_number: true,
          status: true,
          total_amount: true,
          created_at: true,
          vendor: { select: { name: true } },
        },
      }),
      // FIX: use only `select` instead of `include` with nested select
      prisma.stockLedger.findMany({
        take: 10,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          product_id: true,
          movement_type: true,
          qty_change: true,
          balance_after: true,
          reference_type: true,
          reference_id: true,
          notes: true,
          performed_by: true,
          created_at: true,
          product: { select: { name: true, sku: true } },
          user: { select: { id: true, name: true } },
        },
      }),
      prisma.salesOrder.aggregate({
        where: {
          status: { in: ['CONFIRMED', 'PARTIALLY_DELIVERED', 'FULLY_DELIVERED'] },
        },
        _sum: { total_amount: true },
      }),
    ]);

    // FIX: Query low-stock products using raw SQL comparison (field vs field)
    // Prisma can't compare two columns directly, so we use $queryRaw
    let lowStockProducts: { id: string; name: string; sku: string; on_hand_qty: number; min_stock_qty: number; reserved_qty: number }[] = [];
    try {
      lowStockProducts = await prisma.$queryRaw<
        { id: string; name: string; sku: string; on_hand_qty: number; min_stock_qty: number; reserved_qty: number }[]
      >(
        Prisma.sql`SELECT id, name, sku, on_hand_qty, min_stock_qty, reserved_qty FROM "Product" WHERE is_active = true AND on_hand_qty <= min_stock_qty AND min_stock_qty > 0`
      );
    } catch {
      // Fallback: fetch all active products and filter in JS
      const allProducts = await prisma.product.findMany({
        where: { is_active: true },
        select: { id: true, name: true, sku: true, on_hand_qty: true, min_stock_qty: true, reserved_qty: true },
      });
      lowStockProducts = allProducts.filter((p) => p.on_hand_qty <= p.min_stock_qty && p.min_stock_qty > 0);
    }

    // Format status counts into objects
    const formatStatusCounts = (grouped: { status: string; _count: { id: number } }[]) => {
      const counts: Record<string, number> = {};
      for (const g of grouped) {
        counts[g.status] = g._count.id;
      }
      return counts;
    };

    return {
      overview: {
        totalProducts,
        activeProducts,
        totalCustomers,
        totalVendors,
        totalRevenue: totalRevenue._sum.total_amount ? Number(totalRevenue._sum.total_amount) : 0,
      },
      salesOrders: {
        total: totalSalesOrders,
        byStatus: formatStatusCounts(soByStatus as unknown as { status: string; _count: { id: number } }[]),
      },
      purchaseOrders: {
        total: totalPurchaseOrders,
        byStatus: formatStatusCounts(poByStatus as unknown as { status: string; _count: { id: number } }[]),
      },
      manufacturingOrders: {
        total: totalManufacturingOrders,
        byStatus: formatStatusCounts(moByStatus as unknown as { status: string; _count: { id: number } }[]),
      },
      alerts: {
        lowStockProducts: lowStockProducts.map((p) => ({
          ...p,
          free_to_use_qty: p.on_hand_qty - (p.reserved_qty || 0),
        })),
      },
      recent: {
        salesOrders: recentSalesOrders,
        purchaseOrders: recentPurchaseOrders,
        stockMovements: recentStockMovements,
      },
    };
  }
}
