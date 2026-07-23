'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { productsAPI } from '@/lib/api';
import AppLayout from '@/components/AppLayout';

export default function EditProductPage() {
  const { user, isGerant } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [form, setForm] = useState({
    name: '', category: '', purchase_price: 0, selling_price: 0,
    stock: 0, min_stock: 5, is_active: true,
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) { router.push('/'); return; }
    if (!isGerant) { router.push('/products'); return; }
  }, [user, isGerant, router]);

  useEffect(() => {
    if (!id) return;
    productsAPI.get(id)
      .then((res) => {
        const p = res.data;
        setForm({
          name: p.name || '',
          category: p.category || '',
          purchase_price: p.purchase_price || 0,
          selling_price: p.selling_price || 0,
          stock: p.stock ?? 0,
          min_stock: p.min_stock ?? 5,
          is_active: p.is_active ?? true,
        });
        if (p.photo) setPhotoPreview(p.photo);
      })
      .catch(() => router.push('/products'))
      .finally(() => setLoading(false));
  }, [id]);

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
      await productsAPI.update(id, data);
      router.push('/products');
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors de la modification");
    } finally {
      setSaving(false);
    }
  };

  if (!user || !isGerant) return null;

  if (loading) {
    return (
      <AppLayout>
        <p className="text-gray-400">Chargement...</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Modifier le produit</h1>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix d&apos;achat (FCFA)</label>
              <input type="number" min="0" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix de vente *</label>
              <input type="number" min="0" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
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
            <input type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setPhoto(file);
              if (file) setPhotoPreview(URL.createObjectURL(file));
            }} className="w-full text-sm" />
            {photoPreview && (
              <img src={photoPreview} alt="Aperçu" className="mt-2 w-20 h-20 rounded-lg object-cover" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded border-gray-300" />
            <label htmlFor="is_active" className="text-sm text-gray-700">Produit actif</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => router.push('/products')}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
            <button type="submit" disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
