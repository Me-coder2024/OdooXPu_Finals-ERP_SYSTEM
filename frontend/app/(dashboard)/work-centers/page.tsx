'use client';

export default function WorkCentersPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Work Centers</h1>
          <p className="text-sm text-slate-500 mt-1">Manage manufacturing work centers</p>
        </div>
        <button className="bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-800 transition-colors">
          Add Work Center
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-8 text-center text-slate-400 text-sm">
          Loading work centers...
        </div>
      </div>
    </div>
  );
}
