import { salesAPI } from './api';

const PENDING_KEY = 'offline_sales';
const CACHED_PRODUCTS_KEY = 'cached_products';

export interface OfflineSale {
  id: string;
  product_id: number;
  product_name: string;
  quantity: number;
  payment_method: string;
  client_name: string;
  total: number;
  created_at: string;
  synced: boolean;
}

export function getPendingSales(): OfflineSale[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addPendingSale(sale: Omit<OfflineSale, 'id' | 'created_at' | 'synced'>) {
  const pending = getPendingSales();
  pending.push({
    ...sale,
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    created_at: new Date().toISOString(),
    synced: false,
  });
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export function removePendingSale(id: string) {
  const pending = getPendingSales().filter((s) => s.id !== id);
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export function clearSyncedSales() {
  const pending = getPendingSales().filter((s) => !s.synced);
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export async function syncPendingSales(): Promise<number> {
  const pending = getPendingSales().filter((s) => !s.synced);
  let synced = 0;
  for (const sale of pending) {
    try {
      await salesAPI.create({
        product: sale.product_id,
        quantity: sale.quantity,
        payment_method: sale.payment_method,
        client_name: sale.client_name,
      });
      removePendingSale(sale.id);
      synced++;
    } catch {
      continue;
    }
  }
  return synced;
}

export function cacheProducts(products: any[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CACHED_PRODUCTS_KEY, JSON.stringify(products));
}

export function getCachedProducts(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(CACHED_PRODUCTS_KEY) || '[]');
  } catch {
    return [];
  }
}
