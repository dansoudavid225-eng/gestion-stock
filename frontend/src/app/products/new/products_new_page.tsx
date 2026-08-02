'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { productsAPI } from '@/lib/api';
import AppLayout from '@/components/AppLayout';

export default function NewProductPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', category: '', purchase_price: 0, selling_price: 0,
    stock: 0, min_stock: 5,
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [purchaseMode, setPurchaseMode] = useState<'unit' | 'total'>('unit');
  const [purchaseTotal, setPurchaseTotal] = useState(0);
  const [purchaseQty, setPurchaseQty] = useState(0);

  if (!user) return null;

  const computedUnitPrice = purchaseQty > 0 ? purchaseTotal / purchaseQty : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.selling_price) {
      setError('Le nom et le prix de vente sont requis');
      return;
    }
    if (purchaseMode === 'total' && purchaseQty <= 0) {
      setError("Indique la quantité correspondant au prix d'achat total");
      return;
    }
    setSaving(true);
    setError('');
    try {
      const finalForm = {
        ...form,
        purchase_price: purchaseMode === 'total' ? Number(computedUnitPrice.toFixed(2)) : form.purchase_price,
      };
      const data = new FormData();
      Object.entries(finalForm).forEach(([k, v]) => data.append(k, String(v)));
      if (photo) data.append('photo', photo);
      await productsAPI.create(data);
      router.push('/products');
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Nouveau produit</h1>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
            <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Prix d&apos;achat</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs">
                <button type="button" onClick={() => setPurchaseMode('unit')}
                  className={`px-2 py-1 ${purchaseMode === 'unit' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}>
                  Prix unitaire
                </button>
                <button type="button" onClick={() => { setPurchaseMode('total'); if (!purchaseQty) setPurchaseQty(form.stock || 1); }}
                  className={`px-2 py-1 ${purchaseMode === 'total' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}>
                  Prix total du lot
                </button>
              </div>
            </div>

            {purchaseMode === 'unit' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Prix d&apos;achat unitaire (FCFA)</label>
                  <input type="number" min="0" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Prix de vente *</label>
                  <input type="number" min="0" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
                </div>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Prix total payé (FCFA)</label>
                    <input type="number" min="0" value={purchaseTotal} onChange={(e) => setPurchaseTotal(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Quantité du lot</label>
                    <input type="number" min="1" value={purchaseQty} onChange={(e) => setPurchaseQty(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Prix de vente *</label>
                    <input type="number" min="0" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Prix d&apos;achat unitaire calculé : <span className="font-medium text-gray-700">{computedUnitPrice ? computedUnitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 0} FCFA / unité</span>
                </p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock initial</label>
              <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seuil d&apos;alerte</label>
              <input type="number" min="0" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
            <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              className="w-full text-sm" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => router.push('/products')}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
            <button type="submit" disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Enregistrement...' : 'Créer le produit'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
