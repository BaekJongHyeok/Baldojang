export default function PetChartLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-16 rounded bg-border" />
      <div className="mt-3 grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-border" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-20 rounded bg-border" />
                <div className="h-3 w-32 rounded bg-border-light" />
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-white p-4">
            <div className="h-3 w-16 rounded bg-border" />
            <div className="mt-2 space-y-1.5">
              <div className="h-4 w-full rounded bg-border-light" />
              <div className="h-4 w-full rounded bg-border-light" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-white">
          <div className="border-b border-border px-4 py-3"><div className="h-4 w-20 rounded bg-border" /></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-b border-border-light px-4 py-3"><div className="h-4 w-full rounded bg-border-light" /></div>
          ))}
        </div>
      </div>
    </div>
  );
}
