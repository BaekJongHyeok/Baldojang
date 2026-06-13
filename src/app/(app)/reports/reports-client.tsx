"use client";

import { useState, useMemo, useCallback } from "react";
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subMonths, startOfYear, format, eachDayOfInterval,
  eachWeekOfInterval, getDay,
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
type PassLog = { delta: number; created_at: string; passType: string };

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
  passLogs,
  unusedPassBalance,
  today,
}: {
  payments: Payment[];
  reservations: Reservation[];
  newPetsCount: number;
  passLogs: PassLog[];
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
  // 매출 탭 보너스: 해당 기간 충전 총액(pass_log) - 결제 총액(payment)
  const prepaidBonusAmount = useMemo(() => {
    const totalLoaded = passLogs
      .filter((l) => l.passType === "amount" && l.delta > 0)
      .filter((l) => { const d = kstDateStr(l.created_at); return d >= from && d <= to; })
      .reduce((s, l) => s + l.delta, 0);
    return totalLoaded - prepaidTotal;
  }, [passLogs, from, to, prepaidTotal]);

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

  type ChartBucket = { key: string; label: string; amount: number; count: number; isToday: boolean; isWeekend: boolean };

  const { chartData, maxAmount, gridLines, aggregation } = useMemo(() => {
    const startDate = new Date(from + "T00:00:00Z");
    const endDate = new Date(to + "T00:00:00Z");
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const totalDays = days.length;

    // payment별 날짜 → 금액/건수
    const dayAmountMap: Record<string, number> = {};
    const dayCountMap: Record<string, number> = {};
    for (const r of servicePayments) {
      const d = kstDateStr(r.paid_at);
      dayAmountMap[d] = (dayAmountMap[d] ?? 0) + r.amount;
      dayCountMap[d] = (dayCountMap[d] ?? 0) + 1;
    }

    let data: ChartBucket[];
    let agg: "daily" | "weekly" | "monthly";

    if (totalDays <= 31) {
      // 일별
      agg = "daily";
      data = days.map((d) => {
        const key = format(d, "yyyy-MM-dd");
        const dow = getDay(d);
        return { key, label: format(d, "M/d"), amount: dayAmountMap[key] ?? 0, count: dayCountMap[key] ?? 0, isToday: key === today, isWeekend: dow === 0 || dow === 6 };
      });
    } else if (totalDays <= 120) {
      // 주별
      agg = "weekly";
      const weekStarts = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
      data = weekStarts.map((ws) => {
        const we = endOfWeek(ws, { weekStartsOn: 1 });
        const wLabel = `${format(ws, "M/d")}~`;
        let amount = 0, count = 0;
        const wDays = eachDayOfInterval({ start: ws > startDate ? ws : startDate, end: we < endDate ? we : endDate });
        for (const d of wDays) {
          const k = format(d, "yyyy-MM-dd");
          amount += dayAmountMap[k] ?? 0;
          count += dayCountMap[k] ?? 0;
        }
        const todayInWeek = wDays.some((d) => format(d, "yyyy-MM-dd") === today);
        return { key: format(ws, "yyyy-MM-dd"), label: wLabel, amount, count, isToday: todayInWeek, isWeekend: false };
      });
    } else {
      // 월별
      agg = "monthly";
      const monthMap: Record<string, { amount: number; count: number }> = {};
      for (const d of days) {
        const mKey = format(d, "yyyy-MM");
        if (!monthMap[mKey]) monthMap[mKey] = { amount: 0, count: 0 };
        const dKey = format(d, "yyyy-MM-dd");
        monthMap[mKey].amount += dayAmountMap[dKey] ?? 0;
        monthMap[mKey].count += dayCountMap[dKey] ?? 0;
      }
      const todayMonth = today.slice(0, 7);
      data = Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b)).map(([mKey, v]) => ({
        key: mKey, label: mKey.slice(5) + "월", amount: v.amount, count: v.count, isToday: mKey === todayMonth, isWeekend: false,
      }));
    }

    const rawMax = Math.max(1, ...data.map((d) => d.amount));
    const max = niceMax(rawMax);

    // 3 grid lines: 0, mid, max
    const mid = Math.round(max / 2);
    const lines = [0, mid, max];

    return { chartData: data, maxAmount: max, gridLines: lines, aggregation: agg };
  }, [servicePayments, from, to, today]);

  const [tooltip, setTooltip] = useState<{ key: string; x: number; y: number } | null>(null);
  const handleBarInteraction = useCallback((key: string, e: React.MouseEvent | React.TouchEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip((prev) => prev?.key === key ? null : { key, x: rect.left + rect.width / 2, y: rect.top });
  }, []);

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
    const inRange = passLogs.filter((d) => d.delta < 0).filter((d) => { const dt = kstDateStr(d.created_at); return dt >= closingFrom && dt <= closingTo; });
    const amountTotal = inRange.filter((d) => d.passType === "amount").reduce((s, d) => s + Math.abs(d.delta), 0);
    const countTotal = inRange.filter((d) => d.passType === "count").reduce((s, d) => s + Math.abs(d.delta), 0);
    return { amountTotal, countTotal };
  }, [passLogs, closingFrom, closingTo]);

  // 월말 시점 선불권 부채: 현재 잔액에서 월말 이후 변동분을 역산
  // TODO: pass_logs 누적 시 매 조회마다 전체 합산(O(N)) — 거래량 증가 시
  // 월말 스냅샷 테이블(monthly_pass_snapshots)로 전환 검토
  const closingMonthEndBalance = useMemo(() => {
    const deltasAfter = passLogs
      .filter((l) => l.passType === "amount" && kstDateStr(l.created_at) > closingTo)
      .reduce((s, l) => s + l.delta, 0);
    return Math.max(0, unusedPassBalance - deltasAfter);
  }, [passLogs, closingTo, unusedPassBalance]);

  // 보너스 적립: 해당 월 충전 총액(pass_log) - 결제 총액(payment)
  const closingBonusAmount = useMemo(() => {
    const totalLoaded = passLogs
      .filter((l) => l.passType === "amount" && l.delta > 0)
      .filter((l) => { const d = kstDateStr(l.created_at); return d >= closingFrom && d <= closingTo; })
      .reduce((s, l) => s + l.delta, 0);
    return totalLoaded - closingPrepaidTotal;
  }, [passLogs, closingFrom, closingTo, closingPrepaidTotal]);

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
      ...(closingBonusAmount > 0 ? ["보너스 적립," + closingBonusAmount] : []),
      "선불권 차감(매출인식)," + closingDeductionData.amountTotal,
      "횟수권 차감," + closingDeductionData.countTotal + "회",
      `미사용 잔액(${closingTo} 기준 부채),` + closingMonthEndBalance,
      "",
      "완료," + completedCount + "건",
      "노쇼," + noShowCount + "건",
      "노쇼율," + noShowRate + "%",
      "취소," + cancelledCount + "건",
    ];
    downloadCsv(`월마감_${closingMonth}.csv`, lines.join("\n"));
  }

  const showChart = chartData.length > 1;
  const hasAnyRevenue = chartData.some((d) => d.amount > 0);

  return (
    <div className="print:mx-0 print:p-0">
      {/* 탭 + CSV 버튼 */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex rounded-md bg-border-light p-0.5">
          <button onClick={() => setTab("revenue")} className={`rounded-md px-3 py-1 text-xs font-medium transition ${tab === "revenue" ? "border border-border bg-white text-ink" : "text-ink-secondary"}`}>매출</button>
          <button onClick={() => setTab("closing")} className={`rounded-md px-3 py-1 text-xs font-medium transition ${tab === "closing" ? "border border-border bg-white text-ink" : "text-ink-secondary"}`}>월 마감</button>
        </div>
        <div className="flex gap-1.5">
          <button onClick={exportPaymentsCsv} className="rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-ink-secondary hover:bg-bg">CSV 결제내역</button>
          {tab === "closing" && (
            <button onClick={exportClosingSummaryCsv} className="rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-ink-secondary hover:bg-bg">CSV 월마감</button>
          )}
        </div>
      </div>

      {tab === "revenue" ? (
        <div>
          <h1 className="mt-3 text-[20px] font-bold text-ink print:mt-0">매출 리포트</h1>

          <div className="mt-4 flex flex-wrap gap-1.5 print:hidden">
            {RANGES.map((r) => (
              <button key={r.key} onClick={() => setRange(r.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${range === r.key ? "bg-primary text-white" : "bg-border-light text-ink-secondary"}`}>{r.label}</button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-caption">{from} ~ {to}</p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <SummaryCard value={`₩${totalRevenue.toLocaleString()}`} label="시술 매출" />
            <SummaryCard value={String(servicePayments.length)} label="결제 건수" />
            <SummaryCard value={`₩${avgPerVisit.toLocaleString()}`} label="평균 객단가" />
          </div>

          {(prepaidTotal > 0 || prepaidSales.length > 0 || passUsageCount > 0) && (
            <Section title="선불권">
              {prepaidSales.length > 0 && <Row label={`선불권 판매 (${prepaidSales.length}건)`} value={`₩${prepaidTotal.toLocaleString()}`} />}
              {prepaidBonusAmount > 0 && <Row label="보너스 적립" value={`₩${prepaidBonusAmount.toLocaleString()}`} />}
              {passUsageCount > 0 && <Row label="횟수권 사용" value={`${passUsageCount}건`} />}
              <p className="text-[11px] text-ink-disabled">시술 매출과 별도로 집계돼요 (선수금)</p>
            </Section>
          )}

          {showChart && (
            <div className="mt-6 overflow-hidden rounded-lg border border-border bg-white p-4" onClick={() => setTooltip(null)}>
              <p className="text-xs font-bold text-ink-caption">
                {aggregation === "daily" ? "일별" : aggregation === "weekly" ? "주별" : "월별"} 매출
              </p>

              {!hasAnyRevenue ? (
                <div className="mt-6 flex flex-col items-center gap-2 py-8">
                  <div className="flex gap-1">
                    {[28, 40, 20, 36, 24].map((h, i) => (
                      <div key={i} className="w-3 rounded-t bg-border-light" style={{ height: h }} />
                    ))}
                  </div>
                  <p className="text-xs text-ink-caption">이 기간에는 매출이 없어요</p>
                </div>
              ) : (
                <div className="mt-3">
                  {/* Chart zone: 18px top pad for amount labels + 130px bar area */}
                  <div className="relative" style={{ height: 148 }}>
                    {/* Grid lines: 0, mid, max — aligned to 130px bar area */}
                    {gridLines.map((v) => (
                      <div key={v} className="absolute left-0 right-0 flex items-center" style={{ bottom: (v / maxAmount) * 130 }}>
                        <span className="mr-2 w-7 shrink-0 text-right text-[9px] text-ink-disabled tabular-nums">{formatCompact(v)}</span>
                        <div className={`flex-1 border-t ${v === 0 ? "border-border" : "border-dashed border-border-light"}`} />
                      </div>
                    ))}

                    {/* Bars: absolute-anchored to bottom, exactly 130px */}
                    <div className="absolute bottom-0 left-0 right-0 flex items-end gap-[3px] pl-8" style={{ height: 130 }}>
                      {chartData.map((d) => {
                        const barH = d.amount > 0 ? Math.max(4, (d.amount / maxAmount) * 130) : 2;
                        return (
                          <div
                            key={d.key}
                            className="group relative flex min-w-[14px] flex-1 justify-center"
                            onClick={(e) => { e.stopPropagation(); handleBarInteraction(d.key, e); }}
                          >
                            {/* Amount label — absolute above bar */}
                            {d.amount > 0 && chartData.length <= 14 && (
                              <span className="absolute text-[9px] font-medium tabular-nums text-ink-caption" style={{ bottom: barH + 2 }}>
                                {formatCompact(d.amount)}
                              </span>
                            )}
                            {/* Bar */}
                            <div
                              className={`w-full max-w-[24px] rounded-t-[3px] transition-colors ${d.isToday ? "bg-primary" : d.amount > 0 ? "bg-primary/60 group-hover:bg-primary/80" : "bg-border-light"}`}
                              style={{ height: barH }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* X-axis labels — outside bar area, no overflow possible */}
                  {chartData.length <= 14 ? (
                    <div className="mt-1 flex gap-[3px] pl-8">
                      {chartData.map((d) => (
                        <div key={d.key} className="flex min-w-[14px] flex-1 justify-center">
                          <span className={`text-[9px] leading-none ${d.isToday ? "font-bold text-primary" : d.isWeekend ? "text-red-400" : "text-ink-caption"}`}>
                            {d.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-1 flex justify-between pl-8 text-[9px] text-ink-caption">
                      <span>{chartData[0].label}</span>
                      {chartData.length > 6 && <span>{chartData[Math.floor(chartData.length / 2)].label}</span>}
                      <span>{chartData[chartData.length - 1].label}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Chart tooltip — fixed so it escapes overflow-hidden */}
          {tooltip && (() => {
            const td = chartData.find((d) => d.key === tooltip.key);
            if (!td) return null;
            const flipDown = tooltip.y < 60;
            return (
              <div
                className="fixed z-50 whitespace-nowrap rounded-md bg-ink px-2.5 py-1.5 text-[11px] text-white shadow-lg"
                style={{
                  left: tooltip.x,
                  top: flipDown ? tooltip.y + 24 : tooltip.y - 8,
                  transform: `translateX(-50%) ${flipDown ? "" : "translateY(-100%)"}`,
                }}
              >
                <p className="font-bold">₩{td.amount.toLocaleString()}</p>
                <p className="text-white/70">{td.count}건</p>
                <div className={`absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-ink ${flipDown ? "-top-1" : "-bottom-1"}`} />
              </div>
            );
          })()}

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
            <p className="mt-8 text-center text-sm text-ink-caption">해당 기간의 결제 기록이 없습니다</p>
          )}
        </div>
      ) : (
        /* 월 마감 탭 */
        <div>
          <div className="mt-3 flex items-center gap-3">
            <h1 className="text-[20px] font-bold text-ink">월 마감 요약</h1>
            <select value={closingMonth} onChange={(e) => setClosingMonth(e.target.value)}
              className="rounded-md border border-border px-3 py-1.5 text-sm outline-none print:hidden">
              {monthOptions.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <p className="mt-1 text-xs text-ink-caption print:hidden">{closingFrom} ~ {closingTo}</p>
          <p className="hidden text-sm text-ink-secondary print:block">{closingFrom} ~ {closingTo}</p>

          {/* 시술 매출 */}
          <div className="mt-4 rounded-lg border border-border bg-white p-5 print:border print:border-border">
            <p className="text-xs font-bold text-ink-caption">시술 매출</p>
            <p className="mt-2 text-2xl font-bold text-ink">₩{closingRevenue.toLocaleString()}</p>
            <div className="mt-3 flex flex-col gap-1.5">
              {closingMethodStats.map((m) => <Row key={m.method} label={m.label} value={`₩${m.amount.toLocaleString()}`} />)}
            </div>
          </div>

          {/* 선불권 */}
          <Section title="선불권">
            <Row label="판매액 (선수금 유입)" value={`₩${closingPrepaidTotal.toLocaleString()}`} />
            {closingBonusAmount > 0 && (
              <Row label="보너스 적립" value={`₩${closingBonusAmount.toLocaleString()}`} />
            )}
            <Row label="차감액 (매출 인식)" value={`₩${closingDeductionData.amountTotal.toLocaleString()}`} />
            {closingDeductionData.countTotal > 0 && (
              <Row label="횟수권 차감" value={`${closingDeductionData.countTotal}회`} />
            )}
            <Row label={`미사용 잔액 (${closingTo} 기준 부채)`} value={`₩${closingMonthEndBalance.toLocaleString()}`} bold />
          </Section>

          {/* 운영 지표 */}
          <Section title="운영 지표">
            <Row label="완료" value={`${completedCount}건`} />
            <Row label="노쇼" value={`${noShowCount}건 (${noShowRate}%)`} />
            <Row label="취소" value={`${cancelledCount}건`} />
          </Section>

          {closingPayments.length === 0 && closingRes.length === 0 && (
            <p className="mt-8 text-center text-sm text-ink-caption">해당 월의 데이터가 없습니다</p>
          )}
        </div>
      )}
    </div>
  );
}

/** 축 상한을 깔끔한 수로 올림 (예: 87000 → 100000) */
function niceMax(raw: number): number {
  if (raw <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const normalized = raw / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

/** 금액 축약: 10000 → "1만", 85000 → "8.5만", 1200 → "1,200" */
function formatCompact(v: number): string {
  if (v >= 10000) {
    const man = v / 10000;
    return man === Math.floor(man) ? `${man}만` : `${man.toFixed(1).replace(/\.0$/, "")}만`;
  }
  return v.toLocaleString();
}

function SummaryCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-border bg-white p-4 text-center print:border print:border-border">
      <p className="text-xl font-bold text-ink">{value}</p>
      <p className="text-[11px] text-ink-caption">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-lg border border-border bg-white p-4 print:border print:border-border">
      <p className="text-xs font-bold text-ink-caption">{title}</p>
      <div className="mt-3 flex flex-col gap-2 text-sm">{children}</div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-caption">{label}</span>
      <span className={`${bold ? "font-bold" : "font-medium"} text-ink`}>{value}</span>
    </div>
  );
}
