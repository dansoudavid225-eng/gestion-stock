'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usersAPI } from '@/lib/api';
import AppLayout from '@/components/AppLayout';

export default function UsersPage() {
  const { user, isGerant } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ type?: 'create' | 'edit' | 'delete'; user?: any; show: boolean }>({ show: false });
  const [form, setForm] = useState({ username: '', password: '', first_name: '', last_name: '', email: '', is_staff: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) { router.push('/'); return; }
  }, [user, router]);

  const loadUsers = () => {
    setLoading(true);
    usersAPI.list()
      .then((res) => setUsers(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    loadUsers();
  }, [user]);

  const openCreate = () => {
    setForm({ username: '', password: '', first_name: '', last_name: '', email: '', is_staff: false });
    setError('');
    setModal({ type: 'create', show: true });
  };

  const openEdit = (u: any) => {
    setForm({ username: u.username, password: '', first_name: u.first_name, last_name: u.last_name, email: u.email, is_staff: u.is_staff });
    setError('');
    setModal({ type: 'edit', user: u, show: true });
  };

  const handleSubmit = async () => {
    if (!form.username || (!modal.user && !form.password)) {
      setError(modal.user ? 'Le nom d\'utilisateur est requis' : 'Le nom d\'utilisateur et le mot de passe sont requis');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload: any = { ...form };
      if (modal.user && !payload.password) delete payload.password;
      if (modal.user) {
        await usersAPI.update(modal.user.id, payload);
      } else {
        await usersAPI.create(payload);
      }
      setModal({ show: false });
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || Object.values(err.response?.data || {}).flat().join(', ') || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!modal.user) return;
    try {
      await usersAPI.delete(modal.user.id);
      setModal({ show: false });
      loadUsers();
    } catch { alert('Erreur lors de la suppression'); }
  };

  if (!user) return null;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Utilisateurs</h1>
        {isGerant && (
          <button onClick={openCreate}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            + Nouvel utilisateur
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="p-3 font-medium">Nom d&apos;utilisateur</th>
                  <th className="p-3 font-medium">Prénom</th>
                  <th className="p-3 font-medium">Nom</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Rôle</th>
                  <th className="p-3 font-medium">Actif</th>
                  <th className="p-3 font-medium">Inscrit le</th>
                  {isGerant && <th className="p-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={isGerant ? 8 : 7} className="p-6 text-center text-gray-400">Aucun utilisateur</td></tr>
                ) : users.map((u: any) => (
                  <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-800">{u.username}</td>
                    <td className="p-3 text-gray-500">{u.first_name || '-'}</td>
                    <td className="p-3 text-gray-500">{u.last_name || '-'}</td>
                    <td className="p-3 text-gray-500">{u.email || '-'}</td>
                    <td className="p-3">
                      {u.is_staff ? (
                        <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">Gérant</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">Vendeur</span>
                      )}
                    </td>
                    <td className="p-3">
                      {u.is_active ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Oui</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">Non</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-500">{new Date(u.date_joined).toLocaleDateString()}</td>
                    {isGerant && (
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(u)}
                            className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 hover:bg-amber-100">Modifier</button>
                          <button onClick={() => setModal({ type: 'delete', user: u, show: true })}
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
      )}

      {(modal.show && modal.type !== 'delete') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">{modal.user ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h2>
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">{error}</div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Nom d&apos;utilisateur *</label>
                <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Mot de passe {!modal.user && '*'}
                  {modal.user && <span className="text-gray-400 font-normal"> (laisser vide pour conserver)</span>}
                </label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Prénom</label>
                  <input type="text" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Nom</label>
                  <input type="text" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_staff" checked={form.is_staff}
                  onChange={(e) => setForm({ ...form, is_staff: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600" />
                <label htmlFor="is_staff" className="text-sm text-gray-600">Gérant (accès administrateur)</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal({ show: false })}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
              <button onClick={handleSubmit} disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Enregistrement...' : modal.user ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal.show && modal.type === 'delete' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-2">Confirmer la suppression</h2>
            <p className="text-sm text-gray-500">Supprimer l&apos;utilisateur <strong>{modal.user?.username}</strong> ?</p>
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
