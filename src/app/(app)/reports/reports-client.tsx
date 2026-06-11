"use client";

import { useState, useMemo } from "react";
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subMonths, startOfYear, format, eachDayOfInterval,
} from "date-fns";
import { kstDateStr, formatTimestampKST } from "@/lib/calendar-utils";

type Payment = {
  amount: number;
  method: string;
  paid_at: string;
  serviceName: string;
  petName: string;
  hasVisit: boolean;
};

type Reservation = { starts_at: string; status: string };
type PassDeduction = { delta: number; created_at: string; passType: string };

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

function rangeToInterval(key: string, today: string) {
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

function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsClient({
  payments,
  reservations,
  newPetsCount,
  passDeductions,
  unusedPassBalance,
  today,
}: {
  payments: Payment[];
  reservations: Reservation[];
  newPetsCount: number;
  passDeductions: PassDeduction[];
  unusedPassBalance: number;
  today: string;
}) {
  const [tab, setTab] = useState<"revenue" | "closing">("revenue");
  const [range, setRange] = useState("week");
  const [closingMonth, setClosingMonth] = useState(() => {
    const prev = subMonths(new Date(today + "T00:00:00Z"), 1);
    return format(prev, "yyyy-MM");
  });

  // === 매출 탭 ===
  const { from, to } = useMemo(() => rangeToInterval(range, today), [range, today]);
  const filtered = useMemo(() => payments.filter((p) => { const d = kstDateStr(p.paid_at); return d >= from && d <= to; }), [payments, from, to]);
  const servicePayments = useMemo(() => filtered.filter((r) => r.hasVisit), [filtered]);
  const prepaidSales = useMemo(() => filtered.filter((r) => !r.hasVisit), [filtered]);
  const totalRevenue = useMemo(() => servicePayments.reduce((s, r) => s + r.amount, 0), [servicePayments]);
  const avgPerVisit = useMemo(() => servicePayments.length > 0 ? Math.round(totalRevenue / servicePayments.length) : 0, [totalRevenue, servicePayments]);
  const passUsageCount = useMemo(() => servicePayments.filter((r) => r.method === "pass").length, [servicePayments]);
  const prepaidTotal = useMemo(() => prepaidSales.reduce((s, r) => s + r.amount, 0), [prepaidSales]);

  const serviceStats = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    for (const r of servicePayments) { if (!map[r.serviceName]) map[r.serviceName] = { count: 0, revenue: 0 }; map[r.serviceName].count++; map[r.serviceName].revenue += r.amount; }
    return Object.entries(map).map(([name, s]) => ({ name, ...s })).sort((a, b) => b.revenue - a.revenue);
  }, [servicePayments]);

  const methodStats = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of servicePayments) map[r.method] = (map[r.method] ?? 0) + r.amount;
    return Object.entries(map).map(([method, amount]) => ({ method, label: METHOD_LABELS[method] ?? method, amount }));
  }, [servicePayments]);

  const { dailyData, maxDaily } = useMemo(() => {
    const days = eachDayOfInterval({ start: new Date(from + "T00:00:00Z"), end: new Date(to + "T00:00:00Z") });
    const map: Record<string, number> = {};
    for (const r of servicePayments) { const d = kstDateStr(r.paid_at); map[d] = (map[d] ?? 0) + r.amount; }
    const data = days.map((d) => { const key = format(d, "yyyy-MM-dd"); return { date: key, label: format(d, "M/d"), amount: map[key] ?? 0 }; });
    return { dailyData: data, maxDaily: Math.max(1, ...data.map((d) => d.amount)) };
  }, [servicePayments, from, to]);

  // === 월 마감 ===
  const closingFrom = closingMonth + "-01";
  const closingTo = format(endOfMonth(new Date(closingMonth + "-01T00:00:00Z")), "yyyy-MM-dd");
  const closingPayments = useMemo(() => payments.filter((p) => { const d = kstDateStr(p.paid_at); return d >= closingFrom && d <= closingTo; }), [payments, closingFrom, closingTo]);
  const closingService = useMemo(() => closingPayments.filter((p) => p.hasVisit), [closingPayments]);
  const closingPrepaid = useMemo(() => closingPayments.filter((p) => !p.hasVisit), [closingPayments]);
  const closingRevenue = useMemo(() => closingService.reduce((s, r) => s + r.amount, 0), [closingService]);
  const closingMethodStats = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of closingService) map[r.method] = (map[r.method] ?? 0) + r.amount;
    return Object.entries(map).map(([m, a]) => ({ method: m, label: METHOD_LABELS[m] ?? m, amount: a }));
  }, [closingService]);

  const closingPrepaidTotal = useMemo(() => closingPrepaid.reduce((s, r) => s + r.amount, 0), [closingPrepaid]);
  const closingDeductionData = useMemo(() => {
    const inRange = passDeductions.filter((d) => { const dt = kstDateStr(d.created_at); return dt >= closingFrom && dt <= closingTo; });
    const amountTotal = inRange.filter((d) => d.passType === "amount").reduce((s, d) => s + Math.abs(d.delta), 0);
    const countTotal = inRange.filter((d) => d.passType === "count").reduce((s, d) => s + Math.abs(d.delta), 0);
    return { amountTotal, countTotal };
  }, [passDeductions, closingFrom, closingTo]);

  const closingRes = useMemo(() => reservations.filter((r) => { const d = kstDateStr(r.starts_at); return d >= closingFrom && d <= closingTo; }), [reservations, closingFrom, closingTo]);
  const completedCount = closingRes.filter((r) => r.status === "completed").length;
  const noShowCount = closingRes.filter((r) => r.status === "no_show").length;
  const cancelledCount = closingRes.filter((r) => r.status === "cancelled").length;
  const noShowRate = completedCount + noShowCount > 0 ? Math.round((noShowCount / (completedCount + noShowCount)) * 100) : 0;

  const closingPetsCount = useMemo(() => {
    // newPetsCount는 12개월 전체이므로 월별 필터 불가 — 전체 표시
    return newPetsCount;
  }, [newPetsCount]);

  // 월 선택 옵션
  const monthOptions = useMemo(() => {
    const opts: string[] = [];
    const base = new Date(today + "T00:00:00Z");
    for (let i = 1; i <= 12; i++) {
      opts.push(format(subMonths(base, i), "yyyy-MM"));
    }
    opts.unshift(format(base, "yyyy-MM"));
    return [...new Set(opts)];
  }, [today]);

  // CSV
  function exportPaymentsCsv() {
    const target = tab === "closing" ? closingPayments : filtered;
    const header = "구분,일시,이름,시술/항목,결제수단,금액";
    const rows = target.map((p) =>
      `${p.hasVisit ? "시술" : "선불권 판매"},${formatTimestampKST(p.paid_at, "yyyy-MM-dd HH:mm")},${p.petName},${p.serviceName},${METHOD_LABELS[p.method] ?? p.method},${p.amount}`
    );
    downloadCsv(`결제내역_${tab === "closing" ? closingMonth : from}_${to}.csv`, [header, ...rows].join("\n"));
  }

  function exportClosingSummaryCsv() {
    const lines = [
      `월 마감 요약,${closingMonth}`,
      "",
      "시술 매출," + closingRevenue,
      ...closingMethodStats.map((m) => `  ${m.label},${m.amount}`),
      "",
      "선불권 판매(선수금)," + closingPrepaidTotal,
      "선불권 차감(매출인식)," + closingDeductionData.amountTotal,
      "횟수권 차감," + closingDeductionData.countTotal + "회",
      "미사용 잔액(부채)," + unusedPassBalance,
      "",
      "완료," + completedCount + "건",
      "노쇼," + noShowCount + "건",
      "노쇼율," + noShowRate + "%",
      "취소," + cancelledCount + "건",
    ];
    downloadCsv(`월마감_${closingMonth}.csv`, lines.join("\n"));
  }

  const showDailyChart = dailyData.length <= 60 && dailyData.length > 1;

  return (
    <div className="print:mx-0 print:p-0">
      {/* 탭 + CSV 버튼 */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex rounded-lg bg-stone-100 p-0.5">
          <button onClick={() => setTab("revenue")} className={`rounded-md px-3 py-1 text-xs font-medium transition ${tab === "revenue" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}>매출</button>
          <button onClick={() => setTab("closing")} className={`rounded-md px-3 py-1 text-xs font-medium transition ${tab === "closing" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}>월 마감</button>
        </div>
        <div className="flex gap-1.5">
          <button onClick={exportPaymentsCsv} className="rounded-lg border border-stone-200 px-2.5 py-1 text-[11px] font-medium text-stone-600 hover:bg-stone-50">CSV 결제내역</button>
          {tab === "closing" && (
            <button onClick={exportClosingSummaryCsv} className="rounded-lg border border-stone-200 px-2.5 py-1 text-[11px] font-medium text-stone-600 hover:bg-stone-50">CSV 월마감</button>
          )}
        </div>
      </div>

      {tab === "revenue" ? (
        <div>
          <h1 className="mt-3 text-xl font-bold text-stone-900 print:mt-0">매출 리포트</h1>

          <div className="mt-4 flex flex-wrap gap-1.5 print:hidden">
            {RANGES.map((r) => (
              <button key={r.key} onClick={() => setRange(r.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${range === r.key ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}>{r.label}</button>
            ))}
          </div>
          <p className="mt-2 text-xs text-stone-400">{from} ~ {to}</p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <SummaryCard value={`₩${totalRevenue.toLocaleString()}`} label="시술 매출" />
            <SummaryCard value={String(servicePayments.length)} label="결제 건수" />
            <SummaryCard value={`₩${avgPerVisit.toLocaleString()}`} label="평균 객단가" />
          </div>

          {(prepaidTotal > 0 || prepaidSales.length > 0 || passUsageCount > 0) && (
            <Section title="선불권">
              {prepaidSales.length > 0 && <Row label={`선불권 판매 (${prepaidSales.length}건)`} value={`₩${prepaidTotal.toLocaleString()}`} />}
              {passUsageCount > 0 && <Row label="횟수권 사용" value={`${passUsageCount}건`} />}
            </Section>
          )}

          {showDailyChart && (
            <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs font-bold text-stone-500">일별 매출</p>
              <div className="mt-3 flex items-end gap-px overflow-x-auto" style={{ height: 120 }}>
                {dailyData.map((d) => (
                  <div key={d.date} className="flex min-w-[12px] flex-1 flex-col items-center gap-1">
                    <div className="w-full rounded-t bg-stone-800" style={{ height: `${(d.amount / maxDaily) * 100}px`, minHeight: d.amount > 0 ? 4 : 0 }} />
                    {dailyData.length <= 14 && <span className="text-[9px] text-stone-400">{d.label}</span>}
                  </div>
                ))}
              </div>
              {dailyData.length > 14 && (
                <div className="mt-1 flex justify-between text-[9px] text-stone-400">
                  <span>{dailyData[0].label}</span><span>{dailyData[dailyData.length - 1].label}</span>
                </div>
              )}
            </div>
          )}

          {serviceStats.length > 0 && (
            <Section title="시술별 매출">
              {serviceStats.map((s) => <Row key={s.name} label={`${s.name} (${s.count}건)`} value={`₩${s.revenue.toLocaleString()}`} />)}
            </Section>
          )}

          {methodStats.length > 0 && (
            <Section title="결제 수단">
              {methodStats.map((m) => <Row key={m.method} label={m.label} value={`₩${m.amount.toLocaleString()}`} />)}
            </Section>
          )}

          {filtered.length === 0 && prepaidSales.length === 0 && (
            <p className="mt-8 text-center text-sm text-stone-400">해당 기간의 결제 기록이 없습니다</p>
          )}
        </div>
      ) : (
        /* 월 마감 탭 */
        <div>
          <div className="mt-3 flex items-center gap-3">
            <h1 className="text-xl font-bold text-stone-900">월 마감 요약</h1>
            <select value={closingMonth} onChange={(e) => setClosingMonth(e.target.value)}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm outline-none print:hidden">
              {monthOptions.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <p className="mt-1 text-xs text-stone-400 print:hidden">{closingFrom} ~ {closingTo}</p>
          <p className="hidden text-sm text-stone-500 print:block">{closingFrom} ~ {closingTo}</p>

          {/* 시술 매출 */}
          <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm print:shadow-none print:border print:border-stone-200">
            <p className="text-xs font-bold text-stone-500">시술 매출</p>
            <p className="mt-2 text-2xl font-bold text-stone-900">₩{closingRevenue.toLocaleString()}</p>
            <div className="mt-3 flex flex-col gap-1.5">
              {closingMethodStats.map((m) => <Row key={m.method} label={m.label} value={`₩${m.amount.toLocaleString()}`} />)}
            </div>
          </div>

          {/* 선불권 */}
          <Section title="선불권">
            <Row label="판매액 (선수금 유입)" value={`₩${closingPrepaidTotal.toLocaleString()}`} />
            <Row label="차감액 (매출 인식)" value={`₩${closingDeductionData.amountTotal.toLocaleString()}`} />
            {closingDeductionData.countTotal > 0 && (
              <Row label="횟수권 차감" value={`${closingDeductionData.countTotal}회`} />
            )}
            <Row label="미사용 잔액 총계 (부채)" value={`₩${unusedPassBalance.toLocaleString()}`} bold />
          </Section>

          {/* 운영 지표 */}
          <Section title="운영 지표">
            <Row label="완료" value={`${completedCount}건`} />
            <Row label="노쇼" value={`${noShowCount}건 (${noShowRate}%)`} />
            <Row label="취소" value={`${cancelledCount}건`} />
          </Section>

          {closingPayments.length === 0 && closingRes.length === 0 && (
            <p className="mt-8 text-center text-sm text-stone-400">해당 월의 데이터가 없습니다</p>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm text-center print:shadow-none print:border print:border-stone-200">
      <p className="text-xl font-bold text-stone-900">{value}</p>
      <p className="text-[11px] text-stone-500">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm print:shadow-none print:border print:border-stone-200">
      <p className="text-xs font-bold text-stone-500">{title}</p>
      <div className="mt-3 flex flex-col gap-2 text-sm">{children}</div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-stone-700">{label}</span>
      <span className={`${bold ? "font-bold" : "font-medium"} text-stone-900`}>{value}</span>
    </div>
  );
}
