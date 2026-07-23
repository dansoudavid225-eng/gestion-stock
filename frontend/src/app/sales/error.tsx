'use client';

export default function SalesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="p-6">
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="mb-3 text-sm text-red-600">Erreur lors du chargement des ventes</p>
        <button onClick={reset}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 transition-colors">
          Réessayer
        </button>
      </div>
    </div>
  );
}
