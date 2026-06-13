'use client';

import { useAuthStore } from '@/stores/authStore';
import { Bell, User } from 'lucide-react';
import Link from 'next/link';

export function Navbar() {
  const { user } = useAuthStore();

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">
          Shiv Furniture Works — ERP System
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 hover:bg-slate-100 rounded-md transition-colors relative" title="Notifications">
          <Bell size={18} className="text-slate-500" />
        </button>

        {user && (
          <Link href="/profile" className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-md transition-colors">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
              <User size={14} className="text-blue-700" />
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-medium text-slate-900 leading-tight">{user.name}</p>
              <p className="text-[10px] text-slate-500 leading-tight">{user.role}</p>
            </div>
          </Link>
        )}
      </div>
    </header>
  );
}
