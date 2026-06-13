'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { productsApi } from '@/lib/api/client';
import { Product } from '@/types';
import { ArrowLeft, Package, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await productsApi.getById(params.id as string);
        setProduct(res.data.data);
      } catch (err) {
        console.error('Failed to load product:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [params.id]);

  if (loading) return <div className="p-8 text-center text-slate-400">Loading product...</div>;
  if (!product) return (
    <div className="p-8 text-center">
      <p className="text-slate-500">Product not found</p>
      <Link href="/products" className="text-blue-700 text-sm mt-2 inline-block">Back to Products</Link>
    </div>
  );

  const isLow = product.free_to_use_qty <= product.min_stock_qty;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-md transition-colors">
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{product.name}</h1>
          <p className="text-sm text-slate-500 font-mono">{product.sku}</p>
        </div>
        <span className={`inline-flex px-2.5 py-1 rounded text-xs font-medium ${product.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {product.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pricing */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Pricing</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Sales Price</span>
              <span className="text-sm font-medium text-slate-900">{formatCurrency(product.sales_price)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Cost Price</span>
              <span className="text-sm font-medium text-slate-900">{formatCurrency(product.cost_price)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3">
              <span className="text-sm text-slate-500">Margin</span>
              <span className="text-sm font-medium text-emerald-700">
                {formatCurrency(product.sales_price - product.cost_price)} ({((product.sales_price - product.cost_price) / product.sales_price * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Stock */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Stock Levels</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">On Hand</span>
              <span className="text-sm font-medium text-slate-900">{product.on_hand_qty}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Reserved</span>
              <span className="text-sm font-medium text-slate-700">{product.reserved_qty}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3">
              <span className="text-sm text-slate-500">Free to Use</span>
              <span className={`text-sm font-semibold inline-flex items-center gap-1 ${isLow ? 'text-amber-700' : 'text-emerald-700'}`}>
                {isLow && <AlertTriangle size={14} />}
                {product.free_to_use_qty}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Min Stock Level</span>
              <span className="text-sm text-slate-500">{product.min_stock_qty}</span>
            </div>
          </div>
        </div>

        {/* Procurement */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Procurement</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Strategy</span>
              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${product.procure_on_demand ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
                {product.procure_on_demand ? 'Make-to-Order' : 'Make-to-Stock'}
              </span>
            </div>
            {product.procure_on_demand && product.procurement_type && (
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Procurement Type</span>
                <span className="text-sm font-medium text-slate-900">{product.procurement_type}</span>
              </div>
            )}
            {product.vendor && (
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Preferred Vendor</span>
                <span className="text-sm font-medium text-slate-900">{product.vendor.name}</span>
              </div>
            )}
            {product.bom && (
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Bill of Materials</span>
                <Link href={`/boms/${product.bom_id}`} className="text-sm font-medium text-blue-700 hover:text-blue-800">
                  {product.bom.bom_reference}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
