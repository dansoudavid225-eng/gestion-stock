'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOffline } from '@/context/OfflineContext';
import { salesAPI, productsAPI, mediaUrl } from '@/lib/api';
import { addPendingSale, getPendingSales, cacheProducts, getCachedProducts } from '@/lib/offline';
import AppLayout from '@/components/AppLayout';

const PAGE_SIZE = 30;

interface CartItem {
  product: any;
  quantity: number;
}

export default function SalesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutMethod, setCheckoutMethod] = useState('cash');
  const [checkoutClient, setCheckoutClient] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingSales, setPendingSales] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [receipt, setReceipt] = useState<any[] | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const { isOnline } = useOffline();

  useEffect(() => {
    if (!user) { router.push('/'); return; }
    loadData();
  }, [user, router]);

  const loadData = () => {
    setPendingSales(getPendingSales());
    Promise.all([salesAPI.list(), productsAPI.list()])
      .then(([sRes, pRes]) => {
        setSales(sRes.data);
        const activeProducts = pRes.data.filter((p: any) => p.is_active);
        setProducts(activeProducts);
        cacheProducts(activeProducts);
      })
      .catch(() => {
        const cached = getCachedProducts();
        if (cached.length > 0) setProducts(cached);
      })
      .finally(() => setLoading(false));
  };

  const paginatedSales = sales.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(sales.length / PAGE_SIZE));

  const filteredProducts = products.filter((p: any) =>
    !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cartTotal = cart.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQty = (productId: number, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity: qty } : i))
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setError('');
  };

  const handleCheckout = async () => {
    if (cart.length === 0) { setError('Panier vide'); return; }
    setSaving(true);
    setError('');

    const items = [...cart];
    const soldItems: any[] = [];

    if (!isOnline) {
      for (const item of items) {
        addPendingSale({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          payment_method: checkoutMethod,
          client_name: checkoutClient,
          total: item.product.selling_price * item.quantity,
        });
      }
      setSuccess(`${items.length} article(s) enregistré(s) (hors-ligne)`);
      setCart([]);
      setShowCheckout(false);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
      setSaving(false);
      return;
    }

    try {
      for (const item of items) {
        const res = await salesAPI.create({
          product: item.product.id,
          quantity: item.quantity,
          payment_method: checkoutMethod,
          client_name: checkoutClient,
        });
        soldItems.push({
          name: item.product.name,
          qty: item.quantity,
          price: item.product.selling_price,
          total: item.product.selling_price * item.quantity,
          unit_price: item.product.selling_price,
        });
      }
      setReceipt(soldItems);
      setSuccess('Vente(s) enregistrée(s) !');
      setCart([]);
      setShowCheckout(false);
      setCheckoutClient('');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.[0] || err.response?.data?.detail || "Erreur lors de la vente");
    } finally {
      setSaving(false);
    }
  };

  const printReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const shop = JSON.parse(localStorage.getItem('shop_settings') || '{}');
    const now = new Date().toLocaleString('fr-FR');
    printWindow.document.write(`
      <html><head><title>Reçu</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 10px; }
        h2 { text-align: center; margin: 0 0 5px; }
        .shop { text-align: center; font-size: 11px; margin-bottom: 10px; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 2px 0; }
        .right { text-align: right; }
        .total { font-weight: bold; font-size: 14px; }
        .footer { text-align: center; margin-top: 10px; font-size: 10px; }
        @media print { body { margin: 0; padding: 5px; } }
      </style></head><body>
      <h2>${shop.name || 'Ma Boutique'}</h2>
      <div class="shop">${shop.address || ''}<br/>${shop.phone || ''}</div>
      <div class="divider"></div>
      <div>${now}</div>
      <div class="divider"></div>
      <table>
        <tr><th>Article</th><th class="right">Qté</th><th class="right">P.U.</th><th class="right">Total</th></tr>
        ${receipt?.map(i => `
          <tr><td>${i.name}</td><td class="right">${i.qty}</td><td class="right">${Number(i.price).toLocaleString()}</td><td class="right">${Number(i.total).toLocaleString()}</td></tr>
        `).join('')}
      </table>
      <div class="divider"></div>
      <table>
        <tr><td class="total">Total</td><td class="right total">${receipt?.reduce((s, i) => s + i.total, 0).toLocaleString()} FCFA</td></tr>
        <tr><td>Paiement</td><td class="right">${checkoutMethod === 'cash' ? 'Espèces' : checkoutMethod === 'momo' ? 'Mobile Money' : 'Crédit'}</td></tr>
      </table>
      ${checkoutClient ? `<div class="divider"></div><div>Client: ${checkoutClient}</div>` : ''}
      <div class="divider"></div>
      <div class="footer">Merci de votre visite !</div>
      <script>window.print();window.close();</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  if (!user) return null;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Ventes</h1>
        <div className="flex gap-2">
          <input type="text" placeholder="Rechercher un produit..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-48 focus:border-blue-500 focus:outline-none" />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 border border-green-200">{success}</div>
      )}

      <div className="flex gap-6">
        <div className="flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-6">
            {filteredProducts.map((p: any) => {
              const inCart = cart.find((i) => i.product.id === p.id);
              return (
                <button key={p.id} onClick={() => addToCart(p)}
                  disabled={p.stock === 0}
                  className={`flex flex-col items-center p-3 rounded-xl text-sm font-medium transition-all ${
                    p.stock === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : inCart
                        ? 'bg-green-50 border-2 border-green-400 text-gray-800 shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-800 hover:bg-blue-50 hover:border-blue-300 shadow-sm'
                  }`}>
                  {p.photo ? (
                    <img src={mediaUrl(p.photo)!} alt={p.name}
                      className="w-12 h-12 rounded-lg object-cover mb-1" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs mb-1">📦</div>
                  )}
                  <span className="text-xs truncate w-full text-center">{p.name}</span>
                  <span className="text-xs font-bold">{Number(p.selling_price).toLocaleString()}</span>
                  <span className={`text-xs ${p.stock <= p.min_stock ? 'text-red-600' : 'text-green-600'}`}>
                    Stock: {p.stock}
                  </span>
                  {inCart && <span className="text-xs text-green-600 font-bold mt-1">x{inCart.quantity} ✓</span>}
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500">
                    <th className="p-3 font-medium">Produit</th>
                    <th className="p-3 font-medium">Quantité</th>
                    <th className="p-3 font-medium">Total</th>
                    <th className="p-3 font-medium">Paiement</th>
                    <th className="p-3 font-medium">Vendeur</th>
                    <th className="p-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSales.length === 0 ? (
                    <tr><td colSpan={6} className="p-6 text-center text-gray-400">Aucune vente</td></tr>
                  ) : paginatedSales.map((s: any) => (
                    <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-800">{s.product_name}</td>
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

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <p className="text-gray-500">{sales.length} vente(s) — Page {page + 1}/{totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors">← Précédent</button>
                <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors">Suivant →</button>
              </div>
            </div>
          )}

          {pendingSales.length > 0 && (
            <div className="mt-6 bg-yellow-50 rounded-xl shadow-sm border border-yellow-200 overflow-hidden">
              <div className="p-4 border-b border-yellow-200">
                <h2 className="font-semibold text-yellow-800 text-sm">⏳ Ventes en attente ({pendingSales.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-yellow-700">
                    <th className="p-3 font-medium">Produit</th><th className="p-3 font-medium">Qté</th>
                    <th className="p-3 font-medium">Total</th><th className="p-3 font-medium">Date</th>
                  </tr></thead>
                  <tbody>
                    {pendingSales.filter(s => !s.synced).map((s: any) => (
                      <tr key={s.id} className="border-t border-yellow-100">
                        <td className="p-3 text-yellow-800">{s.product_name}</td>
                        <td className="p-3">x{s.quantity}</td>
                        <td className="p-3 font-medium">{Number(s.total).toLocaleString()} FCFA</td>
                        <td className="p-3 text-yellow-600">{new Date(s.created_at).toLocaleString('fr-FR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="w-80 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">Panier ({cartCount})</h2>
              {cart.length > 0 && (
                <button onClick={clearCart} className="text-xs text-red-600 hover:text-red-800">Vider</button>
              )}
            </div>

            {cart.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Cliquez sur un produit pour l&apos;ajouter</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-400">{Number(item.product.selling_price).toLocaleString()} FCFA</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateCartQty(item.product.id, item.quantity - 1)}
                        className="w-6 h-6 rounded bg-gray-200 text-gray-600 text-xs hover:bg-gray-300">−</button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button onClick={() => updateCartQty(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                        className="w-6 h-6 rounded bg-gray-200 text-gray-600 text-xs hover:bg-gray-300 disabled:opacity-30">+</button>
                    </div>
                    <button onClick={() => removeFromCart(item.product.id)}
                      className="text-red-400 hover:text-red-600 text-xs">✕</button>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <>
                <div className="flex justify-between items-center py-3 border-t border-gray-200">
                  <span className="font-bold text-gray-800">Total</span>
                  <span className="font-bold text-lg text-blue-600">{cartTotal.toLocaleString()} FCFA</span>
                </div>
                <button onClick={() => { setShowCheckout(true); setCheckoutMethod('cash'); setCheckoutClient(''); }}
                  disabled={saving}
                  className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-colors">
                  {saving ? 'En cours...' : `Payer (${cartCount} article${cartCount > 1 ? 's' : ''})`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">Finaliser la vente</h2>
            <div className="space-y-3 mb-4">
              {cart.map((item) => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span>{item.product.name} x{item.quantity}</span>
                  <span className="font-medium">{(item.product.selling_price * item.quantity).toLocaleString()} FCFA</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span>{cartTotal.toLocaleString()} FCFA</span>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Mode de paiement</label>
                <select value={checkoutMethod} onChange={(e) => setCheckoutMethod(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="cash">Espèces</option>
                  <option value="momo">Mobile Money</option>
                  <option value="credit">À crédit</option>
                </select>
              </div>
              {(checkoutMethod === 'credit') && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Nom du client</label>
                  <input type="text" value={checkoutClient}
                    onChange={(e) => setCheckoutClient(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCheckout(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
              <button onClick={handleCheckout} disabled={saving}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50">
                {saving ? 'Enregistrement...' : `Confirmer (${cartTotal.toLocaleString()} FCFA)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {receipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4" ref={receiptRef}>
            <h2 className="text-lg font-semibold mb-2 text-center">🧾 Reçu de vente</h2>
            <p className="text-xs text-gray-400 text-center mb-4">{new Date().toLocaleString('fr-FR')}</p>
            <div className="border-t border-b border-dashed border-gray-300 py-3 mb-3 space-y-1">
              {receipt.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{item.name} x{item.qty}</span>
                  <span className="font-medium">{item.total.toLocaleString()} FCFA</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold text-lg mb-1">
              <span>Total</span>
              <span>{receipt.reduce((s, i) => s + i.total, 0).toLocaleString()} FCFA</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Paiement: {checkoutMethod === 'cash' ? 'Espèces' : checkoutMethod === 'momo' ? 'Mobile Money' : 'Crédit'}
              {checkoutClient ? ` — Client: ${checkoutClient}` : ''}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setReceipt(null)}
                className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Fermer</button>
              <button onClick={printReceipt}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">🖨️ Imprimer</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
