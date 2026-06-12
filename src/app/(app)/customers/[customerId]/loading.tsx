export default function CustomerLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-16 rounded bg-border" />
      <div className="mt-3 grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-white p-5">
            <div className="h-6 w-24 rounded bg-border" />
            <div className="mt-3 space-y-2">
              <div className="h-4 w-full rounded bg-border-light" />
              <div className="h-4 w-3/4 rounded bg-border-light" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 flex-1 rounded-md bg-border" />
            <div className="h-10 flex-1 rounded-md bg-border" />
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
