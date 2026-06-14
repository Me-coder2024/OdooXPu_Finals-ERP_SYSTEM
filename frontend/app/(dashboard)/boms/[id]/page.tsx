'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { bomsApi } from '@/lib/api/client';
import { BillOfMaterials } from '@/types';
import { ArrowLeft, Save, FileText, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function BoMDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [bom, setBom] = useState<BillOfMaterials | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [activeTab, setActiveTab] = useState<'components' | 'workorders'>('components');

  const fetchBom = useCallback(async () => {
    try { const res = await bomsApi.getById(params.id as string); setBom(res.data.data); }
    catch (err) { console.error('Failed to load BoM:', err); }
    finally { setLoading(false); }
  }, [params.id]);

  useEffect(() => { fetchBom(); }, [fetchBom]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-blue-600" /><span className="ml-2 text-slate-500 text-sm">Loading...</span></div>;
  if (!bom) return <div className="p-8 text-center"><p className="text-slate-500">BoM not found</p><Link href="/boms" className="text-blue-700 text-sm mt-2 inline-block">Back</Link></div>;

  return (
    <div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Action Bar — Back | Save ... Logs */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button onClick={() => router.push('/boms')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md">
              <ArrowLeft size={15} /> Back
            </button>
            <div className="w-px h-5 bg-slate-300 mx-1" />
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-700 text-white rounded-md hover:bg-blue-800">
              <Save size={14} /> Save
            </button>
          </div>
          <Link href="/audit-logs?module=BOM" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-100">
            <FileText size={14} /> Logs
          </Link>
        </div>

        {message.text && (
          <div className={`mx-6 mt-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{message.text}</div>
        )}

        <div className="p-6">
          {/* BOM Reference */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-slate-900 font-mono tracking-tight">{bom.bom_reference}</h1>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 mb-8">
            <div className="space-y-4">
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Finished Product</label>
                <p className="text-sm text-slate-900 font-medium flex-1 border-b border-slate-200 pb-1">{bom.product?.name || '—'}</p>
              </div>
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Quantity</label>
                <p className="text-sm text-slate-700 flex-1 border-b border-slate-200 pb-1 tabular-nums">{Number(bom.qty_produced)} Units</p>
              </div>
              {bom.notes && (
                <div className="flex items-baseline gap-4">
                  <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Reference</label>
                  <p className="text-sm text-slate-700 flex-1 border-b border-slate-200 pb-1">{bom.notes}</p>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="flex items-baseline gap-4">
                <label className="text-sm font-medium text-slate-600 w-36 shrink-0">Many2One (Product)</label>
                <p className="text-sm text-slate-700 flex-1 border-b border-slate-200 pb-1">{bom.product?.name} ({bom.product?.sku})</p>
              </div>
            </div>
          </div>

          {/* Tabs: Components | Work Orders */}
          <div className="border-b border-slate-200 mb-4">
            <div className="flex gap-6">
              <button onClick={() => setActiveTab('components')} className={`pb-2 text-sm font-semibold ${activeTab === 'components' ? 'text-slate-900 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Components</button>
              <button onClick={() => setActiveTab('workorders')} className={`pb-2 text-sm font-semibold ${activeTab === 'workorders' ? 'text-slate-900 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Work Orders</button>
            </div>
          </div>

          {/* Components Tab */}
          {activeTab === 'components' && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Component</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">To Consume</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600">Units</th>
                  </tr>
                </thead>
                <tbody>
                  {bom.components?.map(comp => (
                    <tr key={comp.id} className="border-b border-slate-100">
                      <td className="py-3 px-4 text-slate-900 font-medium">{comp.product?.name || '—'}</td>
                      <td className="py-3 px-4 text-right tabular-nums">{Number(comp.quantity).toFixed(2)}</td>
                      <td className="py-3 px-4 text-center text-slate-500">{comp.unit || 'Units'}</td>
                    </tr>
                  ))}
                  {(!bom.components || bom.components.length === 0) && (
                    <tr><td colSpan={3} className="py-6 text-center text-slate-400 text-sm">No components added yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Work Orders Tab */}
          {activeTab === 'workorders' && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Operation</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Work Center</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Expected Duration (min)</th>
                  </tr>
                </thead>
                <tbody>
                  {bom.operations?.sort((a, b) => a.sequence_order - b.sequence_order).map(op => (
                    <tr key={op.id} className="border-b border-slate-100">
                      <td className="py-3 px-4 text-slate-900 font-medium">{op.name}</td>
                      <td className="py-3 px-4 text-slate-700">{op.work_center?.name || '—'}</td>
                      <td className="py-3 px-4 text-right tabular-nums">{op.duration_mins}</td>
                    </tr>
                  ))}
                  {(!bom.operations || bom.operations.length === 0) && (
                    <tr><td colSpan={3} className="py-6 text-center text-slate-400 text-sm">No operations defined</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
