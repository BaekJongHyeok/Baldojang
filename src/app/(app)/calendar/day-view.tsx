"use client";

import { useEffect, useRef, useMemo } from "react";
import type { CalendarReservation, DayHours } from "@/lib/calendar-data";
import { kstHourMin, nowKSTMinutes } from "@/lib/calendar-utils";

/*
  Grid constants:
  - Each hour = 2 half-hour rows
  - We render from GRID_START (earliest whole hour before open) to GRID_END (latest whole hour after close)
  - Outside business hours gets gray hatching
*/
const ROW_HEIGHT = 48; // px per 30min slot (96px per hour)
const TIME_COL = 56; // px, desktop — shrinks to 48 on mobile via class
const BLOCK_GAP = 1; // px gap between blocks

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

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <svg className="h-3.5 w-3.5 text-ink-caption" fill="none" viewBox="0 0 16 16" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8.5l3.5 3.5L13 5" /></svg>;
  if (status === "no_show") return <svg className="h-3.5 w-3.5 text-danger" fill="none" viewBox="0 0 16 16" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4l8 8M12 4l-8 8" /></svg>;
  return null;
}

export function DayView({
  reservations,
  hours,
  slotMinutes,
  isToday,
  onSelect,
  onSlotClick,
}: {
  reservations: CalendarReservation[];
  hours: DayHours | null;
  slotMinutes: number;
  isToday: boolean;
  onSelect: (id: string) => void;
  onSlotClick?: (time: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 휴무일(hours === null)에도 모든 훅이 동일하게 호출되도록,
  // early return은 훅 선언 이후로 미루고 파생값은 null-safe로 계산한다.
  // (이전: 여기서 early return → 렌더마다 훅 개수가 달라져 React 훅 규칙 위반 → 날짜 이동 시 크래시)
  const openMin = hours ? timeToMin(hours.open) : 0;
  const closeMin = hours ? timeToMin(hours.close) : 0;
  // Grid spans full hours: 1h before open → 1h after close (or bounded by 0:00–24:00)
  const gridStartHour = Math.max(0, Math.floor(openMin / 60) - 1);
  const gridEndHour = Math.min(24, Math.ceil(closeMin / 60) + 1);
  const gridStartMin = gridStartHour * 60;
  const gridEndMin = gridEndHour * 60;
  const totalHours = gridEndHour - gridStartHour;
  const totalHeight = totalHours * 2 * ROW_HEIGHT; // 2 half-hour rows per hour
  const pxPerMin = totalHeight / (gridEndMin - gridStartMin);

  // Build hour/half-hour rows
  const rows: { min: number; isHour: boolean; label: string }[] = [];
  for (let h = gridStartHour; h < gridEndHour; h++) {
    rows.push({ min: h * 60, isHour: true, label: `${String(h).padStart(2, "0")}:00` });
    rows.push({ min: h * 60 + 30, isHour: false, label: "" });
  }

  const nowMin = nowKSTMinutes();
  const nowTop = isToday && nowMin >= gridStartMin && nowMin <= gridEndMin ? (nowMin - gridStartMin) * pxPerMin : null;

  // Auto-scroll to now or open time (1회, 날짜 변경 시만)
  useEffect(() => {
    if (!hours) return; // 휴무일엔 스크롤 없음 (훅은 항상 호출, 동작만 가드)
    if (!containerRef.current) return;
    const now = nowKSTMinutes();
    const nowPx = isToday && now >= gridStartMin && now <= gridEndMin ? (now - gridStartMin) * pxPerMin : null;
    if (nowPx !== null) containerRef.current.scrollTop = Math.max(0, nowPx - 120);
    else containerRef.current.scrollTop = Math.max(0, (openMin - gridStartMin) * pxPerMin - 20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, openMin]);

  // DEV overlap check
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const active = reservations.filter((r) => r.status !== "cancelled");
    for (let i = 0; i < active.length; i++) for (let j = i + 1; j < active.length; j++) {
      const a = active[i], b = active[j];
      if (a.starts_at < b.ends_at && b.starts_at < a.ends_at)
        console.warn(`[Calendar overlap] "${a.pet.name}" ↔ "${b.pet.name}"`);
    }
  }, [reservations]);

  // Compute which 30-min slots are occupied (for empty slot hint)
  const occupiedSlots = useMemo(() => {
    const set = new Set<number>();
    for (const r of reservations) {
      if (r.status === "cancelled") continue;
      const s = kstHourMin(r.starts_at);
      const e = kstHourMin(r.ends_at);
      const sm = s.hours * 60 + s.minutes;
      const em = e.hours * 60 + e.minutes;
      for (let m = sm; m < em; m += 30) set.add(m);
    }
    return set;
  }, [reservations]);

  // 휴무일 — 모든 훅이 호출된 뒤에야 분기 (훅 규칙 준수)
  if (!hours) {
    return (
      <div className="flex items-center justify-center bg-border-light/50 py-32 text-[14px] text-ink-caption">
        휴무일입니다
      </div>
    );
  }

  return (
    <div ref={containerRef} className="overflow-y-auto bg-white" style={{ maxHeight: "calc(100dvh - 100px)" }}>
      <div className="relative" style={{ height: totalHeight }}>
        {/* ── 영업시간 외 해칭 ── */}
        {gridStartMin < openMin && (
          <div
            className="absolute left-0 right-0 z-[1] bg-border-light/60"
            style={{ top: 0, height: (openMin - gridStartMin) * pxPerMin }}
          >
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 4px, #D1D5DB 4px, #D1D5DB 5px)" }} />
          </div>
        )}
        {closeMin < gridEndMin && (
          <div
            className="absolute left-0 right-0 z-[1] bg-border-light/60"
            style={{ top: (closeMin - gridStartMin) * pxPerMin, bottom: 0 }}
          >
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 4px, #D1D5DB 4px, #D1D5DB 5px)" }} />
          </div>
        )}

        {/* ── 그리드 라인 + 시간 라벨 ── */}
        {rows.map((row, i) => {
          const top = (row.min - gridStartMin) * pxPerMin;
          const isInBusiness = row.min >= openMin && row.min < closeMin;
          const slotTime = minToLabel(row.min);
          const slotOccupied = occupiedSlots.has(row.min);

          return (
            <div
              key={i}
              className={`absolute left-0 right-0 ${row.isHour ? "border-t border-border" : "border-t border-dashed border-border-light"}`}
              style={{ top, height: ROW_HEIGHT }}
            >
              {/* 시간 라벨 — 정시만 */}
              {row.isHour && (
                <span className="absolute left-0 -top-[9px] w-[56px] lg:w-[56px] w-[48px] text-right pr-3 text-[11px] text-ink-disabled tabular-nums pointer-events-none select-none">
                  {row.label}
                </span>
              )}

              {/* 빈 슬롯 클릭 영역 — 영업 시간 내만 */}
              {isInBusiness && !slotOccupied && onSlotClick && (
                <button
                  onClick={() => onSlotClick(slotTime)}
                  className="absolute right-0 top-0 bottom-0 left-[48px] lg:left-[56px] z-[2] group cursor-pointer"
                  aria-label={`${slotTime} 예약 추가`}
                >
                  <span className="absolute inset-0 rounded-sm opacity-0 transition-opacity group-hover:bg-primary/5 group-hover:opacity-100" />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:flex">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  </span>
                </button>
              )}
            </div>
          );
        })}

        {/* ── 예약 블록 ── */}
        <div className="absolute top-0 bottom-0 left-[48px] right-0 lg:left-[56px]">
          {reservations.map((r) => {
            const s = kstHourMin(r.starts_at);
            const e = kstHourMin(r.ends_at);
            const rStartMin = s.hours * 60 + s.minutes;
            const rEndMin = e.hours * 60 + e.minutes;
            const top = (rStartMin - gridStartMin) * pxPerMin + BLOCK_GAP;
            const height = Math.max(24, (rEndMin - rStartMin) * pxPerMin - BLOCK_GAP * 2);
            const isCancelled = r.status === "cancelled";
            const isCompleted = r.status === "completed";
            const durationMin = rEndMin - rStartMin;

            return (
              <button
                key={r.id}
                onClick={(ev) => { ev.stopPropagation(); onSelect(r.id); }}
                className={`absolute left-1 right-1 z-[5] flex overflow-hidden rounded-md border bg-white text-left transition-colors hover:border-ink-caption ${
                  isCancelled ? "border-dashed border-border opacity-50" : "border-border"
                }`}
                style={{ top, height }}
              >
                {/* 좌측 상태 컬러 바 */}
                <div className={`w-[3px] shrink-0 rounded-l-md ${statusBar(r.status)}`} />

                {/* 내용 */}
                <div className={`flex min-w-0 flex-1 flex-col justify-center px-2 py-0.5 ${isCompleted ? "opacity-60" : ""}`}>
                  {/* 60분+: 3줄 (시간/이름/시술) */}
                  {durationMin >= 60 && (
                    <>
                      <p className="text-[11px] text-ink-caption tabular-nums">{minToLabel(rStartMin)}–{minToLabel(rEndMin)}</p>
                      <div className="flex items-center gap-1">
                        <p className={`truncate text-[14px] font-semibold ${isCancelled ? "line-through text-ink-disabled" : "text-ink"}`}>{r.pet.name}</p>
                        <StatusIcon status={r.status} />
                      </div>
                      <p className="truncate text-[12px] text-ink-caption">{r.service.name}</p>
                    </>
                  )}
                  {/* 30-59분: 2줄 (시간+이름 / 시술) */}
                  {durationMin >= 30 && durationMin < 60 && (
                    <>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-ink-caption tabular-nums">{minToLabel(rStartMin)}</span>
                        <p className={`truncate text-[13px] font-semibold ${isCancelled ? "line-through text-ink-disabled" : "text-ink"}`}>{r.pet.name}</p>
                        <StatusIcon status={r.status} />
                      </div>
                      {height > 36 && <p className="truncate text-[11px] text-ink-caption">{r.service.name}</p>}
                    </>
                  )}
                  {/* <30분: 이름만 */}
                  {durationMin < 30 && (
                    <div className="flex items-center gap-1">
                      <p className={`truncate text-[12px] font-semibold ${isCancelled ? "line-through text-ink-disabled" : "text-ink"}`}>{r.pet.name}</p>
                      <StatusIcon status={r.status} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── 현재 시각 라인 ── */}
        {nowTop !== null && (
          <div className="absolute left-0 right-0 z-[8] pointer-events-none" style={{ top: nowTop }}>
            <div className="flex items-center">
              {/* 시간축의 시각 칩 */}
              <span className="inline-flex h-[18px] w-[48px] lg:w-[56px] items-center justify-center rounded-sm bg-primary text-[10px] font-bold text-white tabular-nums">
                {minToLabel(nowMin)}
              </span>
              <div className="flex-1 border-t-2 border-primary" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
