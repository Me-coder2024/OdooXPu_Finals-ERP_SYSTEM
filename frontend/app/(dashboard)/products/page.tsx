'use client';

import { useEffect, useState } from 'react';
import { productsApi } from '@/lib/api/client';
import { Product } from '@/types';
import { Search, Plus, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchProducts();
  }, [page]);

  const fetchProducts = async () => {
    try {
      const res = await productsApi.getAll({ page, limit: 20, search: search || undefined });
      setProducts(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Products</h1>
          <p className="text-sm text-slate-500 mt-1">Manage furniture inventory and pricing</p>
        </div>
        <Link
          href="/products/new"
          className="inline-flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-800 transition-colors"
        >
          <Plus size={16} />
          Add Product
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        {/* Search bar */}
        <div className="p-4 border-b border-slate-200">
          <form onSubmit={handleSearch} className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </form>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500 mb-2">No products found</p>
            <Link href="/products/new" className="text-blue-700 text-sm">Create your first product</Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Product</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">SKU</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Sales Price</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Cost Price</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">On Hand</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Reserved</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Free to Use</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600">MTO</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const isLow = product.free_to_use_qty <= product.min_stock_qty;
                    return (
                      <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <Link href={`/products/${product.id}`} className="font-medium text-slate-900 hover:text-blue-700">
                            {product.name}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono text-xs">{product.sku}</td>
                        <td className="py-3 px-4 text-right text-slate-700">{formatCurrency(product.sales_price)}</td>
                        <td className="py-3 px-4 text-right text-slate-500">{formatCurrency(product.cost_price)}</td>
                        <td className="py-3 px-4 text-right text-slate-700">{product.on_hand_qty}</td>
                        <td className="py-3 px-4 text-right text-slate-500">{product.reserved_qty}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`inline-flex items-center gap-1 font-medium ${isLow ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {isLow && <AlertTriangle size={12} />}
                            {product.free_to_use_qty}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {product.procure_on_demand ? (
                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-violet-50 text-violet-700">
                              {product.procurement_type === 'MANUFACTURING' ? 'MTO-Mfg' : 'MTO-Buy'}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">MTS</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-200">
                <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 border border-slate-200 rounded-md text-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 border border-slate-200 rounded-md text-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
