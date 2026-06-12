"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import type { CalendarReservation, DayHours } from "@/lib/calendar-data";
import { kstHourMin, kstDateStr, nowKSTMinutes } from "@/lib/calendar-utils";

const ROW_HEIGHT = 36; // px per 30min
const TIME_COL = 48;

function timeToMin(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function minToLabel(m: number) { return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; }

function statusBar(s: string) {
  switch (s) {
    case "confirmed": return "bg-primary";
    case "completed": return "bg-ink-disabled";
    case "no_show": return "bg-danger";
    case "cancelled": return "bg-ink-disabled";
    default: return "bg-border";
  }
}

type WeekDay = { date: string; dayKey: string; hours: DayHours | null };
const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

export function WeekView({
  reservations,
  weekDays,
  slotMinutes,
  today,
  onSelect,
}: {
  reservations: CalendarReservation[];
  weekDays: WeekDay[];
  slotMinutes: number;
  today: string;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { gridStartHour, gridEndHour } = useMemo(() => {
    let minOpen = 24, maxClose = 0;
    for (const d of weekDays) {
      if (d.hours) {
        minOpen = Math.min(minOpen, Math.floor(timeToMin(d.hours.open) / 60));
        maxClose = Math.max(maxClose, Math.ceil(timeToMin(d.hours.close) / 60));
      }
    }
    if (minOpen >= maxClose) return { gridStartHour: 9, gridEndHour: 18 };
    return { gridStartHour: Math.max(0, minOpen - 1), gridEndHour: Math.min(24, maxClose + 1) };
  }, [weekDays]);

  const gridStartMin = gridStartHour * 60;
  const gridEndMin = gridEndHour * 60;
  const totalHours = gridEndHour - gridStartHour;
  const totalHeight = totalHours * 2 * ROW_HEIGHT;
  const pxPerMin = totalHeight / (gridEndMin - gridStartMin);

  // Hour/half-hour rows
  const rows: { min: number; isHour: boolean; label: string }[] = [];
  for (let h = gridStartHour; h < gridEndHour; h++) {
    rows.push({ min: h * 60, isHour: true, label: `${String(h).padStart(2, "0")}:00` });
    rows.push({ min: h * 60 + 30, isHour: false, label: "" });
  }

  // 현재 시각 라인 — 1분마다 갱신 (deps 빈 배열: 타이머는 마운트 시 1회만 설치, 루프 없음)
  const [nowMin, setNowMin] = useState(() => nowKSTMinutes());
  useEffect(() => {
    const id = setInterval(() => setNowMin(nowKSTMinutes()), 60_000);
    return () => clearInterval(id);
  }, []);
  const isThisWeek = weekDays.some((d) => d.date === today);
  const nowTop = isThisWeek && nowMin >= gridStartMin && nowMin <= gridEndMin ? (nowMin - gridStartMin) * pxPerMin : null;

  // 진입 시 스크롤: 주 시작일 문자열이 바뀔 때만 1회 실행
  const weekStartDate = weekDays[0]?.date ?? "";
  useEffect(() => {
    if (!containerRef.current) return;
    const now = nowKSTMinutes();
    const hasToday = weekDays.some((d) => d.date === today);
    if (hasToday && now >= gridStartMin && now <= gridEndMin) {
      containerRef.current.scrollTop = Math.max(0, (now - gridStartMin) * pxPerMin - 60 * pxPerMin);
    } else {
      const firstOpen = weekDays.find((d) => d.hours);
      if (firstOpen?.hours) {
        const openPx = (timeToMin(firstOpen.hours.open) - gridStartMin) * pxPerMin;
        containerRef.current.scrollTop = Math.max(0, openPx - 20);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartDate]);

  const byDate = useMemo(() => {
    const map: Record<string, CalendarReservation[]> = {};
    for (const r of reservations) { const ds = kstDateStr(r.starts_at); if (!map[ds]) map[ds] = []; map[ds].push(r); }
    return map;
  }, [reservations]);

  return (
    <div ref={containerRef} className="overflow-auto bg-white" style={{ maxHeight: "calc(100dvh - 100px)" }}>
      <div style={{ minWidth: 700 }}>
        {/* ── 요일 헤더 ── */}
        <div className="sticky top-0 z-10 flex border-b border-border bg-white">
          <div style={{ width: TIME_COL }} className="shrink-0" />
          {weekDays.map((d, i) => {
            const isToday = d.date === today;
            return (
              <div
                key={d.date}
                className="flex-1 border-l border-border py-2 text-center"
              >
                <span className={`block text-[11px] font-medium ${isToday ? "text-primary" : !d.hours ? "text-ink-disabled" : "text-ink-caption"}`}>
                  {DAY_LABELS[i]}
                </span>
                <span className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums ${
                  isToday ? "bg-primary text-white" : "text-ink"
                }`}>
                  {d.date.slice(8).replace(/^0/, "")}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── 그리드 ── */}
        <div className="relative flex" style={{ height: totalHeight }}>
          {/* 시간 컬럼 */}
          <div className="relative shrink-0" style={{ width: TIME_COL }}>
            {rows.map((row, i) => row.isHour && (
              <span key={i} className="absolute right-3 text-[11px] text-ink-disabled tabular-nums leading-none" style={{ top: (row.min - gridStartMin) * pxPerMin, transform: "translateY(-50%)" }}>
                {row.label}
              </span>
            ))}
          </div>

          {/* 요일 컬럼들 */}
          {weekDays.map((d) => {
            const isClosed = !d.hours;
            const openMin = d.hours ? timeToMin(d.hours.open) : 0;
            const closeMin = d.hours ? timeToMin(d.hours.close) : 0;
            const dayRes = byDate[d.date] ?? [];

            return (
              <div key={d.date} className="relative flex-1 border-l border-border">
                {/* 그리드 라인 */}
                {rows.map((row, i) => (
                  <div
                    key={i}
                    className={`absolute left-0 right-0 ${row.isHour ? "border-t border-border" : "border-t border-dashed border-border-light"}`}
                    style={{ top: (row.min - gridStartMin) * pxPerMin }}
                  />
                ))}

                {/* 영업 외 해칭 */}
                {!isClosed && gridStartMin < openMin && (
                  <div className="absolute left-0 right-0 z-[1] bg-border-light/60" style={{ top: 0, height: (openMin - gridStartMin) * pxPerMin }}>
                    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 4px, #D1D5DB 4px, #D1D5DB 5px)" }} />
                  </div>
                )}
                {!isClosed && closeMin < gridEndMin && (
                  <div className="absolute left-0 right-0 z-[1] bg-border-light/60" style={{ top: (closeMin - gridStartMin) * pxPerMin, bottom: 0 }}>
                    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 4px, #D1D5DB 4px, #D1D5DB 5px)" }} />
                  </div>
                )}

                {/* 휴무 */}
                {isClosed && (
                  <div className="absolute inset-0 z-[1] flex items-center justify-center bg-border-light/60">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 4px, #D1D5DB 4px, #D1D5DB 5px)" }} />
                    <span className="relative z-[2] rounded-sm bg-white/80 px-2 py-0.5 text-[11px] font-medium text-ink-disabled">휴무</span>
                  </div>
                )}

                {/* 블록 */}
                {!isClosed && dayRes.map((r) => {
                  const s = kstHourMin(r.starts_at);
                  const displayEnd = r.status === "completed" && r.visit_ends_at ? r.visit_ends_at : r.ends_at;
                  const e = kstHourMin(displayEnd);
                  const rStartMin = s.hours * 60 + s.minutes;
                  const rEndMin = e.hours * 60 + e.minutes;
                  const top = (rStartMin - gridStartMin) * pxPerMin + 1;
                  const height = Math.max(18, (rEndMin - rStartMin) * pxPerMin - 2);
                  const isCancelled = r.status === "cancelled";
                  const durationMin = rEndMin - rStartMin;

                  return (
                    <button
                      key={r.id}
                      onClick={() => onSelect(r.id)}
                      className={`absolute inset-x-0.5 z-[3] flex overflow-hidden rounded-sm border bg-white text-left transition-colors hover:border-ink-caption ${
                        isCancelled ? "border-dashed border-border opacity-50" : "border-border"
                      }`}
                      style={{ top, height }}
                    >
                      <div className={`w-[2px] shrink-0 ${statusBar(r.status)}`} />
                      <div className="min-w-0 flex-1 px-1 py-px">
                        {/* 60분+: 시간/이름/시술 3줄 */}
                        {durationMin >= 60 && (
                          <>
                            <p className="truncate text-[9px] leading-tight text-ink-caption tabular-nums">{minToLabel(rStartMin)}–{minToLabel(rEndMin)}</p>
                            <p className={`truncate text-[10px] font-semibold leading-tight ${isCancelled ? "line-through text-ink-disabled" : "text-ink"}`}>{r.pet.name}</p>
                            <p className="truncate text-[9px] leading-tight text-ink-caption">{r.service.name}</p>
                          </>
                        )}
                        {/* 30-59분: 시간+이름 / 시술 2줄 */}
                        {durationMin >= 30 && durationMin < 60 && (
                          <>
                            <div className="flex items-center gap-0.5">
                              <span className="text-[9px] text-ink-caption tabular-nums">{minToLabel(rStartMin)}</span>
                              <p className={`truncate text-[10px] font-semibold leading-tight ${isCancelled ? "line-through text-ink-disabled" : "text-ink"}`}>{r.pet.name}</p>
                            </div>
                            {height > 26 && <p className="truncate text-[9px] leading-tight text-ink-caption">{r.service.name}</p>}
                          </>
                        )}
                        {/* <30분: 이름만 */}
                        {durationMin < 30 && (
                          <p className={`truncate text-[10px] font-semibold leading-tight ${isCancelled ? "line-through text-ink-disabled" : "text-ink"}`}>{r.pet.name}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* ── 현재 시각 라인 ── */}
          {nowTop !== null && (
            <div className="pointer-events-none absolute left-0 right-0 z-[8]" style={{ top: nowTop }}>
              <div className="flex items-center">
                <span className="inline-flex h-[18px] items-center justify-center rounded-sm bg-primary text-[10px] font-bold text-white tabular-nums" style={{ width: TIME_COL }}>
                  {minToLabel(nowMin)}
                </span>
                <div className="flex-1 border-t-2 border-primary" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
