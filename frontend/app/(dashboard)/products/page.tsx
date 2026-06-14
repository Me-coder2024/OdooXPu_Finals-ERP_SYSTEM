'use client';

import { useEffect, useState, useCallback } from 'react';
import { productsApi } from '@/lib/api/client';
import { Product } from '@/types';
import { Search, Plus, X, ChevronLeft, ChevronRight, LayoutList, LayoutGrid } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsApi.getAll({ page, limit: 50, search: search || undefined });
      setProducts(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalCount(res.data.pagination?.total || 0);
    } catch (err) { console.error('Failed to load products:', err); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(products.map(p => p.id)));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Products</h1>
          <p className="text-sm text-slate-500 mt-1">Manage product catalog, pricing, and inventory</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
            <button className="p-2 rounded-md text-slate-400 hover:text-slate-600" title="Search"><Search size={16} /></button>
            <div className="w-px h-4 bg-slate-300" />
            <button className="p-2 rounded-md bg-white text-blue-700 shadow-sm" title="List"><LayoutList size={16} /></button>
            <button className="p-2 rounded-md text-slate-500 hover:text-slate-700" title="Grid"><LayoutGrid size={16} /></button>
          </div>
          <Link href="/products/new" className="inline-flex items-center gap-2 bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors">
            <Plus size={16} /> New Product
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 mb-4 p-4 flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by name, SKU..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-200 text-slate-400"><X size={13} /></button>}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-6 h-6 border-2 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500 mb-2">{search ? `No products matching "${search}"` : 'No products yet'}</p>
          <Link href="/products/new" className="text-sm text-blue-700 hover:underline">Create your first product →</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-3 px-3 w-10"><input type="checkbox" checked={selectedIds.size === products.length && products.length > 0} onChange={toggleSelectAll} className="rounded border-slate-300" /></th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Reference</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">Product</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Sales Price</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">Cost Price</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">On Hand Qty</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${selectedIds.has(p.id) ? 'bg-blue-50/50' : ''}`}>
                    <td className="py-3 px-3"><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} className="rounded border-slate-300" /></td>
                    <td className="py-3 px-4">
                      <Link href={`/products/${p.id}`} className="font-mono text-sm text-blue-700 hover:underline">{p.sku}</Link>
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-medium">{p.name}</td>
                    <td className="py-3 px-4 text-right text-slate-700 tabular-nums">{formatCurrency(p.sales_price)}</td>
                    <td className="py-3 px-4 text-right text-slate-700 tabular-nums">{formatCurrency(p.cost_price)}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900 tabular-nums">{Number(p.on_hand_qty).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between p-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">Page {page} of {totalPages} ({totalCount} total)</p>
            <div className="flex gap-1.5">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50"><ChevronLeft size={14} /> Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50">Next <ChevronRight size={14} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
