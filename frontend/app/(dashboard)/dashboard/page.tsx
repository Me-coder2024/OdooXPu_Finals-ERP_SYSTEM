'use client';

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Overview of your ERP operations</p>
      </div>

      {/* Stats cards placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {['Total Products', 'Active Sales Orders', 'Pending Purchase Orders', 'Manufacturing Orders'].map((title) => (
          <div key={title} className="bg-white rounded-lg border border-slate-200 p-5">
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <div className="mt-2 h-8 w-20 bg-slate-100 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Orders by Status</h2>
          <div className="h-64 bg-slate-50 rounded-md flex items-center justify-center text-slate-400 text-sm">
            Chart loading...
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Recent Activity</h2>
          <div className="h-64 bg-slate-50 rounded-md flex items-center justify-center text-slate-400 text-sm">
            Activity loading...
          </div>
        </div>
      </div>
    </div>
  );
}
