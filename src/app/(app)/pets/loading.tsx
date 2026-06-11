export default function PetsLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-16 rounded bg-stone-200" />
        <div className="h-9 w-24 rounded-xl bg-stone-200" />
      </div>
      <div className="mt-4 h-10 rounded-xl bg-stone-200" />
      <div className="mt-4 flex flex-col gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl bg-stone-100 p-4">
            <div className="h-12 w-12 rounded-full bg-stone-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 rounded bg-stone-200" />
              <div className="h-3 w-40 rounded bg-stone-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
