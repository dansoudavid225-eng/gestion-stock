'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { salesAPI, dashboardAPI, ecartsAPI, downloadAPI, downloadBlob } from '@/lib/api';
import AppLayout from '@/components/AppLayout';

export default function RapportsPage() {
  const { user, isGerant } = useAuth();
  const router = useRouter();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('today');
  const [dashData, setDashData] = useState<any>(null);
  const [ecarts, setEcarts] = useState<any[]>([]);

  const getDateRange = () => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    if (filter === 'today') return { start_date: todayStr, end_date: todayStr };
    if (filter === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { start_date: weekAgo.toISOString().slice(0, 10), end_date: todayStr };
    }
    if (filter === 'month') {
      return {
        start_date: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10),
        end_date: todayStr,
      };
    }
    return { start_date: todayStr, end_date: todayStr };
  };

  useEffect(() => {
    if (!user) { router.push('/'); return; }
    loadData();
  }, [user, router, filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const range = getDateRange();
      const [sRes, dRes] = await Promise.all([
        salesAPI.list({ start_date: range.start_date, end_date: range.end_date }),
        dashboardAPI.get(),
      ]);
      setSales(sRes.data);
      setDashData(dRes.data);
    } catch {
      console.error();
    } finally {
      setLoading(false);
    }
  };

  const loadEcarts = async () => {
    try {
      const res = await ecartsAPI.list();
      setEcarts(res.data);
    } catch { console.error(); }
  };

  useEffect(() => {
    if (isGerant) loadEcarts();
  }, [isGerant]);

  const totalPeriod = sales.reduce((acc: number, s: any) => acc + Number(s.total), 0);
  const totalQty = sales.reduce((acc: number, s: any) => acc + Number(s.quantity), 0);

  const downloadFile = async (type: 'pdf' | 'excel') => {
    const range = getDateRange();
    const filename = type === 'pdf' ? 'rapport.pdf' : 'export.xlsx';
    try {
      const fn = type === 'pdf' ? downloadAPI.pdf : downloadAPI.excel;
      const res = await fn({ start_date: range.start_date, end_date: range.end_date });
      downloadBlob(res.data, filename);
    } catch {
      alert('Erreur lors du téléchargement');
    }
  };

  if (!user) return null;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Rapports</h1>
        <div className="flex gap-2">
          <button onClick={() => downloadFile('pdf')}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors">
            📄 PDF
          </button>
          <button onClick={() => downloadFile('excel')}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors">
            📥 Excel
          </button>
          <button onClick={() => {
            const range = getDateRange();
            const text = `Rapport de ventes du ${range.start_date} au ${range.end_date}: ${totalPeriod.toLocaleString()} FCFA pour ${totalQty} produits vendus`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
          }}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition-colors">
            📱 WhatsApp
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {[
          { value: 'today', label: "Aujourd'hui" },
          { value: 'week', label: 'Cette semaine' },
          { value: 'month', label: 'Ce mois' },
        ].map((opt) => (
          <button key={opt.value} onClick={() => setFilter(opt.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === opt.value ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Ventes</p>
              <p className="text-2xl font-bold text-gray-800">{sales.length}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Produits vendus</p>
              <p className="text-2xl font-bold text-gray-800">{totalQty}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Chiffre d&apos;affaires</p>
              <p className="text-2xl font-bold text-green-600">{totalPeriod.toLocaleString()} FCFA</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-700">Détail des ventes</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500">
                    <th className="p-3 font-medium">Produit</th>
                    <th className="p-3 font-medium">Qté</th>
                    <th className="p-3 font-medium">Total</th>
                    <th className="p-3 font-medium">Paiement</th>
                    <th className="p-3 font-medium">Vendeur</th>
                    <th className="p-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-gray-400">Aucune vente pour cette période</td></tr>
                  ) : sales.map((s: any) => (
                    <tr key={s.id} className="border-t border-gray-100">
                      <td className="p-3 text-gray-800">{s.product_name}</td>
                      <td className="p-3">x{s.quantity}</td>
                      <td className="p-3 font-medium">{Number(s.total).toLocaleString()} FCFA</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.payment_method === 'cash' ? 'bg-green-100 text-green-800' :
                          s.payment_method === 'momo' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {s.payment_method === 'cash' ? 'Espèces' : s.payment_method === 'momo' ? 'Mobile Money' : 'Crédit'}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500">{s.created_by_name}</td>
                      <td className="p-3 text-gray-500">{new Date(s.date).toLocaleString('fr-FR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {isGerant && ecarts.length > 0 && (
            <div className="mt-6 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-700 mb-3">Écarts vendeurs (aujourd&apos;hui)</h2>
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
      )}
    </AppLayout>
  );
}
