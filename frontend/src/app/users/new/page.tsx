'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usersAPI } from '@/lib/api';
import AppLayout from '@/components/AppLayout';

export default function NewUserPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    username: '', password: '', first_name: '', last_name: '', email: '', is_staff: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      setError('Le nom d\'utilisateur et le mot de passe sont requis');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await usersAPI.create(form);
      router.push('/users');
    } catch (err: any) {
      setError(err.response?.data?.detail || Object.values(err.response?.data || {}).flat().join(', ') || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Nouvel utilisateur</h1>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom d&apos;utilisateur *</label>
            <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe *</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
              <input type="text" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input type="text" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_staff" checked={form.is_staff}
              onChange={(e) => setForm({ ...form, is_staff: e.target.checked })}
              className="rounded border-gray-300 text-blue-600" />
            <label htmlFor="is_staff" className="text-sm text-gray-700">Gérant (accès administrateur)</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => router.push('/users')}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
            <button type="submit" disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Enregistrement...' : 'Créer l\'utilisateur'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
