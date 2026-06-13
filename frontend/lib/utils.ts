'use client';

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getStatusColor(status: string): { bg: string; text: string; border: string } {
  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    DRAFT: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
    CONFIRMED: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
    PARTIALLY_DELIVERED: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
    FULLY_DELIVERED: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
    PARTIALLY_RECEIVED: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
    FULLY_RECEIVED: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
    IN_PROGRESS: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
    DONE: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
    CANCELLED: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' },
    PENDING: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  };
  return statusColors[status] || statusColors.DRAFT;
}

export function getAccessColor(access: string): { bg: string; text: string } {
  const accessColors: Record<string, { bg: string; text: string }> = {
    FULL: { bg: 'bg-emerald-50', text: 'text-emerald-800' },
    VIEW: { bg: 'bg-amber-50', text: 'text-amber-800' },
    NONE: { bg: 'bg-slate-100', text: 'text-slate-400' },
  };
  return accessColors[access] || accessColors.NONE;
}
