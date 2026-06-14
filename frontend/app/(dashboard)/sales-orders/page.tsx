'use client';

import { useEffect, useState, useCallback } from 'react';
import { salesOrdersApi } from '@/lib/api/client';
import { SalesOrder, OrderStatus } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import {
  Plus,
  Search,
  LayoutList,
  LayoutGrid,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/common/StatusBadge';
import Link from 'next/link';

const STATUS_OPTIONS: (OrderStatus | 'ALL')[] = [
  'ALL', 'DRAFT', 'CONFIRMED', 'PARTIALLY_DELIVERED', 'FULLY_DELIVERED', 'CANCELLED',
];
const KANBAN_COLUMNS: OrderStatus[] = [
  'DRAFT', 'CONFIRMED', 'PARTIALLY_DELIVERED', 'FULLY_DELIVERED',
];
const KANBAN_COLUMN_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  CONFIRMED: 'Confirmed',
  PARTIALLY_DELIVERED: 'Partially Delivered',
  FULLY_DELIVERED: 'Delivered',
};

type ViewMode = 'list' | 'kanban';

export default function SalesOrdersPage() {
  const { user: currentUser } = useAuthStore();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 50 };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await salesOrdersApi.getAll(params as { page: number; limit: number; status?: string });
      setOrders(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalCount(res.data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to load sales orders:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ─── Client-side search filter ───
  const filteredOrders = orders.filter((o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.so_number.toLowerCase().includes(q) ||
      (o.customer?.name || '').toLowerCase().includes(q) ||
      (o.creator?.name || '').toLowerCase().includes(q)
    );
  });

  // ─── Selection handlers ───
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map((o) => o.id)));
    }
  };

  return (
    <div>
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Sales Orders</h1>
          <p className="text-sm text-slate-500 mt-1">Manage customer sales orders and deliveries</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
            {/* Search icon */}
            <button className="p-2 rounded-md text-slate-400 hover:text-slate-600 transition-colors" title="Search">
              <Search size={16} />
            </button>
            <div className="w-px h-4 bg-slate-300" />
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              title="List View"
            >
              <LayoutList size={16} />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              title="Kanban View"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
          <Link
            href="/sales-orders/new"
            className="inline-flex items-center gap-2 bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
          >
            <Plus size={16} /> New Sales Order
          </Link>
        </div>
      </div>

      {/* ═══ Search + Status Filters (List Mode) ═══ */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-slate-200 mb-4 p-4 flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by reference, customer or salesperson..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status filter pills */}
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                onClick={() => { setStatusFilter(status); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status === 'ALL' ? 'All' : status.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Kanban Mode Search ═══ */}
      {viewMode === 'kanban' && (
        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by reference, customer or salesperson..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══ Content ═══ */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-6 h-6 border-2 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading sales orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500 mb-2">
            {search ? `No orders matching "${search}"` : 'No sales orders found'}
          </p>
          <Link href="/sales-orders/new" className="text-sm text-blue-700 hover:underline">
            Create your first order →
          </Link>
        </div>
      ) : viewMode === 'list' ? (
        /* ═══════════ LIST VIEW ═══════════ */
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-3 px-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredOrders.length && filteredOrders.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Reference</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Customer</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Salesperson</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                      selectedIds.has(order.id) ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/sales-orders/${order.id}`}
                        className="font-medium text-blue-700 hover:text-blue-800 hover:underline"
                      >
                        {order.so_number}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(order.order_date)}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{order.customer?.name || '—'}</td>
                    <td className="py-3 px-4 text-slate-500">{order.creator?.name || '—'}</td>
                    <td className="py-3 px-4"><StatusBadge status={order.status} /></td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900 tabular-nums">
                      {formatCurrency(order.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          <div className="flex items-center justify-between p-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              {selectedIds.size > 0
                ? `${selectedIds.size} selected · `
                : ''}
              Page {page} of {totalPages} ({totalCount} total)
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ═══════════ KANBAN VIEW ═══════════ */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((colStatus) => {
            const colOrders = filteredOrders.filter((o) => o.status === colStatus);
            return (
              <div key={colStatus} className="bg-slate-100 rounded-xl p-3 min-h-[300px]">
                {/* Column header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={colStatus} />
                    <span className="text-xs font-medium text-slate-500 tabular-nums">({colOrders.length})</span>
                  </div>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {colOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/sales-orders/${order.id}`}
                      className="block bg-white rounded-lg border border-slate-200 p-3.5 hover:shadow-md hover:border-blue-200 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-blue-700">{order.so_number}</span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          colStatus === 'DRAFT' ? 'bg-slate-100 text-slate-600'
                          : colStatus === 'CONFIRMED' ? 'bg-blue-50 text-blue-700'
                          : colStatus === 'FULLY_DELIVERED' ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                        }`}>
                          {KANBAN_COLUMN_LABELS[colStatus]}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 font-medium">{order.customer?.name || '—'}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-slate-400">{formatDate(order.order_date)}</span>
                        <span className="text-xs font-medium text-slate-900">{formatCurrency(order.total_amount)}</span>
                      </div>
                    </Link>
                  ))}
                  {colOrders.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-400">No orders</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
