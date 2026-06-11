"use client";

import { useState, useMemo } from "react";
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subMonths, startOfYear, format, eachDayOfInterval,
} from "date-fns";
import { kstDateStr } from "@/lib/calendar-utils";

type Payment = {
  amount: number;
  method: string;
  paid_at: string;
  serviceName: string;
};

const RANGES = [
  { key: "today", label: "오늘" },
  { key: "week", label: "이번 주" },
  { key: "month", label: "이번 달" },
  { key: "3month", label: "3개월" },
  { key: "6month", label: "6개월" },
  { key: "year", label: "올해" },
] as const;

const METHOD_LABELS: Record<string, string> = {
  card: "카드", cash: "현금", transfer: "계좌이체", pass: "선불권",
};

function rangeToInterval(key: string, today: string): { from: string; to: string } {
  const base = new Date(today + "T00:00:00Z");
  const to = today;
  switch (key) {
    case "today": return { from: today, to };
    case "week": return { from: format(startOfWeek(base, { weekStartsOn: 1 }), "yyyy-MM-dd"), to: format(endOfWeek(base, { weekStartsOn: 1 }), "yyyy-MM-dd") };
    case "month": return { from: format(startOfMonth(base), "yyyy-MM-dd"), to: format(endOfMonth(base), "yyyy-MM-dd") };
    case "3month": return { from: format(subMonths(base, 3), "yyyy-MM-dd"), to };
    case "6month": return { from: format(subMonths(base, 6), "yyyy-MM-dd"), to };
    case "year": return { from: format(startOfYear(base), "yyyy-MM-dd"), to };
    default: return { from: format(subMonths(base, 12), "yyyy-MM-dd"), to };
  }
}

export function ReportsClient({ payments, today }: { payments: Payment[]; today: string }) {
  const [range, setRange] = useState("week");

  const { from, to } = useMemo(() => rangeToInterval(range, today), [range, today]);

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const d = kstDateStr(p.paid_at);
      return d >= from && d <= to;
    });
  }, [payments, from, to]);

  const totalRevenue = useMemo(() => filtered.reduce((s, r) => s + r.amount, 0), [filtered]);
  const avgPerVisit = useMemo(() => filtered.length > 0 ? Math.round(totalRevenue / filtered.length) : 0, [totalRevenue, filtered]);

  const serviceStats = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    for (const r of filtered) {
      if (!map[r.serviceName]) map[r.serviceName] = { count: 0, revenue: 0 };
      map[r.serviceName].count++;
      map[r.serviceName].revenue += r.amount;
    }
    return Object.entries(map).map(([name, s]) => ({ name, ...s })).sort((a, b) => b.revenue - a.revenue);
  }, [filtered]);

  const methodStats = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of filtered) map[r.method] = (map[r.method] ?? 0) + r.amount;
    return Object.entries(map).map(([method, amount]) => ({ method, label: METHOD_LABELS[method] ?? method, amount }));
  }, [filtered]);

  const { dailyData, maxDaily } = useMemo(() => {
    const days = eachDayOfInterval({ start: new Date(from + "T00:00:00Z"), end: new Date(to + "T00:00:00Z") });
    const map: Record<string, number> = {};
    for (const r of filtered) {
      const d = kstDateStr(r.paid_at);
      map[d] = (map[d] ?? 0) + r.amount;
    }
    const data = days.map((d) => {
      const key = format(d, "yyyy-MM-dd");
      return { date: key, label: format(d, "M/d"), amount: map[key] ?? 0 };
    });
    return { dailyData: data, maxDaily: Math.max(1, ...data.map((d) => d.amount)) };
  }, [filtered, from, to]);

  // 일별 막대가 너무 많으면 (60일 이상) 주간으로 그룹핑
  const showDailyChart = dailyData.length <= 60;

  return (
    <div>
      <h1 className="text-xl font-bold text-stone-900">매출 리포트</h1>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {RANGES.map((r) => (
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

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-white p-4 shadow-sm text-center">
          <p className="text-xl font-bold text-stone-900">₩{totalRevenue.toLocaleString()}</p>
          <p className="text-[11px] text-stone-500">총 매출</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm text-center">
          <p className="text-xl font-bold text-stone-900">{filtered.length}</p>
          <p className="text-[11px] text-stone-500">결제 건수</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm text-center">
          <p className="text-xl font-bold text-stone-900">₩{avgPerVisit.toLocaleString()}</p>
          <p className="text-[11px] text-stone-500">평균 객단가</p>
        </div>
      </div>

      {showDailyChart && dailyData.length > 1 && (
        <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-stone-500">일별 매출</p>
          <div className="mt-3 flex items-end gap-px overflow-x-auto" style={{ height: 120 }}>
            {dailyData.map((d) => (
              <div key={d.date} className="flex min-w-[12px] flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-stone-800"
                  style={{ height: `${(d.amount / maxDaily) * 100}px`, minHeight: d.amount > 0 ? 4 : 0 }}
                />
                {dailyData.length <= 14 && (
                  <span className="text-[9px] text-stone-400">{d.label}</span>
                )}
              </div>
            ))}
          </div>
          {dailyData.length > 14 && (
            <div className="mt-1 flex justify-between text-[9px] text-stone-400">
              <span>{dailyData[0].label}</span>
              <span>{dailyData[dailyData.length - 1].label}</span>
            </div>
          )}
        </div>
      )}

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

      {filtered.length === 0 && (
        <p className="mt-8 text-center text-sm text-stone-400">해당 기간의 결제 기록이 없습니다</p>
      )}
    </div>
  );
}
