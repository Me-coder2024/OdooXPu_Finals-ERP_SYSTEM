'use client';

import { useEffect, useState } from 'react';
import { purchaseOrdersApi } from '@/lib/api/client';
import { PurchaseOrder, OrderStatus } from '@/types';
import { Plus, Filter, Zap } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/common/StatusBadge';
import Link from 'next/link';

const STATUS_OPTIONS: (OrderStatus | 'ALL')[] = ['ALL', 'DRAFT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CANCELLED'];

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 20 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await purchaseOrdersApi.getAll(params as { page: number; limit: number; status?: string });
      setOrders(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load purchase orders:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Purchase Orders</h1>
          <p className="text-sm text-slate-500 mt-1">Manage vendor purchase orders and receipts</p>
        </div>
        <Link href="/purchase-orders/new" className="inline-flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-800 transition-colors">
          <Plus size={16} /> Create Purchase Order
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <span className="text-sm text-slate-500">Status:</span>
          </div>
          <div className="flex gap-1">
            {STATUS_OPTIONS.map((status) => (
              <button key={status} onClick={() => { setStatusFilter(status); setPage(1); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === status ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {status === 'ALL' ? 'All' : status.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading purchase orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No purchase orders found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">PO Number</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Vendor</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Total</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <Link href={`/purchase-orders/${order.id}`} className="font-medium text-blue-700 hover:text-blue-800">
                          {order.po_number}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{order.vendor?.name || '—'}</td>
                      <td className="py-3 px-4 text-slate-500">{formatDate(order.order_date)}</td>
                      <td className="py-3 px-4"><StatusBadge status={order.status} /></td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900">{formatCurrency(order.total_amount)}</td>
                      <td className="py-3 px-4 text-center">
                        {order.auto_generated ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
                            <Zap size={10} /> MTO Auto
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Manual</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-200">
                <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-slate-200 rounded-md text-sm hover:bg-slate-50 disabled:opacity-50">Previous</button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 border border-slate-200 rounded-md text-sm hover:bg-slate-50 disabled:opacity-50">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
