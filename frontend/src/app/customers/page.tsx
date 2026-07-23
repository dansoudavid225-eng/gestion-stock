'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { customersAPI } from '@/lib/api';
import AppLayout from '@/components/AppLayout';

const PAGE_SIZE = 20;

export default function CustomersPage() {
  const { user, isGerant } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [modal, setModal] = useState<{ customer?: any; show: boolean }>({ show: false });
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!user) { router.push('/'); return; }
  }, [user, router]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [search]);

  useEffect(() => {
    setPage(0);
    loadCustomers();
  }, [debouncedSearch]);

  const loadCustomers = useCallback(() => {
    setLoading(true);
    customersAPI.list()
      .then((res) => {
        let filtered = res.data;
        if (debouncedSearch) {
          const q = debouncedSearch.toLowerCase();
          filtered = filtered.filter((c: any) =>
            c.name.toLowerCase().includes(q) || (c.phone && c.phone.toLowerCase().includes(q))
          );
        }
        setCustomers(filtered);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [debouncedSearch]);

  const paginated = customers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(customers.length / PAGE_SIZE));

  const handleDelete = async () => {
    if (!modal.customer) return;
    try {
      await customersAPI.delete(modal.customer.id);
      setModal({ show: false });
      loadCustomers();
    } catch { alert('Erreur lors de la suppression'); }
  };

  if (!user) return null;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Clients</h1>
        {isGerant && (
          <button onClick={() => router.push('/customers/new')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            + Nouveau client
          </button>
        )}
      </div>

      <div className="mb-4">
        <input
          type="text" placeholder="Rechercher un client..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
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
                    <th className="p-3 font-medium">Nom</th>
                    <th className="p-3 font-medium">Téléphone</th>
                    <th className="p-3 font-medium">Email</th>
                    <th className="p-3 font-medium">Total achats</th>
                    <th className="p-3 font-medium">Total crédit</th>
                    <th className="p-3 font-medium">Client depuis</th>
                    {isGerant && <th className="p-3 font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan={isGerant ? 7 : 6} className="p-6 text-center text-gray-400">Aucun client</td></tr>
                  ) : paginated.map((c: any) => (
                    <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-800">{c.name}</td>
                      <td className="p-3 text-gray-500">{c.phone || '-'}</td>
                      <td className="p-3 text-gray-500">{c.email || '-'}</td>
                      <td className="p-3">{Number(c.total_purchases || 0).toLocaleString()} FCFA</td>
                      <td className="p-3">{Number(c.total_credit || 0).toLocaleString()} FCFA</td>
                      <td className="p-3 text-gray-500">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}
                      </td>
                      {isGerant && (
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button onClick={() => router.push(`/customers/${c.id}/edit`)}
                              className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 hover:bg-amber-100">Modifier</button>
                            <button onClick={() => setModal({ customer: c, show: true })}
                              className="rounded bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100">Suppr.</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <p className="text-gray-500">{customers.length} client(s) — Page {page + 1}/{totalPages}</p>
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

      {modal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-2">Confirmer la suppression</h2>
            <p className="text-sm text-gray-500">Supprimer {modal.customer?.name} ?</p>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal({ show: false })}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
              <button onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
