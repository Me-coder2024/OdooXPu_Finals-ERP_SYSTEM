'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { salesOrdersApi, productsApi } from '@/lib/api/client';
import { Product } from '@/types';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface OrderLine {
  product_id: string;
  ordered_qty: number;
  unit_price: number;
}

export default function NewSalesOrderPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<OrderLine[]>([{ product_id: '', ordered_qty: 1, unit_price: 0 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    productsApi.getAll({ limit: 100 }).then(res => setProducts(res.data.data || [])).catch(() => {});
    // Fetch customers
    import('@/lib/api/client').then(({ apiClient }) => {
      apiClient.get('/customers', { params: { limit: 100 } })
        .then(res => setCustomers(res.data.data || []))
        .catch(() => {});
    });
  }, []);

  const addLine = () => setLines([...lines, { product_id: '', ordered_qty: 1, unit_price: 0 }]);

  const removeLine = (idx: number) => {
    if (lines.length > 1) setLines(lines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: keyof OrderLine, value: string | number) => {
    const updated = [...lines];
    if (field === 'product_id') {
      updated[idx].product_id = value as string;
      const product = products.find(p => p.id === value);
      if (product) updated[idx].unit_price = Number(product.sales_price);
    } else if (field === 'ordered_qty') {
      updated[idx].ordered_qty = Number(value);
    } else if (field === 'unit_price') {
      updated[idx].unit_price = Number(value);
    }
    setLines(updated);
  };

  const total = lines.reduce((sum, l) => sum + l.ordered_qty * l.unit_price, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const validLines = lines.filter(l => l.product_id && l.ordered_qty > 0);
      if (validLines.length === 0) {
        setError('Add at least one order line');
        setLoading(false);
        return;
      }

      await salesOrdersApi.create({
        customer_id: customerId,
        order_date: orderDate,
        expected_delivery: expectedDelivery || undefined,
        notes: notes || undefined,
        lines: validLines,
      });

      router.push('/sales-orders');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { errors?: { message: string }[] } } })?.response?.data?.errors?.[0]?.message;
      setError(msg || 'Failed to create sales order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-md transition-colors">
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">New Sales Order</h1>
          <p className="text-sm text-slate-500">Create a new sales order for a customer</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">⚠ {error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Order Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Customer *</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Order Date *</label>
              <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Expected Delivery</label>
              <input type="date" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Order Lines */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">Order Lines</h2>
            <button type="button" onClick={addLine} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors">
              <Plus size={14} /> Add Line
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-medium text-slate-600 w-1/3">Product</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-600 w-24">Qty</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-600 w-32">Unit Price</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-600 w-32">Subtotal</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="py-2 px-3">
                      <select value={line.product_id} onChange={(e) => updateLine(idx, 'product_id', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Select product</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <input type="number" min="1" value={line.ordered_qty} onChange={(e) => updateLine(idx, 'ordered_qty', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-right bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </td>
                    <td className="py-2 px-3">
                      <input type="number" min="0" step="0.01" value={line.unit_price} onChange={(e) => updateLine(idx, 'unit_price', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-right bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-slate-900">
                      {formatCurrency(line.ordered_qty * line.unit_price)}
                    </td>
                    <td className="py-2 px-3">
                      <button type="button" onClick={() => removeLine(idx)} disabled={lines.length === 1}
                        className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td colSpan={3} className="py-3 px-3 text-right font-semibold text-slate-700">Total Amount</td>
                  <td className="py-3 px-3 text-right font-bold text-lg text-slate-900">{formatCurrency(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="px-6 py-2.5 bg-blue-700 text-white rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors">
            {loading ? 'Creating...' : 'Create Sales Order'}
          </button>
        </div>
      </form>
    </div>
  );
}
