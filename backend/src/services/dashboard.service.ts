import prisma from '../config/database';

export class DashboardService {
  /**
   * Dashboard stats — ALL from live DB aggregates, NEVER static JSON
   */
  static async getStats() {
    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
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
      prisma.product.findMany({
        where: {
          is_active: true,
          on_hand_qty: { lte: prisma.product.fields.min_stock_qty },
        },
        select: { id: true, name: true, sku: true, on_hand_qty: true, min_stock_qty: true },
      }),
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
      prisma.salesOrder.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        include: {
          customer: { select: { name: true } },
        },
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
      prisma.stockLedger.findMany({
        take: 10,
        orderBy: { created_at: 'desc' },
        include: {
          product: { select: { name: true, sku: true } },
        },
      }),
      prisma.salesOrder.aggregate({
        where: {
          status: { in: ['CONFIRMED', 'PARTIALLY_DELIVERED', 'FULLY_DELIVERED'] },
        },
        _sum: { total_amount: true },
      }),
    ]);

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
        lowStockProducts,
      },
      recent: {
        salesOrders: recentSalesOrders,
        purchaseOrders: recentPurchaseOrders,
        stockMovements: recentStockMovements,
      },
    };
  }
}
