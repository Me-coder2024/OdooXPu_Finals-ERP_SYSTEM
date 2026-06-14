'use client';

import { useAuthStore } from '@/stores/authStore';
import AdminDashboard from './AdminDashboard';
import UserDashboard from './UserDashboard';

export default function DashboardPage() {
  const { user } = useAuthStore();

  // Admin/Owner → Admin Dashboard (simple stat cards, recent users, low stock)
  // All other roles → User Dashboard (dark cards with All/My tabs)
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';

  return isAdmin ? <AdminDashboard /> : <UserDashboard />;
}
