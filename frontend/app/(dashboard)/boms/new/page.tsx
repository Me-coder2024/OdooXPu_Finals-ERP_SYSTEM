'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { bomsApi, productsApi, workCentersApi } from '@/lib/api/client';
import { Product } from '@/types';
import { ArrowLeft, Plus, Trash2, Loader2, FileText } from 'lucide-react';
import Link from 'next/link';

interface ComponentLine {
  product_id: string;
  quantity: number;
  unit: string;
}

interface OperationLine {
  work_center_id: string;
  name: string;
  duration_mins: number;
  sequence_order: number;
}

export default function NewBomPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [workCenters, setWorkCenters] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    product_id: '',
    bom_reference: '',
    qty_produced: '1',
    notes: '',
  });

  const [components, setComponents] = useState<ComponentLine[]>([
    { product_id: '', quantity: 1, unit: 'pcs' },
  ]);

  const [operations, setOperations] = useState<OperationLine[]>([]);
  const [showOperations, setShowOperations] = useState(false);

  useEffect(() => {
    productsApi.getAll({ limit: 200 }).then(r => setProducts(r.data.data || [])).catch(() => {});
    workCentersApi.getAll().then(r => setWorkCenters(r.data.data || r.data || [])).catch(() => {});
  }, []);

  // Auto-generate BOM reference when product is selected
  const handleProductChange = (productId: string) => {
    setForm(prev => ({ ...prev, product_id: productId }));
    if (productId) {
      const product = products.find(p => p.id === productId);
      if (product && !form.bom_reference) {
        const ref = `BOM-${product.sku || product.name.substring(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
        setForm(prev => ({ ...prev, bom_reference: ref }));
      }
    }
  };

  // ── Component lines ──
  const addComponent = () => setComponents(prev => [...prev, { product_id: '', quantity: 1, unit: 'pcs' }]);
  const removeComponent = (idx: number) => setComponents(prev => prev.filter((_, i) => i !== idx));
  const updateComponent = (idx: number, field: keyof ComponentLine, value: string | number) => {
    setComponents(prev => {
      const updated = [...prev];
      if (field === 'quantity') updated[idx].quantity = Number(value);
      else if (field === 'product_id') updated[idx].product_id = value as string;
      else if (field === 'unit') updated[idx].unit = value as string;
      return updated;
    });
  };

  // ── Operation lines ──
  const addOperation = () => setOperations(prev => [...prev, { work_center_id: '', name: '', duration_mins: 0, sequence_order: prev.length + 1 }]);
  const removeOperation = (idx: number) => setOperations(prev => prev.filter((_, i) => i !== idx));
  const updateOperation = (idx: number, field: keyof OperationLine, value: string | number) => {
    setOperations(prev => {
      const updated = [...prev];
      if (field === 'duration_mins' || field === 'sequence_order') updated[idx][field] = Number(value);
      else if (field === 'work_center_id') updated[idx].work_center_id = value as string;
      else if (field === 'name') updated[idx].name = value as string;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validComponents = components.filter(c => c.product_id && c.quantity > 0);
    if (validComponents.length === 0) {
      setError('Add at least one component');
      return;
    }

    // Can't use same product as component
    const selfRef = validComponents.find(c => c.product_id === form.product_id);
    if (selfRef) {
      setError('A product cannot be a component of itself');
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        product_id: form.product_id,
        bom_reference: form.bom_reference,
        qty_produced: Number(form.qty_produced),
        notes: form.notes || undefined,
        components: validComponents,
      };

      if (showOperations && operations.length > 0) {
        const validOps = operations.filter(op => op.work_center_id && op.name);
        if (validOps.length > 0) payload.operations = validOps;
      }

      await bomsApi.create(payload);
      router.push('/boms');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { errors?: { message: string }[] } } })?.response?.data?.errors?.[0]?.message;
      setError(msg || 'Failed to create Bill of Materials');
    } finally {
      setLoading(false);
    }
  };

  // Products not already selected as components (to avoid duplicates)
  const availableComponentProducts = (currentId: string) =>
    products.filter(p => p.id !== form.product_id && (p.id === currentId || !components.some(c => c.product_id === p.id)));

  return (
    <div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* ── Action Bar ── */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button onClick={() => router.push('/boms')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
              <ArrowLeft size={15} /> Back
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              Status: Draft
            </span>
            <Link href="/audit-logs?module=BOM" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors">
              <FileText size={14} /> Logs
            </Link>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">⚠ {error}</div>
        )}

        <form onSubmit={handleSubmit} className="p-6">
          {/* ── Header ── */}
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-300 font-mono tracking-tight">BOM-XXXXX</h1>
            <p className="text-sm text-slate-500 mt-1">New Bill of Materials</p>
          </div>

          {/* ── Basic Details ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Finished Product *</label>
              <select value={form.product_id} onChange={(e) => handleProductChange(e.target.value)} required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select finished product</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">BoM Reference *</label>
              <input type="text" value={form.bom_reference} onChange={(e) => setForm({ ...form, bom_reference: e.target.value })} required
                placeholder="e.g. BOM-DT-001"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Quantity Produced</label>
              <input type="number" min="1" step="0.01" value={form.qty_produced} onChange={(e) => setForm({ ...form, qty_produced: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-[11px] text-slate-400 mt-1">Units produced per BoM execution</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
              <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* ── Components Table ── */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Components *</h2>
              <button type="button" onClick={addComponent} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-100 transition-colors">
                <Plus size={13} /> Add Component
              </button>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase">#</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase">Product</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase w-28">Quantity</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase w-24">Unit</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {components.map((comp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{idx + 1}</td>
                      <td className="px-4 py-2.5">
                        <select value={comp.product_id} onChange={(e) => updateComponent(idx, 'product_id', e.target.value)} required
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                          <option value="">Select product</option>
                          {availableComponentProducts(comp.product_id).map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2.5">
                        <input type="number" min="0.01" step="0.01" value={comp.quantity} onChange={(e) => updateComponent(idx, 'quantity', e.target.value)} required
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 tabular-nums" />
                      </td>
                      <td className="px-4 py-2.5">
                        <select value={comp.unit} onChange={(e) => updateComponent(idx, 'unit', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                          <option value="pcs">pcs</option>
                          <option value="kg">kg</option>
                          <option value="m">m</option>
                          <option value="litre">litre</option>
                          <option value="set">set</option>
                        </select>
                      </td>
                      <td className="px-4 py-2.5">
                        {components.length > 1 && (
                          <button type="button" onClick={() => removeComponent(idx)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Operations (Optional) ── */}
          <div className="mb-8">
            {!showOperations ? (
              <button type="button" onClick={() => { setShowOperations(true); if (operations.length === 0) addOperation(); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-slate-300 text-slate-500 rounded-md text-xs font-medium hover:border-slate-400 hover:text-slate-700 transition-colors">
                <Plus size={13} /> Add Work Order Operations (Optional)
              </button>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-slate-900">Work Order Operations</h2>
                  <div className="flex gap-2">
                    <button type="button" onClick={addOperation} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-md text-xs font-medium hover:bg-violet-100 transition-colors">
                      <Plus size={13} /> Add Operation
                    </button>
                    <button type="button" onClick={() => { setShowOperations(false); setOperations([]); }} className="text-xs text-slate-400 hover:text-slate-600">Remove All</button>
                  </div>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase">Seq</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase">Work Center</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase">Operation Name</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase w-28">Duration (min)</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {operations.map((op, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5">
                            <input type="number" min="1" value={op.sequence_order} onChange={(e) => updateOperation(idx, 'sequence_order', e.target.value)}
                              className="w-14 px-2 py-1.5 border border-slate-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 tabular-nums" />
                          </td>
                          <td className="px-4 py-2.5">
                            <select value={op.work_center_id} onChange={(e) => updateOperation(idx, 'work_center_id', e.target.value)} required
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                              <option value="">Select work center</option>
                              {workCenters.map(wc => <option key={wc.id} value={wc.id}>{wc.name}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-2.5">
                            <input type="text" value={op.name} onChange={(e) => updateOperation(idx, 'name', e.target.value)} required placeholder="e.g. Cutting, Assembly"
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </td>
                          <td className="px-4 py-2.5">
                            <input type="number" min="0" value={op.duration_mins} onChange={(e) => updateOperation(idx, 'duration_mins', e.target.value)} required
                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 tabular-nums" />
                          </td>
                          <td className="px-4 py-2.5">
                            <button type="button" onClick={() => removeOperation(idx)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* ── Submit ── */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => router.back()} className="px-6 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading || !form.product_id || !form.bom_reference}
              className="px-6 py-2.5 bg-blue-700 text-white rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 transition-colors inline-flex items-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? 'Creating...' : 'Create Bill of Materials'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
