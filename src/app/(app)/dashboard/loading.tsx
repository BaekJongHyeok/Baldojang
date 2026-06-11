export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-6 w-28 rounded bg-border" />
      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="bg-white px-4 py-3"><div className="h-3 w-12 rounded bg-border" /><div className="mt-2 h-6 w-16 rounded bg-border" /></div>)}
      </div>
      <div className="mt-5 rounded-lg border border-border bg-white">
        <div className="border-b border-border px-4 py-3"><div className="h-4 w-20 rounded bg-border" /></div>
        {[1, 2, 3].map((i) => <div key={i} className="border-b border-border-light px-4 py-3"><div className="h-4 w-full rounded bg-border-light" /></div>)}
      </div>
    </div>
  );
}
