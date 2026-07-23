export default function CreditsLoading() {
  return (
    <div className="p-6">
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-xl bg-gray-200" />
    </div>
  );
}
