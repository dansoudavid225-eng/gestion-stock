'use client';

import { useState, useEffect } from 'react';
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
  // Mode de saisie du prix d'achat : soit le prix unitaire directement,
  // soit le prix total payé pour tout le lot (divisé par le stock initial
  // pour obtenir le prix unitaire réellement enregistré).
  const [priceMode, setPriceMode] = useState<'unit' | 'lot'>('unit');
  const [lotTotalPrice, setLotTotalPrice] = useState(0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Recalcule le prix d'achat unitaire dès que le prix total du lot ou la
  // quantité de stock initial change, tant qu'on est en mode "lot".
  useEffect(() => {
    if (priceMode !== 'lot') return;
    setForm((f) => ({ ...f, purchase_price: f.stock > 0 ? lotTotalPrice / f.stock : 0 }));
  }, [priceMode, lotTotalPrice, form.stock]);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.selling_price) {
      setError('Le nom et le prix de vente sont requis');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, String(v)));
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
              <div className="inline-flex rounded-lg border border-gray-300 p-0.5 text-xs">
                <button type="button" onClick={() => setPriceMode('unit')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${priceMode === 'unit' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                  Prix unitaire
                </button>
                <button type="button" onClick={() => setPriceMode('lot')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${priceMode === 'lot' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                  Prix total du lot
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                {priceMode === 'unit' ? (
                  <>
                    <label className="block text-xs text-gray-500 mb-1">Prix d&apos;achat unitaire (FCFA)</label>
                    <input type="number" min="0" value={form.purchase_price}
                      onChange={(e) => setForm({ ...form, purchase_price: Number(e.target.value) })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  </>
                ) : (
                  <>
                    <label className="block text-xs text-gray-500 mb-1">Prix total du lot (FCFA)</label>
                    <input type="number" min="0" value={lotTotalPrice}
                      onChange={(e) => setLotTotalPrice(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                    <p className="text-xs text-gray-400 mt-1">
                      {form.stock > 0
                        ? `≈ ${form.purchase_price.toLocaleString(undefined, { maximumFractionDigits: 2 })} FCFA / unité (÷ ${form.stock} en stock initial)`
                        : "Renseigne le stock initial pour calculer le prix unitaire"}
                    </p>
                  </>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Prix de vente *</label>
                <input type="number" min="0" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
              </div>
            </div>
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
