import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
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
        if (window.location.pathname !== '/') { window.location.href = '/'; }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// --- Types -----------------------------------------------------------
// Reflètent les serializers DRF (backend/stock/serializers.py). Les champs
// en écriture seule / calculés côté serveur (unit_price, total, date, ...)
// restent dans le type "lecture" et sont omis des payloads de création.

export interface AppUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
}

export interface UserPayload {
  username: string;
  password?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  is_staff?: boolean;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  purchase_price: number;
  selling_price: number;
  photo: string | null;
  stock: number;
  min_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddStockPayload {
  quantity: number;
  unit_price: number;
  supplier?: string;
}

export type PaymentMethod = 'cash' | 'momo' | 'credit';

export interface Sale {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  payment_method: PaymentMethod;
  date: string;
  created_by: number | null;
  created_by_name: string;
  client_name: string | null;
  is_credit: boolean;
  settled: boolean;
}

export interface SaleCreatePayload {
  product: number;
  quantity: number;
  payment_method?: PaymentMethod;
  client_name?: string;
}

export interface SaleListParams {
  start_date?: string;
  end_date?: string;
  product?: number;
}

export interface Loss {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  reason: string;
  date: string;
  created_by: number | null;
}

export interface LossCreatePayload {
  product: number;
  quantity: number;
  reason: string;
}

export interface StockEntry {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  supplier: string;
  date: string;
  created_by: number | null;
  created_by_name: string;
}

export interface InventoryAdjustment {
  id: number;
  product: number;
  product_name: string;
  old_quantity: number;
  new_quantity: number;
  reason: string;
  date: string;
  created_by: number | null;
  created_by_name: string;
}

export interface AdjustmentCreatePayload {
  product: number;
  new_quantity: number;
  reason: string;
}

export interface DayClosure {
  id: number;
  date: string;
  closed_by: number | null;
  closed_by_name: string;
  closed_at: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  created_at: string;
  total_purchases: number;
  total_credit: number;
}

export type CustomerPayload = Partial<Omit<Customer, 'id' | 'created_at'>>;

export interface ShopSettings {
  name: string;
  phone: string;
  address: string;
  logo: string | null;
}

export interface ShopSettingsPayload {
  name?: string;
  phone?: string;
  address?: string;
  logo?: File;
}

export interface Credit {
  id: number;
  product_name: string;
  quantity: number;
  total: number;
  client_name: string;
  date: string;
  settled: boolean;
  created_by_name: string;
}

export interface Ecart {
  vendeur: string;
  nb_ventes: number;
  total_vendu: number;
}

export interface DashboardData {
  today: { sales_count: number; total_sales: number };
  overall: { total_revenue: number; total_credit: number; total_margin: number };
  low_stock_products: Product[];
  out_of_stock: Product[];
  top_products: { product__name: string; total_qty: number; total_rev: number; margin: number }[];
  day_closed: boolean;
  sales_by_day: { day: string; total: number; count: number }[];
}

// --- Endpoints ---------------------------------------------------------

export const authAPI = {
  login: (username: string, password: string) =>
    api.post<{ user: AppUser; access: string; refresh: string }>('/auth/login/', { username, password }),
  logout: () => api.post('/auth/logout/'),
  me: () => api.get<AppUser>('/auth/me/'),
  register: (data: UserPayload) => api.post<{ user: AppUser; access: string; refresh: string }>('/auth/register/', data),
};

export const productsAPI = {
  list: () => api.get<Product[]>('/products/'),
  get: (id: number) => api.get<Product>(`/products/${id}/`),
  create: (data: FormData) => api.post<Product>('/products/', data),
  update: (id: number, data: FormData) => api.patch<Product>(`/products/${id}/`, data),
  delete: (id: number) => api.delete(`/products/${id}/`),
  addStock: (id: number, data: AddStockPayload) => api.post<Product>(`/products/${id}/add_stock/`, data),
};

export const salesAPI = {
  list: (params?: SaleListParams) => api.get<Sale[]>('/sales/', { params }),
  create: (data: SaleCreatePayload) => api.post<Sale>('/sales/', data),
};

export const lossesAPI = {
  list: () => api.get<Loss[]>('/losses/'),
  create: (data: LossCreatePayload) => api.post<Loss>('/losses/', data),
};

export const adjustmentsAPI = {
  list: () => api.get<InventoryAdjustment[]>('/adjustments/'),
  create: (data: AdjustmentCreatePayload) => api.post<InventoryAdjustment>('/adjustments/', data),
};

export const dashboardAPI = {
  get: () => api.get<DashboardData>('/dashboard/'),
};

export const stockEntriesAPI = {
  list: () => api.get<StockEntry[]>('/stock-entries/'),
};

export const dayClosureAPI = {
  list: () => api.get<DayClosure[]>('/day-closures/'),
  create: () => api.post<DayClosure>('/day-closures/', {}),
};

export const ecartsAPI = {
  list: () => api.get<Ecart[]>('/ecarts-vendeurs/'),
};

export const creditsAPI = {
  list: () => api.get<Credit[]>('/credits/'),
  settle: (saleId: number) => api.post('/credits/', { sale_id: saleId }),
};

export const shopAPI = {
  get: () => api.get<ShopSettings>('/shop-settings/'),
  update: (data: FormData | ShopSettingsPayload) => api.put<ShopSettings>('/shop-settings/', data),
};

export const usersAPI = {
  list: () => api.get<AppUser[]>('/users/'),
  get: (id: number) => api.get<AppUser>(`/users/${id}/`),
  create: (data: UserPayload) => api.post<AppUser>('/users/', data),
  update: (id: number, data: UserPayload) => api.patch<AppUser>(`/users/${id}/`, data),
  delete: (id: number) => api.delete(`/users/${id}/`),
};

export const customersAPI = {
  list: () => api.get<Customer[]>('/customers/'),
  get: (id: number) => api.get<Customer>(`/customers/${id}/`),
  create: (data: CustomerPayload) => api.post<Customer>('/customers/', data),
  update: (id: number, data: CustomerPayload) => api.patch<Customer>(`/customers/${id}/`, data),
  delete: (id: number) => api.delete(`/customers/${id}/`),
};

export const downloadAPI = {
  pdf: (params: { start_date?: string; end_date?: string }) =>
    api.get('/rapport-pdf/', { params, responseType: 'blob' }),
  excel: (params: { start_date?: string; end_date?: string }) =>
    api.get('/export-excel/', { params, responseType: 'blob' }),
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:8000';

export function mediaUrl(path: string | null): string | null {
  if (!path) return null;

  // En mode stockage S3/Supabase, l'API renvoie déjà l'URL publique finale
  // du fichier (ex: https://xxx.supabase.co/storage/v1/object/public/...),
  // qui ne contient pas forcément '/media/'. La réécrire vers notre propre
  // backend produit une URL cassée. On ne réécrit donc QUE les URLs qui
  // pointent vers notre propre API (stockage local classique) ; toute
  // autre URL absolue est déjà utilisable telle quelle.
  try {
    const url = new URL(path, API_BASE);
    const backendHost = new URL(API_BASE).host;
    if (url.host !== backendHost) {
      return path;
    }
    const relative = url.pathname.replace(/^\/?(api\/)?media\//, '');
    if (!relative) return null;
    return `${API_BASE}/api/media/${relative}`;
  } catch {
    return path;
  }
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
