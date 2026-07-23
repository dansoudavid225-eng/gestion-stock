'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { customersAPI } from '@/lib/api';
import AppLayout from '@/components/AppLayout';

export default function EditCustomerPage() {
  const { user, isGerant } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) { router.push('/'); return; }
    if (!isGerant) { router.push('/customers'); return; }
  }, [user, isGerant, router]);

  useEffect(() => {
    if (!id) return;
    customersAPI.get(id)
      .then((res) => {
        const c = res.data;
        setForm({
          name: c.name || '',
          phone: c.phone || '',
          email: c.email || '',
          address: c.address || '',
          notes: c.notes || '',
        });
      })
      .catch(() => router.push('/customers'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      setError('Le nom est requis');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await customersAPI.update(id, form);
      router.push('/customers');
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
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Modifier le client</h1>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => router.push('/customers')}
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
