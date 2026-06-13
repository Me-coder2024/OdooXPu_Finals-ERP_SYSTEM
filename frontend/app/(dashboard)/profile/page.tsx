'use client';

export default function ProfilePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Profile</h1>
        <p className="text-sm text-slate-500 mt-1">View and update your account details</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-200">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xl font-semibold">
              U
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">User Name</h2>
              <p className="text-sm text-slate-500">Role</p>
            </div>
          </div>

          <div className="space-y-4">
            {['Name', 'Email', 'Mobile', 'Address', 'Date of Birth'].map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{field}</label>
                <div className="h-10 bg-slate-50 rounded-md border border-slate-200 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
