'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { stockEntriesAPI } from '@/lib/api';
import AppLayout from '@/components/AppLayout';

const PAGE_SIZE = 20;

export default function StockEntriesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!user) { router.push('/'); return; }
  }, [user, router]);

  const loadEntries = useCallback(() => {
    setLoading(true);
    stockEntriesAPI.list()
      .then((res) => setEntries(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const paginated = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));

  if (!user) return null;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Entrées de stock</h1>
      </div>

      {loading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500">
                    <th className="p-3 font-medium">Produit</th>
                    <th className="p-3 font-medium">Quantité</th>
                    <th className="p-3 font-medium">Prix unitaire</th>
                    <th className="p-3 font-medium">Total</th>
                    <th className="p-3 font-medium">Fournisseur</th>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Créé par</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan={7} className="p-6 text-center text-gray-400">Aucune entrée de stock</td></tr>
                  ) : paginated.map((e: any) => (
                    <tr key={e.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-800">{e.product_name || e.product?.name || '-'}</td>
                      <td className="p-3 text-gray-500">{e.quantity}</td>
                      <td className="p-3 text-gray-500">{Number(e.unit_price).toLocaleString()} FCFA</td>
                      <td className="p-3 font-semibold text-gray-800">{Number(e.total || e.quantity * e.unit_price).toLocaleString()} FCFA</td>
                      <td className="p-3 text-gray-500">{e.supplier || '-'}</td>
                      <td className="p-3 text-gray-500">{new Date(e.created_at || e.date).toLocaleDateString()}</td>
                      <td className="p-3 text-gray-500">{e.created_by_name || e.created_by?.username || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <p className="text-gray-500">{entries.length} entrée(s) — Page {page + 1}/{totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  ← Précédent
                </button>
                <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  Suivant →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
