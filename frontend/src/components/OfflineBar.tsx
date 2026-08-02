'use client';

import { useOffline } from '@/context/OfflineContext';

export default function OfflineBar() {
  const { isOnline, pendingCount, failedCount, syncing, sync, lastSync } = useOffline();

  if (isOnline && pendingCount === 0 && failedCount === 0) return null;

  return (
    <>
      <div className={`px-4 py-2 text-sm font-medium text-center ${isOnline ? 'bg-yellow-50 text-yellow-800 border-b border-yellow-200' : 'bg-red-50 text-red-700 border-b border-red-200'}`}>
        {!isOnline ? (
          <span>🔴 Vous êtes hors-ligne. Les ventes seront synchronisées automatiquement.</span>
        ) : pendingCount > 0 ? (
          <span className="flex items-center justify-center gap-2">
            🟡 {pendingCount} vente(s) en attente de synchronisation
            <button onClick={sync} disabled={syncing}
              className="ml-2 rounded bg-yellow-200 px-3 py-0.5 text-xs font-semibold hover:bg-yellow-300 disabled:opacity-50">
              {syncing ? 'Synchro...' : 'Synchro'}
            </button>
            {lastSync && <span className="text-xs text-gray-400">Dernière sync: {lastSync.toLocaleTimeString()}</span>}
          </span>
        ) : null}
      </div>
      {failedCount > 0 && (
        <div className="px-4 py-2 text-sm font-medium text-center bg-red-50 text-red-700 border-b border-red-200">
          ⚠️ {failedCount} vente(s) n'ont pas pu être synchronisées après plusieurs essais. Vérifiez-les (stock ou produit peut-être invalide).
        </div>
      )}
    </>
  );
}
