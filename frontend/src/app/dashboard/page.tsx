'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { dashboardAPI, dayClosureAPI, ecartsAPI } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const { user, isGerant } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ecarts, setEcarts] = useState<any[]>([]);
  const [closing, setClosing] = useState(false);

  const loadData = () => {
    dashboardAPI.get()
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) { router.push('/'); return; }
    loadData();
    if (user?.is_staff) {
      ecartsAPI.list().then(r => setEcarts(r.data)).catch(() => {});
    }
  }, [user, router]);

  const handleCloseDay = async () => {
    if (!confirm('Clôturer la journée ? Plus aucune vente ne pourra être enregistrée aujourd\'hui.')) return;
    setClosing(true);
    try {
      await dayClosureAPI.create();
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.[0] || 'Erreur lors de la clôture');
    } finally {
      setClosing(false);
    }
  };

  if (!user) return null;

  const formatCFA = (n: number) => `${Number(n).toLocaleString()} FCFA`;

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Tableau de bord</h1>

      {loading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : data ? (
        <>
          {data.day_closed ? (
            <div className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700 border border-yellow-200">
              Journée clôturée — aucune nouvelle vente possible aujourd&apos;hui
            </div>
          ) : isGerant && (
            <div className="mb-4">
              <button onClick={handleCloseDay} disabled={closing}
                className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50 transition-colors">
                {closing ? 'Fermeture...' : '🔒 Clôturer la journée'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Ventes aujourd&apos;hui</p>
              <p className="text-2xl font-bold text-gray-800">{data.today.sales_count}</p>
              <p className="text-lg text-green-600">{formatCFA(data.today.total_sales)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Chiffre d&apos;affaires total</p>
              <p className="text-2xl font-bold text-gray-800">{formatCFA(data.overall.total_revenue)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Marge bénéficiaire</p>
              <p className="text-2xl font-bold text-blue-600">{formatCFA(data.overall.total_margin)}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Créances en cours</p>
              <p className="text-2xl font-bold text-orange-600">{formatCFA(data.overall.total_credit)}</p>
            </div>
          </div>

          {data.sales_by_day && data.sales_by_day.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
              <h2 className="font-semibold text-gray-700 mb-4">Évolution des ventes (30 jours)</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.sales_by_day}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: any) => `${Number(value).toLocaleString()} FCFA`} />
                  <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-700 mb-3">Produits en rupture</h2>
              {data.out_of_stock?.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun produit en rupture</p>
              ) : (
                <ul className="space-y-2">
                  {data.out_of_stock?.map((p: any) => (
                    <li key={p.id} className="flex justify-between text-sm">
                      <span className="text-gray-700">{p.name}</span>
                      <span className="text-red-600 font-medium">Rupture</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-700 mb-3">Stock bas</h2>
              {data.low_stock_products?.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun produit en stock bas</p>
              ) : (
                <ul className="space-y-2">
                  {data.low_stock_products?.map((p: any) => (
                    <li key={p.id} className="flex justify-between text-sm">
                      <span className="text-gray-700">{p.name}</span>
                      <span className="text-orange-600 font-medium">{p.stock} restant(s)</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {data.top_products?.length > 0 && (
            <div className="mt-6 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-700 mb-3">Top produits</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-2 font-medium">Produit</th>
                      <th className="pb-2 font-medium">Quantité</th>
                      <th className="pb-2 font-medium">CA</th>
                      <th className="pb-2 font-medium">Marge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_products.map((p: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-2 text-gray-700">{p.product__name}</td>
                        <td className="py-2">{p.total_qty}</td>
                        <td className="py-2">{formatCFA(p.total_rev)}</td>
                        <td className="py-2 text-green-600">{formatCFA(p.margin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {isGerant && ecarts.length > 0 && (
            <div className="mt-6 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-700 mb-3">📋 Activité des vendeurs (aujourd&apos;hui)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="pb-2 font-medium">Vendeur</th>
                      <th className="pb-2 font-medium">Ventes</th>
                      <th className="pb-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ecarts.map((e: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-2">{e.vendeur}</td>
                        <td className="py-2">{e.nb_ventes}</td>
                        <td className="py-2">{Number(e.total_vendu).toLocaleString()} FCFA</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-red-500">Erreur de chargement</p>
      )}
    </AppLayout>
  );
}
