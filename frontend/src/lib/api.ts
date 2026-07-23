import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await axios.post(`${API_URL}/auth/refresh/`, {}, { withCredentials: true });
        return api(originalRequest);
      } catch {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/login/', { username, password }),
  logout: () => api.post('/auth/logout/'),
  me: () => api.get('/auth/me/'),
  register: (data: any) => api.post('/auth/register/', data),
};

export const productsAPI = {
  list: () => api.get('/products/'),
  get: (id: number) => api.get(`/products/${id}/`),
  create: (data: FormData | any) => api.post('/products/', data),
  update: (id: number, data: FormData | any) => api.patch(`/products/${id}/`, data),
  delete: (id: number) => api.delete(`/products/${id}/`),
  addStock: (id: number, data: any) => api.post(`/products/${id}/add_stock/`, data),
};

export const salesAPI = {
  list: (params?: any) => api.get('/sales/', { params }),
  create: (data: any) => api.post('/sales/', data),
};

export const lossesAPI = {
  list: () => api.get('/losses/'),
  create: (data: any) => api.post('/losses/', data),
};

export const adjustmentsAPI = {
  list: () => api.get('/adjustments/'),
  create: (data: any) => api.post('/adjustments/', data),
};

export const dashboardAPI = {
  get: () => api.get('/dashboard/'),
};

export const stockEntriesAPI = {
  list: () => api.get('/stock-entries/'),
};

export const dayClosureAPI = {
  list: () => api.get('/day-closures/'),
  create: () => api.post('/day-closures/', {}),
};

export const ecartsAPI = {
  list: () => api.get('/ecarts-vendeurs/'),
};

export const creditsAPI = {
  list: () => api.get('/credits/'),
  settle: (saleId: number) => api.post('/credits/', { sale_id: saleId }),
};

export const shopAPI = {
  get: () => api.get('/shop-settings/'),
  update: (data: any) => api.put('/shop-settings/', data),
};

export const usersAPI = {
  list: () => api.get('/users/'),
  get: (id: number) => api.get(`/users/${id}/`),
  create: (data: any) => api.post('/users/', data),
  update: (id: number, data: any) => api.patch(`/users/${id}/`, data),
  delete: (id: number) => api.delete(`/users/${id}/`),
};

export const customersAPI = {
  list: () => api.get('/customers/'),
  get: (id: number) => api.get(`/customers/${id}/`),
  create: (data: any) => api.post('/customers/', data),
  update: (id: number, data: any) => api.patch(`/customers/${id}/`, data),
  delete: (id: number) => api.delete(`/customers/${id}/`),
};

export const downloadAPI = {
  pdf: (params: any) => api.get('/rapport-pdf/', { params, responseType: 'blob' }),
  excel: (params: any) => api.get('/export-excel/', { params, responseType: 'blob' }),
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000';

export function mediaUrl(path: string | null): string | null {
  if (!path) return null;
  const relative = path.replace(/^https?:\/\/[^\/]+(\/api)?\/media\//, '').replace(/^media\//, '');
  if (!relative) return null;
  return `${API_BASE}/api/media/${relative}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
