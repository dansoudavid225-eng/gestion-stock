'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { productsAPI, mediaUrl } from '@/lib/api';
import AppLayout from '@/components/AppLayout';

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const { user, isGerant } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [modal, setModal] = useState<{ type?: 'stock' | 'delete'; product?: any; show: boolean }>({ show: false });
  const [stockQty, setStockQty] = useState(1);
  const [stockPrice, setStockPrice] = useState(0);
  const [stockSupplier, setStockSupplier] = useState('');
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
    loadProducts();
  }, [debouncedSearch]);

  const loadProducts = useCallback(() => {
    setLoading(true);
    productsAPI.list()
      .then((res) => {
        let filtered = res.data;
        if (debouncedSearch) {
          const q = debouncedSearch.toLowerCase();
          filtered = filtered.filter((p: any) =>
            p.name.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
          );
        }
        setProducts(filtered);
      })
      .catch(() => console.error())
      .finally(() => setLoading(false));
  }, [debouncedSearch]);

  const paginated = products.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));

  const handleAddStock = async () => {
    if (!modal.product) return;
    try {
      await productsAPI.addStock(modal.product.id, {
        quantity: stockQty, unit_price: stockPrice, supplier: stockSupplier,
      });
      setModal({ show: false });
      setStockQty(1); setStockPrice(0); setStockSupplier('');
      loadProducts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erreur');
    }
  };

  const handleDelete = async () => {
    if (!modal.product) return;
    try {
      await productsAPI.delete(modal.product.id);
      setModal({ show: false });
      loadProducts();
    } catch { console.error(); alert('Erreur lors de la suppression'); }
  };

  if (!user) return null;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Produits</h1>
        {isGerant && (
          <button onClick={() => router.push('/products/new')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            + Nouveau produit
          </button>
        )}
      </div>

      <div className="mb-4">
        <input
          type="text" placeholder="Rechercher un produit..." value={search}
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
                    <th className="p-3 font-medium">Photo</th>
                    <th className="p-3 font-medium">Produit</th>
                    <th className="p-3 font-medium">Catégorie</th>
                    <th className="p-3 font-medium">Prix vente</th>
                    <th className="p-3 font-medium">Stock</th>
                    <th className="p-3 font-medium">Seuil</th>
                    <th className="p-3 font-medium">Statut</th>
                    {isGerant && <th className="p-3 font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan={isGerant ? 8 : 7} className="p-6 text-center text-gray-400">Aucun produit</td></tr>
                  ) : paginated.map((p: any) => {
                    const stockColor = p.stock === 0 ? 'text-red-600' : p.stock <= p.min_stock ? 'text-orange-600' : 'text-green-600';
                    return (
                      <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="p-3">
                          {p.photo ? (
                            <img src={mediaUrl(p.photo)!} alt={p.name}
                              className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">N/A</div>
                          )}
                        </td>
                        <td className="p-3 font-medium text-gray-800">{p.name}</td>
                        <td className="p-3 text-gray-500">{p.category || '-'}</td>
                        <td className="p-3">{Number(p.selling_price).toLocaleString()} FCFA</td>
                        <td className={`p-3 font-semibold ${stockColor}`}>{p.stock}</td>
                        <td className="p-3 text-gray-500">{p.min_stock}</td>
                        <td className="p-3">
                          {p.is_active ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Actif</span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">Inactif</span>
                          )}
                        </td>
                        {isGerant && (
                          <td className="p-3">
                            <div className="flex gap-2">
                              <button onClick={() => router.push(`/products/${p.id}/edit`)}
                                className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 hover:bg-amber-100">Modifier</button>
                              <button onClick={() => { setModal({ type: 'stock', product: p, show: true }); setStockQty(1); }}
                                className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100">+ Stock</button>
                              <button onClick={() => { setModal({ type: 'delete', product: p, show: true }); }}
                                className="rounded bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100">Suppr.</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <p className="text-gray-500">{products.length} produit(s) — Page {page + 1}/{totalPages}</p>
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

      {modal.show && modal.type === 'stock' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">Ajouter du stock</h2>
            <p className="text-sm text-gray-500 mb-4">{modal.product?.name}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Quantité</label>
                <input type="number" min="1" value={stockQty} onChange={(e) => setStockQty(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Prix d&apos;achat unitaire (FCFA)</label>
                <input type="number" min="0" value={stockPrice} onChange={(e) => setStockPrice(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Fournisseur</label>
                <input type="text" value={stockSupplier} onChange={(e) => setStockSupplier(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal({ show: false })}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
              <button onClick={handleAddStock}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Valider</button>
            </div>
          </div>
        </div>
      )}

      {modal.show && modal.type === 'delete' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-2">Confirmer la suppression</h2>
            <p className="text-sm text-gray-500">Supprimer {modal.product?.name} ?</p>
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
