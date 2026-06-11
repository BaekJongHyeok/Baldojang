export default function ReportsLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-32 rounded bg-stone-200" />
      <div className="mt-4 flex gap-1.5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-8 w-16 rounded-lg bg-stone-200" />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-stone-200" />
        ))}
      </div>
      <div className="mt-6 h-36 rounded-2xl bg-stone-200" />
      <div className="mt-4 h-28 rounded-2xl bg-stone-200" />
    </div>
  );
}
