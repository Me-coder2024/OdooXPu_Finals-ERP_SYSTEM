'use client';

import { getStatusColor } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const colors = getStatusColor(status);
  const displayText = status.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center rounded-md border font-medium ${colors.bg} ${colors.text} ${colors.border} ${
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs'
      }`}
    >
      {displayText}
    </span>
  );
}

interface AccessBadgeProps {
  access: string;
}

export function AccessBadge({ access }: AccessBadgeProps) {
  const colorMap: Record<string, string> = {
    FULL: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    VIEW: 'bg-amber-50 text-amber-800 border-amber-200',
    NONE: 'bg-slate-100 text-slate-400 border-slate-200',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${colorMap[access] || colorMap.NONE}`}>
      {access}
    </span>
  );
}
