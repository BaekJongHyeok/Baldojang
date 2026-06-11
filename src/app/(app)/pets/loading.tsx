export default function PetsLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-6 w-12 rounded bg-warm-200" />
        <div className="h-9 w-24 rounded-button bg-warm-200" />
      </div>
      <div className="mt-4 h-10 w-full rounded-input bg-warm-200" />
      <div className="mt-4 flex flex-col gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3.5 rounded-card bg-surface-card p-4">
            <div className="h-14 w-14 shrink-0 rounded-full bg-warm-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 rounded bg-warm-200" />
              <div className="h-3 w-36 rounded bg-warm-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
