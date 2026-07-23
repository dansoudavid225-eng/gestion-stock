'use client';

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold text-gray-800">Une erreur est survenue</h1>
        <p className="mb-6 text-sm text-gray-500">{error.message || 'Erreur inattendue'}</p>
        <button onClick={reset}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 transition-colors">
          Réessayer
        </button>
      </div>
    </div>
  );
}
