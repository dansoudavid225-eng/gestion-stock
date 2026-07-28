'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ReactNode, useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: '📊' },
  { href: '/products', label: 'Produits', icon: '📦' },
  { href: '/sales', label: 'Ventes', icon: '🛒' },
  { href: '/credits', label: 'Crédits', icon: '💰', gerantOnly: true },
  { href: '/customers', label: 'Clients', icon: '👥' },
  { href: '/inventory/losses', label: 'Pertes', icon: '⚠️', gerantOnly: true },
  { href: '/inventory/adjustments', label: 'Ajustements', icon: '🔧', gerantOnly: true },
  { href: '/inventory/stock-entries', label: 'Entrées stock', icon: '📥', gerantOnly: true },
  { href: '/rapports', label: 'Rapports', icon: '📄' },
  { href: '/users', label: 'Utilisateurs', icon: '👤', gerantOnly: true },
  { href: '/params', label: 'Paramètres', icon: '⚙️', gerantOnly: true },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout, isGerant } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const visibleItems = navItems.filter((item) => !item.gerantOnly || isGerant);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="flex min-h-screen">
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Gestion Stock</h2>
          <p className="text-xs text-gray-400">{user?.username}</p>
        </div>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Ouvrir le menu"
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <span className="text-2xl leading-none">{menuOpen ? '✕' : '☰'}</span>
        </button>
      </header>

      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={closeMenu}
        />
      )}

      <aside
        className={`bg-white border-r border-gray-200 flex flex-col w-64 fixed md:static inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out
        ${menuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="p-4 border-b border-gray-200 hidden md:block">
          <h2 className="text-lg font-bold text-gray-800">Gestion Stock</h2>
          <p className="text-xs text-gray-400">{user?.username}</p>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto mt-14 md:mt-0">
          {visibleItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-2 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <span>🚪</span>
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-gray-50 mt-14 md:mt-0 w-full">
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
