export default function DashboardLoading() {
  return (
    <div className="p-6">
      <div className="mb-6 h-8 w-64 animate-pulse rounded bg-gray-200" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-200" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-gray-200 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-40 animate-pulse rounded-xl bg-gray-200" />
        <div className="h-40 animate-pulse rounded-xl bg-gray-200" />
      </div>
    </div>
  );
}
