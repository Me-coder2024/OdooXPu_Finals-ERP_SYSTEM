import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await apiClient.post('/auth/refresh');
        return apiClient(originalRequest);
      } catch {
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  signup: (data: { login_id: string; name: string; email: string; password: string }) =>
    apiClient.post('/auth/signup', data),
  refresh: () => apiClient.post('/auth/refresh'),
  logout: () => apiClient.post('/auth/logout'),
  me: () => apiClient.get('/auth/me'),
};

// Users API
export const usersApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get('/users', { params }),
  getById: (id: string) => apiClient.get(`/users/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post('/users', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch(`/users/${id}`, data),
  delete: (id: string) => apiClient.delete(`/users/${id}`),
  updateAccess: (id: string, moduleAccess: Record<string, unknown>[]) =>
    apiClient.patch(`/users/${id}/access`, { module_access: moduleAccess }),
};

// Products API
export const productsApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get('/products', { params }),
  getById: (id: string) => apiClient.get(`/products/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post('/products', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch(`/products/${id}`, data),
  delete: (id: string) => apiClient.delete(`/products/${id}`),
};

// Sales Orders API
export const salesOrdersApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get('/sales-orders', { params }),
  getById: (id: string) => apiClient.get(`/sales-orders/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post('/sales-orders', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch(`/sales-orders/${id}`, data),
  confirm: (id: string) => apiClient.post(`/sales-orders/${id}/confirm`),
  deliver: (id: string, data: Record<string, unknown>) => apiClient.post(`/sales-orders/${id}/deliver`, data),
  cancel: (id: string) => apiClient.post(`/sales-orders/${id}/cancel`),
};

// Purchase Orders API
export const purchaseOrdersApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get('/purchase-orders', { params }),
  getById: (id: string) => apiClient.get(`/purchase-orders/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post('/purchase-orders', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch(`/purchase-orders/${id}`, data),
  confirm: (id: string) => apiClient.post(`/purchase-orders/${id}/confirm`),
  receive: (id: string, data: Record<string, unknown>) => apiClient.post(`/purchase-orders/${id}/receive`, data),
  cancel: (id: string) => apiClient.post(`/purchase-orders/${id}/cancel`),
};

// BoM API
export const bomsApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get('/boms', { params }),
  getById: (id: string) => apiClient.get(`/boms/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post('/boms', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch(`/boms/${id}`, data),
  delete: (id: string) => apiClient.delete(`/boms/${id}`),
};

// Manufacturing Orders API
export const manufacturingOrdersApi = {
  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get('/manufacturing-orders', { params }),
  getById: (id: string) => apiClient.get(`/manufacturing-orders/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post('/manufacturing-orders', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch(`/manufacturing-orders/${id}`, data),
  confirm: (id: string) => apiClient.post(`/manufacturing-orders/${id}/confirm`),
  produce: (id: string) => apiClient.post(`/manufacturing-orders/${id}/produce`),
  cancel: (id: string) => apiClient.post(`/manufacturing-orders/${id}/cancel`),
  updateWorkOrder: (moId: string, woId: string, data: Record<string, unknown>) =>
    apiClient.patch(`/manufacturing-orders/${moId}/work-orders/${woId}`, data),
};

// Work Centers API
export const workCentersApi = {
  getAll: () => apiClient.get('/work-centers'),
  create: (data: Record<string, unknown>) => apiClient.post('/work-centers', data),
};

// Vendors & Customers API
export const vendorsApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get('/vendors', { params }),
  create: (data: Record<string, unknown>) => apiClient.post('/vendors', data),
};

export const customersApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient.get('/customers', { params }),
  create: (data: Record<string, unknown>) => apiClient.post('/customers', data),
};

// Stock Ledger API
export const stockLedgerApi = {
  getAll: (params?: { page?: number; limit?: number; product_id?: string; movement_type?: string; start_date?: string; end_date?: string }) =>
    apiClient.get('/stock-ledger', { params }),
};

// Audit Logs API
export const auditLogsApi = {
  getAll: (params?: { page?: number; limit?: number; module?: string; user_id?: string; action?: string; start_date?: string; end_date?: string }) =>
    apiClient.get('/audit-logs', { params }),
};

// Dashboard API
export const dashboardApi = {
  getStats: () => apiClient.get('/dashboard/stats'),
};

// Profile API (self-update)
export const profileApi = {
  update: (data: { name?: string; address?: string; mobile?: string }) =>
    apiClient.patch('/users/me/profile', data),
  uploadPhoto: (userId: string, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return apiClient.post(`/users/${userId}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deletePhoto: (userId: string) => apiClient.delete(`/users/${userId}/photo`),
  getPhotoUrl: (userId: string) =>
    `${API_BASE_URL}/users/${userId}/photo?t=${Date.now()}`,
};
