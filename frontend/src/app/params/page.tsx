'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { shopAPI } from '@/lib/api';
import AppLayout from '@/components/AppLayout';

export default function ParamsPage() {
  const { user, isGerant } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user || !isGerant) { router.push('/'); return; }
    loadSettings();
  }, [user, isGerant, router]);

  const cacheSettings = (data: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('shop_settings', JSON.stringify(data));
    }
  };

  const loadSettings = async () => {
    try {
      const res = await shopAPI.get();
      setForm({ name: res.data.name, phone: res.data.phone || '', address: res.data.address || '' });
      cacheSettings(res.data);
    } catch {} finally { setLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await shopAPI.update(form);
      setSuccess('Paramètres enregistrés');
      cacheSettings(res.data);
      setTimeout(() => setSuccess(''), 3000);
    } catch { alert('Erreur'); } finally { setSaving(false); }
  };

  if (!user || !isGerant) return null;

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Paramètres boutique</h1>

      {success && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 border border-green-200">{success}</div>
      )}

      {loading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : (
        <form onSubmit={handleSave} className="max-w-lg space-y-4 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la boutique</label>
            <input type="text" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input type="text" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
            <textarea value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={3} />
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}
    </AppLayout>
  );
}
