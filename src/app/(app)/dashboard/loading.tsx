export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      {/* 날짜 */}
      <div className="h-4 w-36 rounded bg-warm-200" />

      {/* 히어로 카드 */}
      <div className="mt-3 rounded-card bg-surface-card p-5">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 shrink-0 rounded-full bg-warm-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-16 rounded bg-warm-200" />
            <div className="h-5 w-24 rounded bg-warm-200" />
            <div className="h-3.5 w-32 rounded bg-warm-200" />
          </div>
        </div>
      </div>

      {/* 타임라인 */}
      <div className="mt-6">
        <div className="h-3.5 w-16 rounded bg-warm-200" />
        <div className="mt-3 flex flex-col gap-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-card bg-surface-card" />
          ))}
        </div>
      </div>

      {/* 보조 카드 */}
      <div className="mt-6 grid grid-cols-2 gap-2">
        <div className="h-20 rounded-card bg-surface-card" />
        <div className="h-20 rounded-card bg-surface-card" />
      </div>
    </div>
  );
}
