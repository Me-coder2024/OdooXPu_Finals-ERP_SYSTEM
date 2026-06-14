'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { salesOrdersApi, productsApi, customersApi, usersApi } from '@/lib/api/client';
import { Product, Customer, User } from '@/types';
import { ArrowLeft, Plus, Trash2, Loader2, AlertTriangle, Check, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

interface OrderLine {
  product_id: string;
  ordered_qty: number;
  unit_price: number;
}

export default function NewSalesOrderPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [orderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [notes, setNotes] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [lines, setLines] = useState<OrderLine[]>([{ product_id: '', ordered_qty: 1, unit_price: 0 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    productsApi.getAll({ limit: 200 }).then(res => setProducts(res.data.data || [])).catch(() => {});
    customersApi.getAll({ limit: 200 }).then(res => setCustomers(res.data.data || [])).catch(() => {});
    usersApi.getAll({ limit: 100 }).then(res => setUsers(res.data.data || [])).catch(() => {});
  }, []);

  // Auto-fill customer address when customer selected
  const selectedCustomer = customers.find(c => c.id === customerId);
  useEffect(() => {
    if (selectedCustomer?.address) setCustomerAddress(selectedCustomer.address);
    else setCustomerAddress('');
  }, [customerId, selectedCustomer]);

  const addLine = () => setLines([...lines, { product_id: '', ordered_qty: 1, unit_price: 0 }]);
  const removeLine = (idx: number) => { if (lines.length > 1) setLines(lines.filter((_, i) => i !== idx)); };

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
      if (validLines.length === 0) { setError('Add at least one order line'); setLoading(false); return; }
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
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* ── Action Bar — Back | Logs ── */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button onClick={() => router.push('/sales-orders')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
              <ArrowLeft size={15} /> Back
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              Status: Draft
            </span>
            <Link href="/audit-logs?module=SALES" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors">
              <FileText size={14} /> Logs
            </Link>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">⚠ {error}</div>
        )}

        {/* ═══ Form ═══ */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* SO Number (auto) */}
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-300 font-mono tracking-tight">SO-XXXXX</h1>
            <p className="text-xs text-slate-400 italic mt-0.5">Auto-generated on save</p>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 mb-8">
            {/* Left column */}
            <div className="space-y-4">
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Customer *</label>
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required
                  className="flex-1 px-3 py-2 border-b border-slate-300 bg-transparent text-sm focus:outline-none focus:border-blue-500 transition-colors">
                  <option value="">Select customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Customer Address</label>
                <input type="text" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} maxLength={200}
                  className="flex-1 px-3 py-2 border-b border-slate-300 bg-transparent text-sm focus:outline-none focus:border-blue-500 transition-colors" placeholder="Auto-filled from customer" />
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Creation Date</label>
                <p className="flex-1 text-sm text-slate-700 border-b border-slate-200 pb-2 bg-slate-50 px-3 py-1.5 rounded">
                  {new Date(orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Sales Person</label>
                <select className="flex-1 px-3 py-2 border-b border-slate-300 bg-transparent text-sm focus:outline-none focus:border-blue-500 transition-colors" disabled>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Expected Delivery</label>
                <input type="date" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)}
                  className="flex-1 px-3 py-2 border-b border-slate-300 bg-transparent text-sm focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
            </div>
          </div>

          {/* ═══ Order Lines Table ═══ */}
          <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600 w-[35%]">Products</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600 w-24">Ordered Qty</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600 w-28">Sales Price</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600 w-28">Total</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600 w-28">Availability</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => {
                  const product = products.find(p => p.id === line.product_id);
                  const freeQty = product ? (product.free_to_use_qty ?? (Number(product.on_hand_qty) - Number(product.reserved_qty))) : 0;
                  const isAvailable = !line.product_id || line.ordered_qty <= freeQty;
                  return (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-2 px-4">
                        <select value={line.product_id} onChange={(e) => updateLine(idx, 'product_id', e.target.value)}
                          className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                          <option value="">Select product</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                        </select>
                      </td>
                      <td className="py-2 px-4">
                        <input type="number" min="1" value={line.ordered_qty} onChange={(e) => updateLine(idx, 'ordered_qty', e.target.value)}
                          className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm text-right bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                      </td>
                      <td className="py-2 px-4">
                        <input type="number" min="0" step="0.01" value={line.unit_price} onChange={(e) => updateLine(idx, 'unit_price', e.target.value)}
                          className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm text-right bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                      </td>
                      <td className="py-2 px-4 text-right font-medium text-slate-900 tabular-nums">
                        {formatCurrency(line.ordered_qty * line.unit_price)}
                      </td>
                      <td className="py-2 px-4 text-center">
                        {line.product_id ? (
                          isAvailable ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                              <Check size={12} /> OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700" title={`Free qty: ${freeQty}`}>
                              <AlertTriangle size={12} /> Low
                            </span>
                          )
                        ) : <span className="text-xs text-slate-300">—</span>}
                      </td>
                      <td className="py-2 px-4">
                        <button type="button" onClick={() => removeLine(idx)} disabled={lines.length === 1}
                          className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 transition-colors rounded hover:bg-red-50">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td colSpan={6} className="py-2 px-4">
                    <button type="button" onClick={addLine} className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 transition-colors">
                      <Plus size={14} /> Add a product
                    </button>
                  </td>
                </tr>
                <tr className="border-t-2 border-slate-200 bg-slate-50/70">
                  <td colSpan={3} className="py-3 px-4 text-right font-semibold text-slate-700">Total</td>
                  <td className="py-3 px-4 text-right font-bold text-lg text-slate-900 tabular-nums">{formatCurrency(total)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          <div className="flex items-baseline gap-4 mb-6">
            <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Notes</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add a note..."
              className="flex-1 px-3 py-2 border-b border-slate-300 bg-transparent text-sm focus:outline-none focus:border-blue-500 transition-colors" />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => router.push('/sales-orders')} className="px-5 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-5 py-2 bg-blue-700 text-white rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? 'Creating...' : 'Create Sales Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
