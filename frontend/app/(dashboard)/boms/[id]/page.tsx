'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { bomsApi } from '@/lib/api/client';
import { BillOfMaterials } from '@/types';
import { ArrowLeft, Layers, Settings } from 'lucide-react';
import Link from 'next/link';

export default function BoMDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [bom, setBom] = useState<BillOfMaterials | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await bomsApi.getById(params.id as string);
        setBom(res.data.data);
      } catch (err) { console.error('Failed to load BoM:', err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [params.id]);

  if (loading) return <div className="p-8 text-center text-slate-400">Loading BoM...</div>;
  if (!bom) return (
    <div className="p-8 text-center">
      <p className="text-slate-500">Bill of Materials not found</p>
      <Link href="/boms" className="text-blue-700 text-sm mt-2 inline-block">Back to BoMs</Link>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-md transition-colors">
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{bom.bom_reference}</h1>
          <p className="text-sm text-slate-500">{bom.product?.name} · Produces {bom.qty_produced} unit(s)</p>
        </div>
      </div>

      {/* BoM Info */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Product</p>
            <Link href={`/products/${bom.product_id}`} className="text-sm font-medium text-blue-700 hover:text-blue-800">{bom.product?.name}</Link>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Reference</p>
            <p className="text-sm font-medium text-slate-900">{bom.bom_reference}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Qty Produced</p>
            <p className="text-sm font-medium text-slate-900">{bom.qty_produced}</p>
          </div>
          {bom.notes && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Notes</p>
              <p className="text-sm text-slate-600">{bom.notes}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Components */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center gap-2">
            <Layers size={16} className="text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Components ({bom.components?.length || 0})</h2>
          </div>
          {bom.components && bom.components.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Material</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">SKU</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Quantity</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {bom.components.map((comp) => (
                    <tr key={comp.id} className="border-b border-slate-100">
                      <td className="py-3 px-4 text-slate-900 font-medium">{comp.product?.name}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-xs">{comp.product?.sku}</td>
                      <td className="py-3 px-4 text-right text-slate-700">{comp.quantity}</td>
                      <td className="py-3 px-4 text-slate-500">{comp.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 text-sm">No components defined</div>
          )}
        </div>

        {/* Operations */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-4 border-b border-slate-200 flex items-center gap-2">
            <Settings size={16} className="text-violet-600" />
            <h2 className="text-base font-semibold text-slate-900">Operations ({bom.operations?.length || 0})</h2>
          </div>
          {bom.operations && bom.operations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-center py-3 px-3 font-medium text-slate-600">#</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Operation</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Work Center</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {bom.operations.sort((a, b) => a.sequence_order - b.sequence_order).map((op) => (
                    <tr key={op.id} className="border-b border-slate-100">
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex w-6 h-6 items-center justify-center bg-slate-100 rounded-full text-xs font-medium text-slate-600">{op.sequence_order}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-900 font-medium">{op.name}</td>
                      <td className="py-3 px-4 text-slate-700">{op.work_center?.name}</td>
                      <td className="py-3 px-4 text-right text-slate-700">{op.duration_mins} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 text-sm">No operations defined</div>
          )}
        </div>
      </div>
    </div>
  );
}
