"use client";

import { useRouter } from "next/navigation";

type Props = {
  range: string;
  from: string;
  to: string;
  totalRevenue: number;
  totalCount: number;
  avgPerVisit: number;
  serviceStats: { name: string; count: number; revenue: number }[];
  methodStats: { method: string; label: string; amount: number }[];
  dailyData: { date: string; label: string; amount: number }[];
  maxDaily: number;
};

export function ReportsClient({
  range,
  from,
  to,
  totalRevenue,
  totalCount,
  avgPerVisit,
  serviceStats,
  methodStats,
  dailyData,
  maxDaily,
}: Props) {
  const router = useRouter();

  function setRange(r: string) {
    router.push(`/reports?range=${r}`);
  }

  const ranges = [
    { key: "today", label: "오늘" },
    { key: "week", label: "이번 주" },
    { key: "month", label: "이번 달" },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-stone-900">매출 리포트</h1>

      {/* 기간 선택 */}
      <div className="mt-4 flex gap-1.5">
        {ranges.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              range === r.key ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-stone-400">{from} ~ {to}</p>

      {/* 요약 */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-white p-4 shadow-sm text-center">
          <p className="text-xl font-bold text-stone-900">₩{totalRevenue.toLocaleString()}</p>
          <p className="text-[11px] text-stone-500">총 매출</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm text-center">
          <p className="text-xl font-bold text-stone-900">{totalCount}</p>
          <p className="text-[11px] text-stone-500">결제 건수</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm text-center">
          <p className="text-xl font-bold text-stone-900">₩{avgPerVisit.toLocaleString()}</p>
          <p className="text-[11px] text-stone-500">평균 객단가</p>
        </div>
      </div>

      {/* 일별 추이 */}
      {dailyData.length > 1 && (
        <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-stone-500">일별 매출</p>
          <div className="mt-3 flex items-end gap-1" style={{ height: 120 }}>
            {dailyData.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-stone-800 transition-all"
                  style={{ height: `${(d.amount / maxDaily) * 100}px`, minHeight: d.amount > 0 ? 4 : 0 }}
                />
                <span className="text-[9px] text-stone-400">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 시술별 */}
      {serviceStats.length > 0 && (
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-stone-500">시술별 매출</p>
          <div className="mt-3 flex flex-col gap-2">
            {serviceStats.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <span className="text-stone-700">{s.name} <span className="text-xs text-stone-400">({s.count}건)</span></span>
                <span className="font-medium text-stone-900">₩{s.revenue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 결제수단별 */}
      {methodStats.length > 0 && (
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-stone-500">결제 수단</p>
          <div className="mt-3 flex flex-col gap-2">
            {methodStats.map((m) => (
              <div key={m.method} className="flex items-center justify-between text-sm">
                <span className="text-stone-700">{m.label}</span>
                <span className="font-medium text-stone-900">₩{m.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalCount === 0 && (
        <p className="mt-8 text-center text-sm text-stone-400">해당 기간의 결제 기록이 없습니다</p>
      )}
    </div>
  );
}
