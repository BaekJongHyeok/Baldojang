export default function PetsLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-6 w-12 rounded bg-border" />
        <div className="h-9 w-24 rounded-md bg-border" />
      </div>
      <div className="mt-4 h-9 w-full rounded-md bg-border" />
      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-white">
        <div className="border-b border-border bg-border-light px-4 py-2.5"><div className="h-3 w-full rounded bg-border" /></div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border-b border-border-light px-4 py-3"><div className="h-4 w-full rounded bg-border-light" /></div>
        ))}
      </div>
    </div>
  );
}
