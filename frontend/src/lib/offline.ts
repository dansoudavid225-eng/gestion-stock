import { salesAPI, type PaymentMethod } from './api';

const PENDING_KEY = 'offline_sales';
const CACHED_PRODUCTS_KEY = 'cached_products';

const MAX_SYNC_ATTEMPTS = 5;

export interface OfflineSale {
  id: string;
  product_id: number;
  product_name: string;
  quantity: number;
  payment_method: PaymentMethod;
  client_name: string;
  total: number;
  created_at: string;
  synced: boolean;
  syncAttempts?: number;
  syncError?: string;
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

function updatePendingSale(id: string, patch: Partial<OfflineSale>) {
  const pending = getPendingSales().map((s) => (s.id === id ? { ...s, ...patch } : s));
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export function clearSyncedSales() {
  const pending = getPendingSales().filter((s) => !s.synced);
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

// Ventes qui ont dépassé MAX_SYNC_ATTEMPTS : elles ne seront plus retentées
// automatiquement, il faut une action explicite de l'utilisateur (retry ou
// suppression) après avoir vu l'erreur. Évite la boucle d'échec silencieux.
export function getFailedSales(): OfflineSale[] {
  return getPendingSales().filter((s) => !s.synced && (s.syncAttempts || 0) >= MAX_SYNC_ATTEMPTS);
}

export async function syncPendingSales(): Promise<number> {
  const pending = getPendingSales().filter(
    (s) => !s.synced && (s.syncAttempts || 0) < MAX_SYNC_ATTEMPTS
  );
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
    } catch (err: any) {
      const attempts = (sale.syncAttempts || 0) + 1;
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        (attempts >= MAX_SYNC_ATTEMPTS
          ? "Échec après plusieurs tentatives, vérifie cette vente"
          : "Échec temporaire, nouvel essai au prochain sync");
      updatePendingSale(sale.id, { syncAttempts: attempts, syncError: message });
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
