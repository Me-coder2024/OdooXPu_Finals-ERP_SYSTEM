'use client';

export default function StockLedgerPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Stock Ledger</h1>
        <p className="text-sm text-slate-500 mt-1">Track all stock movements across the system</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <select className="px-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-50">
            <option value="">All Products</option>
          </select>
          <select className="px-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-50">
            <option value="">All Movement Types</option>
            <option value="SALE">Sale</option>
            <option value="PURCHASE_RECEIPT">Purchase Receipt</option>
            <option value="MFG_CONSUMPTION">Mfg Consumption</option>
            <option value="MFG_PRODUCTION">Mfg Production</option>
            <option value="RESERVATION">Reservation</option>
            <option value="UNRESERVATION">Unreservation</option>
            <option value="ADJUSTMENT">Adjustment</option>
          </select>
          <input type="date" className="px-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-50" />
          <input type="date" className="px-3 py-2 border border-slate-200 rounded-md text-sm bg-slate-50" />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-8 text-center text-slate-400 text-sm">
          Loading stock ledger entries...
        </div>
      </div>
    </div>
  );
}
