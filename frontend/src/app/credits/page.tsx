'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { creditsAPI } from '@/lib/api';
import AppLayout from '@/components/AppLayout';

export default function CreditsPage() {
  const { user, isGerant } = useAuth();
  const router = useRouter();
  const [credits, setCredits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user || !isGerant) { router.push('/'); return; }
    loadCredits();
  }, [user, isGerant, router]);

  const loadCredits = async () => {
    setLoading(true);
    try {
      const res = await creditsAPI.list();
      setCredits(res.data);
    } catch {} finally { setLoading(false); }
  };

  const handleSettle = async (saleId: number) => {
    try {
      await creditsAPI.settle(saleId);
      setSuccess('Crédit marqué comme remboursé');
      loadCredits();
      setTimeout(() => setSuccess(''), 3000);
    } catch { alert('Erreur'); }
  };

  if (!user || !isGerant) return null;

  const totalDu = credits.filter((c: any) => !c.settled).reduce((a: number, c: any) => a + Number(c.total), 0);
  const totalRembourse = credits.filter((c: any) => c.settled).reduce((a: number, c: any) => a + Number(c.total), 0);

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Crédits clients</h1>

      {success && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 border border-green-200">{success}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">En cours</p>
          <p className="text-2xl font-bold text-orange-600">{credits.filter((c: any) => !c.settled).length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total dû</p>
          <p className="text-2xl font-bold text-red-600">{totalDu.toLocaleString()} FCFA</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Remboursé</p>
          <p className="text-2xl font-bold text-green-600">{totalRembourse.toLocaleString()} FCFA</p>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : credits.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100">
          <p className="text-gray-400">Aucun crédit enregistré</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="p-3 font-medium">Client</th>
                  <th className="p-3 font-medium">Produit</th>
                  <th className="p-3 font-medium">Qté</th>
                  <th className="p-3 font-medium">Montant</th>
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Statut</th>
                  <th className="p-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {credits.map((c: any) => (
                  <tr key={c.id} className="border-t border-gray-100">
                    <td className="p-3 font-medium text-gray-800">{c.client_name}</td>
                    <td className="p-3 text-gray-600">{c.product_name}</td>
                    <td className="p-3">{c.quantity}</td>
                    <td className="p-3 font-medium">{Number(c.total).toLocaleString()} FCFA</td>
                    <td className="p-3 text-gray-500">{new Date(c.date).toLocaleDateString('fr-FR')}</td>
                    <td className="p-3">
                      {c.settled ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Remboursé</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">En attente</span>
                      )}
                    </td>
                    <td className="p-3">
                      {!c.settled && (
                        <button onClick={() => handleSettle(c.id)}
                          className="rounded bg-green-50 px-3 py-1 text-xs text-green-700 hover:bg-green-100">
                          Marquer remboursé
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
