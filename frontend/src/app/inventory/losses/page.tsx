'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { lossesAPI, productsAPI } from '@/lib/api';
import AppLayout from '@/components/AppLayout';

const PAGE_SIZE = 20;

export default function LossesPage() {
  const { user, isGerant } = useAuth();
  const router = useRouter();
  const [losses, setLosses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ product_id: '', quantity: 1, reason: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) { router.push('/'); return; }
  }, [user, router]);

  const loadLosses = useCallback(() => {
    setLoading(true);
    lossesAPI.list()
      .then((res) => setLosses(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadLosses(); }, [loadLosses]);

  const openModal = async () => {
    try {
      const res = await productsAPI.list();
      setProducts(res.data);
    } catch {}
    setForm({ product_id: '', quantity: 1, reason: '' });
    setModal(true);
  };

  const handleSubmit = async () => {
    if (!form.product_id || form.quantity < 1 || !form.reason.trim()) return;
    setSubmitting(true);
    try {
      await lossesAPI.create({
        product_id: Number(form.product_id),
        quantity: form.quantity,
        reason: form.reason,
      });
      setModal(false);
      loadLosses();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const paginated = losses.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(losses.length / PAGE_SIZE));

  if (!user) return null;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Pertes</h1>
        {isGerant && (
          <button onClick={openModal}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            + Nouvelle perte
          </button>
        )}
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
                    <th className="p-3 font-medium">Raison</th>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Créé par</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan={5} className="p-6 text-center text-gray-400">Aucune perte</td></tr>
                  ) : paginated.map((l: any) => (
                    <tr key={l.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-800">{l.product_name || l.product?.name || '-'}</td>
                      <td className="p-3 text-red-600 font-semibold">{l.quantity}</td>
                      <td className="p-3 text-gray-500">{l.reason}</td>
                      <td className="p-3 text-gray-500">{new Date(l.created_at || l.date).toLocaleDateString()}</td>
                      <td className="p-3 text-gray-500">{l.created_by_name || l.created_by?.username || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <p className="text-gray-500">{losses.length} perte(s) — Page {page + 1}/{totalPages}</p>
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

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">Nouvelle perte</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Produit</label>
                <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="">Sélectionner un produit</option>
                  {products.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Quantité</label>
                <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Raison</label>
                <input type="text" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Motif de la perte" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
              <button onClick={handleSubmit} disabled={submitting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
                {submitting ? 'Enregistrement...' : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
