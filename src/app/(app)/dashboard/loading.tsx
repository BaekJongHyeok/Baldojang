export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      {/* 날짜 */}
      <div className="h-4 w-36 rounded bg-warm-200" />

      {/* 히어로 카드 */}
      <div className="mt-3 flex flex-col items-center rounded-card border border-accent/10 bg-accent-subtle px-6 pt-8 pb-7">
        <div className="h-[72px] w-[72px] rounded-full bg-warm-200" />
        <div className="mt-4 h-7 w-24 rounded bg-warm-200" />
        <div className="mt-2 h-7 w-20 rounded bg-warm-200" />
        <div className="mt-3 h-4 w-36 rounded bg-warm-200" />
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
