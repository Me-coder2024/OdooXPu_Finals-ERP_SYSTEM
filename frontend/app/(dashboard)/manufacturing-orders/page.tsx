'use client';

export default function ManufacturingOrdersPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Manufacturing Orders</h1>
          <p className="text-sm text-slate-500 mt-1">Track production from BoM to finished goods</p>
        </div>
        <button className="bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-800 transition-colors">
          Create MO
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-8 text-center text-slate-400 text-sm">
          Loading manufacturing orders...
        </div>
      </div>
    </div>
  );
}
