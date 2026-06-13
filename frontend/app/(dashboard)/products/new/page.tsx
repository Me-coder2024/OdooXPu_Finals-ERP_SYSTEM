'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { productsApi, apiClient } from '@/lib/api/client';
import { ArrowLeft } from 'lucide-react';

export default function NewProductPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '', sku: '', sales_price: '', cost_price: '',
    on_hand_qty: '0', min_stock_qty: '0',
    procure_on_demand: false, procurement_type: 'PURCHASE' as string,
    preferred_vendor_id: '',
  });

  useEffect(() => {
    apiClient.get('/vendors', { params: { limit: 100 } }).then(res => setVendors(res.data.data || [])).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await productsApi.create({
        name: form.name, sku: form.sku,
        sales_price: Number(form.sales_price), cost_price: Number(form.cost_price),
        on_hand_qty: Number(form.on_hand_qty), min_stock_qty: Number(form.min_stock_qty),
        procure_on_demand: form.procure_on_demand,
        procurement_type: form.procure_on_demand ? form.procurement_type : undefined,
        preferred_vendor_id: form.preferred_vendor_id || undefined,
      });
      router.push('/products');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { errors?: { message: string }[] } } })?.response?.data?.errors?.[0]?.message;
      setError(msg || 'Failed to create product');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-md transition-colors">
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">New Product</h1>
          <p className="text-sm text-slate-500">Add a new product to the inventory</p>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-700">⚠ {error}</p></div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Product Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Dining Table Premium"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">SKU *</label>
              <input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required placeholder="e.g. DT-PRE-001"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sales Price (₹) *</label>
              <input type="number" min="0" step="0.01" value={form.sales_price} onChange={(e) => setForm({ ...form, sales_price: e.target.value })} required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Cost Price (₹) *</label>
              <input type="number" min="0" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Stock & Procurement</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Opening Stock</label>
              <input type="number" min="0" value={form.on_hand_qty} onChange={(e) => setForm({ ...form, on_hand_qty: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Min Stock Level</label>
              <input type="number" min="0" value={form.min_stock_qty} onChange={(e) => setForm({ ...form, min_stock_qty: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Preferred Vendor</label>
              <select value={form.preferred_vendor_id} onChange={(e) => setForm({ ...form, preferred_vendor_id: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">None</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.procure_on_demand} onChange={(e) => setForm({ ...form, procure_on_demand: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
              <div>
                <span className="text-sm font-medium text-slate-700">Enable Make-to-Order (MTO)</span>
                <p className="text-xs text-slate-500 mt-0.5">Auto-trigger procurement when stock is insufficient on SO confirmation</p>
              </div>
            </label>
            {form.procure_on_demand && (
              <div className="mt-3 ml-7">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Procurement Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="proc_type" value="PURCHASE" checked={form.procurement_type === 'PURCHASE'}
                      onChange={(e) => setForm({ ...form, procurement_type: e.target.value })}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500" />
                    <span className="text-sm text-slate-700">Buy (Purchase Order)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="proc_type" value="MANUFACTURING" checked={form.procurement_type === 'MANUFACTURING'}
                      onChange={(e) => setForm({ ...form, procurement_type: e.target.value })}
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500" />
                    <span className="text-sm text-slate-700">Manufacture (MO)</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
          <button type="submit" disabled={loading} className="px-6 py-2.5 bg-blue-700 text-white rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors">
            {loading ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
