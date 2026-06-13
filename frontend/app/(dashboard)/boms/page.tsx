'use client';

export default function BoMsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Bills of Materials</h1>
          <p className="text-sm text-slate-500 mt-1">Manage product BoMs, components, and operations</p>
        </div>
        <button className="bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-800 transition-colors">
          Create BoM
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <input
            type="text"
            placeholder="Search BoMs..."
            className="w-full max-w-sm px-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-50"
          />
        </div>
        <div className="p-8 text-center text-slate-400 text-sm">
          Loading BoMs...
        </div>
      </div>
    </div>
  );
}
