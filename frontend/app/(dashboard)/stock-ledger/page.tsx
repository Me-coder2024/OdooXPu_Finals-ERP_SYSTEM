'use client';

import { useEffect, useState } from 'react';
import { stockLedgerApi, productsApi } from '@/lib/api/client';
import { StockLedgerEntry, StockMovement, Product } from '@/types';
import { Filter, ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const MOVEMENT_TYPES: { value: StockMovement | 'ALL'; label: string; color: string }[] = [
  { value: 'ALL', label: 'All', color: '' },
  { value: 'SALE', label: 'Sale', color: 'bg-red-50 text-red-700' },
  { value: 'PURCHASE_RECEIPT', label: 'Purchase Receipt', color: 'bg-emerald-50 text-emerald-700' },
  { value: 'MFG_CONSUMPTION', label: 'Mfg Consumption', color: 'bg-orange-50 text-orange-700' },
  { value: 'MFG_PRODUCTION', label: 'Mfg Production', color: 'bg-blue-50 text-blue-700' },
  { value: 'ADJUSTMENT', label: 'Adjustment', color: 'bg-slate-100 text-slate-700' },
  { value: 'RESERVATION', label: 'Reservation', color: 'bg-violet-50 text-violet-700' },
  { value: 'UNRESERVATION', label: 'Unreservation', color: 'bg-pink-50 text-pink-700' },
];

export default function StockLedgerPage() {
  const [entries, setEntries] = useState<StockLedgerEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [movementFilter, setMovementFilter] = useState<string>('ALL');
  const [productFilter, setProductFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    productsApi.getAll({ limit: 100 }).then((res) => setProducts(res.data.data || [])).catch(() => {});
  }, []);

  useEffect(() => { fetchEntries(); }, [page, movementFilter, productFilter]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 30 };
      if (movementFilter !== 'ALL') params.movement_type = movementFilter;
      if (productFilter) params.product_id = productFilter;
      const res = await stockLedgerApi.getAll(params as { page: number; limit: number; product_id?: string; movement_type?: string });
      setEntries(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) { console.error('Failed to load stock ledger:', err); }
    finally { setLoading(false); }
  };

  const getMovementColor = (type: StockMovement) => {
    return MOVEMENT_TYPES.find((m) => m.value === type)?.color || 'bg-slate-100 text-slate-600';
  };

  const qtyIcon = (change: number) => {
    if (change > 0) return <ArrowUpRight size={14} className="text-emerald-600" />;
    if (change < 0) return <ArrowDownRight size={14} className="text-red-600" />;
    return <Minus size={14} className="text-slate-400" />;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Stock Ledger</h1>
        <p className="text-sm text-slate-500 mt-1">Track all stock movements across products</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        {/* Filters */}
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <span className="text-sm text-slate-500">Movement:</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {MOVEMENT_TYPES.map((mt) => (
                <button key={mt.value} onClick={() => { setMovementFilter(mt.value); setPage(1); }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${movementFilter === mt.value ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {mt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">Product:</span>
            <select value={productFilter} onChange={(e) => { setProductFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 border border-slate-200 rounded-md text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-xs">
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading stock ledger...</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No stock ledger entries found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Product</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Movement</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Qty Change</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Balance After</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Reference</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Notes</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">By</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDate(entry.created_at)}</td>
                      <td className="py-3 px-4 text-slate-900 font-medium">{entry.product?.name}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getMovementColor(entry.movement_type)}`}>
                          {entry.movement_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center gap-1 font-medium ${entry.qty_change > 0 ? 'text-emerald-700' : entry.qty_change < 0 ? 'text-red-700' : 'text-slate-500'}`}>
                          {qtyIcon(entry.qty_change)}
                          {entry.qty_change > 0 ? '+' : ''}{entry.qty_change}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">{entry.balance_after}</td>
                      <td className="py-3 px-4 text-xs text-slate-500 font-mono">{entry.reference_type}</td>
                      <td className="py-3 px-4 text-xs text-slate-500 max-w-48 truncate">{entry.notes || '—'}</td>
                      <td className="py-3 px-4 text-slate-500">{entry.user?.name || '—'}</td>
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
