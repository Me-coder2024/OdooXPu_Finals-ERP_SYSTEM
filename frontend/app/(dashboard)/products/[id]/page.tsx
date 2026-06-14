'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { productsApi, vendorsApi, bomsApi } from '@/lib/api/client';
import { Product, Vendor, BillOfMaterials } from '@/types';
import { ArrowLeft, Save, FileText, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [boms, setBoms] = useState<BillOfMaterials[]>([]);

  // Editable fields
  const [name, setName] = useState('');
  const [salesPrice, setSalesPrice] = useState(0);
  const [costPrice, setCostPrice] = useState(0);
  const [minStockQty, setMinStockQty] = useState(0);
  const [procureOnDemand, setProcureOnDemand] = useState(false);
  const [procurementType, setProcurementType] = useState('');
  const [preferredVendorId, setPreferredVendorId] = useState('');
  const [bomId, setBomId] = useState('');

  const fetchProduct = useCallback(async () => {
    try {
      const res = await productsApi.getById(params.id as string);
      const p = res.data.data;
      setProduct(p);
      setName(p.name);
      setSalesPrice(Number(p.sales_price));
      setCostPrice(Number(p.cost_price));
      setMinStockQty(Number(p.min_stock_qty));
      setProcureOnDemand(p.procure_on_demand);
      setProcurementType(p.procurement_type || '');
      setPreferredVendorId(p.preferred_vendor_id || '');
      setBomId(p.bom_id || '');
    } catch (err) { console.error('Failed to load product:', err); }
    finally { setLoading(false); }
  }, [params.id]);

  useEffect(() => {
    fetchProduct();
    vendorsApi.getAll({ limit: 200 }).then(r => setVendors(r.data.data || [])).catch(() => {});
    bomsApi.getAll({ limit: 200 }).then(r => setBoms(r.data.data || [])).catch(() => {});
  }, [fetchProduct]);

  const handleSave = async () => {
    setSaving(true); setMessage({ text: '', type: '' });
    try {
      await productsApi.update(params.id as string, {
        name, sales_price: salesPrice, cost_price: costPrice, min_stock_qty: minStockQty,
        procure_on_demand: procureOnDemand, procurement_type: procurementType || undefined,
        preferred_vendor_id: preferredVendorId || undefined, bom_id: bomId || undefined,
      });
      setMessage({ text: 'Product saved successfully.', type: 'success' });
      await fetchProduct();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { errors?: { message: string }[] } } })?.response?.data?.errors?.[0]?.message;
      setMessage({ text: msg || 'Failed to save', type: 'error' });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-blue-600" /><span className="ml-2 text-slate-500 text-sm">Loading...</span></div>;
  if (!product) return <div className="p-8 text-center"><p className="text-slate-500">Product not found</p><Link href="/products" className="text-blue-700 text-sm mt-2 inline-block">Back</Link></div>;

  const freeToUse = Number(product.on_hand_qty) - Number(product.reserved_qty);

  return (
    <div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Action Bar — Back | Save ... Logs */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button onClick={() => router.push('/products')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
              <ArrowLeft size={15} /> Back
            </button>
            <div className="w-px h-5 bg-slate-300 mx-1" />
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-700 text-white rounded-md hover:bg-blue-800 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
            </button>
          </div>
          <Link href="/audit-logs?module=PRODUCTS" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors">
            <FileText size={14} /> Logs
          </Link>
        </div>

        {message.text && (
          <div className={`mx-6 mt-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{message.text}</div>
        )}

        <div className="p-6">
          {/* SKU */}
          <div className="mb-6">
            <span className="text-xs text-slate-400 font-mono">{product.sku}</span>
          </div>

          {/* Form Fields — matches wireframe layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-5">
            {/* Left column */}
            <div className="space-y-5">
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Product</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  className="flex-1 px-3 py-2 border-b border-slate-300 bg-transparent text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Sales Price</label>
                <div className="flex-1 flex items-center gap-1 border-b border-slate-300 pb-1">
                  <span className="text-sm text-slate-400">₹</span>
                  <input type="number" min="0" step="0.01" value={salesPrice} onChange={e => setSalesPrice(Number(e.target.value))}
                    className="flex-1 px-2 py-1 bg-transparent text-sm text-slate-900 focus:outline-none tabular-nums" />
                </div>
              </div>
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Cost Price</label>
                <div className="flex-1 flex items-center gap-1 border-b border-slate-300 pb-1">
                  <span className="text-sm text-slate-400">₹</span>
                  <input type="number" min="0" step="0.01" value={costPrice} onChange={e => setCostPrice(Number(e.target.value))}
                    className="flex-1 px-2 py-1 bg-transparent text-sm text-slate-900 focus:outline-none tabular-nums" />
                </div>
              </div>
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">On Hand Qty</label>
                <p className="flex-1 text-sm text-slate-900 font-medium border-b border-slate-200 pb-1 tabular-nums">{Number(product.on_hand_qty).toFixed(2)}</p>
              </div>
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Free to Use Qty</label>
                <p className="flex-1 text-sm text-slate-900 font-medium border-b border-slate-200 pb-1 tabular-nums">{freeToUse.toFixed(2)}</p>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Procure on Demand</label>
                <div className="flex items-center gap-3 flex-1">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={procureOnDemand} onChange={e => setProcureOnDemand(e.target.checked)} className="sr-only peer" />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                  {procureOnDemand && (
                    <select value={procurementType} onChange={e => setProcurementType(e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                      <option value="">Type</option>
                      <option value="PURCHASE">Purchase</option>
                      <option value="MANUFACTURING">Manufacturing</option>
                    </select>
                  )}
                </div>
              </div>
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Vendor / BoM</label>
                <div className="flex-1 space-y-2">
                  <select value={preferredVendorId} onChange={e => setPreferredVendorId(e.target.value)}
                    className="w-full px-3 py-2 border-b border-slate-300 bg-transparent text-sm focus:outline-none focus:border-blue-500">
                    <option value="">No preferred vendor</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                  <select value={bomId} onChange={e => setBomId(e.target.value)}
                    className="w-full px-3 py-2 border-b border-slate-300 bg-transparent text-sm focus:outline-none focus:border-blue-500">
                    <option value="">No BoM linked</option>
                    {boms.map(b => <option key={b.id} value={b.id}>{b.bom_reference} — {b.product?.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Min Stock Qty</label>
                <input type="number" min="0" value={minStockQty} onChange={e => setMinStockQty(Number(e.target.value))}
                  className="flex-1 px-3 py-2 border-b border-slate-300 bg-transparent text-sm focus:outline-none focus:border-blue-500 tabular-nums" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
