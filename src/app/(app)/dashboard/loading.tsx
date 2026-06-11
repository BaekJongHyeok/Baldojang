export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-40 rounded bg-stone-200" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-stone-200" />
        ))}
      </div>
      <div className="mt-4 h-24 rounded-2xl bg-stone-200" />
      <div className="mt-6 h-5 w-24 rounded bg-stone-200" />
      <div className="mt-3 flex flex-col gap-1.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-stone-200" />
        ))}
      </div>
    </div>
  );
}
