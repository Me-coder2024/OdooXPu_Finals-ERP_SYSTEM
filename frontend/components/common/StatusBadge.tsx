'use client';

import { OrderStatus, WorkOrderStatus } from '@/types';

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  PARTIALLY_DELIVERED: { label: 'Partial Delivery', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  FULLY_DELIVERED: { label: 'Delivered', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PARTIALLY_RECEIVED: { label: 'Partial Receipt', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  FULLY_RECEIVED: { label: 'Received', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DONE: { label: 'Done', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-50 text-red-700 border-red-200' },
  PENDING: { label: 'Pending', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

interface StatusBadgeProps {
  status: OrderStatus | WorkOrderStatus | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: 'bg-slate-100 text-slate-600 border-slate-200' };

  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
}
