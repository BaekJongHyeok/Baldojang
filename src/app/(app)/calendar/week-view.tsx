"use client";

import { useMemo } from "react";
import type { CalendarReservation, DayHours } from "@/lib/calendar-data";
import { kstHourMin, kstDateStr } from "@/lib/calendar-utils";

const SLOT_HEIGHT = 36;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function statusColor(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-primary-light border-primary/20 text-ink";
    case "completed":
      return "bg-border-light border-border text-ink-caption";
    case "no_show":
      return "bg-danger-light border-danger/20 text-danger";
    case "cancelled":
      return "bg-border-light border-border text-ink-disabled line-through opacity-50";
    default:
      return "bg-border-light border-border";
  }
}

type WeekDay = { date: string; dayKey: string; hours: DayHours | null };

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

export function WeekView({
  reservations,
  weekDays,
  slotMinutes,
  today,
  onSelectDate,
  onSelect,
}: {
  reservations: CalendarReservation[];
  weekDays: WeekDay[];
  slotMinutes: number;
  today: string;
  onSelectDate: (date: string) => void;
  onSelect: (id: string) => void;
}) {
  const { globalStart, globalEnd } = useMemo(() => {
    let minOpen = 24 * 60;
    let maxClose = 0;
    for (const d of weekDays) {
      if (d.hours) {
        minOpen = Math.min(minOpen, timeToMinutes(d.hours.open));
        maxClose = Math.max(maxClose, timeToMinutes(d.hours.close));
      }
    }
    if (minOpen >= maxClose) return { globalStart: 9 * 60, globalEnd: 18 * 60 };
    return { globalStart: minOpen, globalEnd: maxClose };
  }, [weekDays]);

  const totalSlots = Math.ceil((globalEnd - globalStart) / slotMinutes);
  const totalHeight = totalSlots * SLOT_HEIGHT;
  const pxPerMin = totalHeight / (globalEnd - globalStart);

  const slots = Array.from({ length: totalSlots }, (_, i) => {
    const min = globalStart + i * slotMinutes;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  });

  const byDate = useMemo(() => {
    const map: Record<string, CalendarReservation[]> = {};
    for (const r of reservations) {
      const ds = kstDateStr(r.starts_at);
      if (!map[ds]) map[ds] = [];
      map[ds].push(r);
    }
    return map;
  }, [reservations]);

  return (
    <div className="overflow-x-auto" style={{ maxHeight: "calc(100vh - 160px)" }}>
      <div className="min-w-[600px]">
        {/* day header */}
        <div className="sticky top-0 z-10 flex border-b border-border bg-white">
          <div className="w-10 shrink-0" />
          {weekDays.map((d, i) => {
            const isToday = d.date === today;
            return (
              <button
                key={d.date}
                onClick={() => onSelectDate(d.date)}
                className={`flex-1 py-2 text-center text-[11px] font-medium transition-colors duration-150 hover:bg-bg ${
                  isToday ? "text-primary" : !d.hours ? "text-ink-disabled" : "text-ink-secondary"
                }`}
              >
                <span className="block">{DAY_LABELS[i]}</span>
                <span
                  className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-[13px] tabular-nums ${
                    isToday ? "bg-primary text-white font-bold" : "font-medium"
                  }`}
                >
                  {d.date.slice(8).replace(/^0/, "")}
                </span>
              </button>
            );
          })}
        </div>

        {/* grid */}
        <div className="relative flex" style={{ height: totalHeight }}>
          {/* time labels */}
          <div className="relative w-10 shrink-0">
            {slots.map((label, i) => (
              <div key={i} className="absolute left-0 w-full pr-1 text-right" style={{ top: i * SLOT_HEIGHT - 5 }}>
                <span className="text-[11px] text-ink-disabled tabular-nums">{label}</span>
              </div>
            ))}
          </div>

          {/* day columns */}
          {weekDays.map((d) => {
            const isClosed = !d.hours;
            const dayRes = byDate[d.date] ?? [];
            return (
              <div key={d.date} className="relative flex-1 border-l border-border-light">
                {/* slot lines */}
                {slots.map((_, i) => (
                  <div key={i} className="absolute left-0 right-0 border-t border-border-light" style={{ top: i * SLOT_HEIGHT }} />
                ))}

                {isClosed && (
                  <div className="absolute inset-0 flex items-center justify-center bg-border-light/50">
                    <span className="text-[10px] text-ink-disabled">휴무</span>
                  </div>
                )}

                {!isClosed &&
                  dayRes.map((r) => {
                    const s = kstHourMin(r.starts_at);
                    const e = kstHourMin(r.ends_at);
                    const rStartMin = s.hours * 60 + s.minutes;
                    const rEndMin = e.hours * 60 + e.minutes;
                    const top = (rStartMin - globalStart) * pxPerMin;
                    const height = Math.max(18, (rEndMin - rStartMin) * pxPerMin);
                    return (
                      <button
                        key={r.id}
                        onClick={() => onSelect(r.id)}
                        className={`absolute inset-x-0.5 overflow-hidden rounded-sm border px-1 py-px text-left ${statusColor(r.status)}`}
                        style={{ top, height }}
                      >
                        <p className="truncate text-[10px] font-bold leading-tight">{r.pet.name}</p>
                        {height > 24 && (
                          <p className="truncate text-[9px] leading-tight opacity-70">{r.service.name}</p>
                        )}
                      </button>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
