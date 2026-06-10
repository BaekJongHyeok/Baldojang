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
      return "bg-blue-100 border-blue-200 text-blue-900";
    case "completed":
      return "bg-stone-100 border-stone-200 text-stone-500";
    case "no_show":
      return "bg-red-100 border-red-200 text-red-800";
    case "cancelled":
      return "bg-stone-100 border-stone-200 text-stone-400 line-through";
    default:
      return "bg-stone-100 border-stone-200";
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
        <div className="sticky top-0 z-10 flex border-b border-stone-200 bg-white">
          <div className="w-10 shrink-0" />
          {weekDays.map((d, i) => (
            <button
              key={d.date}
              onClick={() => onSelectDate(d.date)}
              className={`flex-1 py-2 text-center text-xs font-medium transition hover:bg-stone-50 ${
                d.date === today ? "text-blue-600" : !d.hours ? "text-stone-300" : "text-stone-600"
              }`}
            >
              <span className="block">{DAY_LABELS[i]}</span>
              <span className={`block text-sm ${d.date === today ? "font-bold" : ""}`}>
                {d.date.slice(8).replace(/^0/, "")}
              </span>
            </button>
          ))}
        </div>

        <div className="relative flex" style={{ height: totalHeight }}>
          <div className="relative w-10 shrink-0">
            {slots.map((label, i) => (
              <div key={i} className="absolute left-0 w-full text-right pr-1" style={{ top: i * SLOT_HEIGHT - 5 }}>
                <span className="text-[9px] text-stone-400">{label}</span>
              </div>
            ))}
          </div>

          {weekDays.map((d) => {
            const isClosed = !d.hours;
            const dayRes = byDate[d.date] ?? [];
            return (
              <div key={d.date} className="relative flex-1 border-l border-stone-100">
                {slots.map((_, i) => (
                  <div key={i} className="absolute left-0 right-0 border-t border-stone-50" style={{ top: i * SLOT_HEIGHT }} />
                ))}

                {isClosed && (
                  <div className="absolute inset-0 flex items-center justify-center bg-stone-50/80">
                    <span className="text-[10px] text-stone-300">휴무</span>
                  </div>
                )}

                {!isClosed &&
                  dayRes.map((r) => {
                    const start = kstHourMin(r.starts_at);
                    const end = kstHourMin(r.ends_at);
                    const rStartMin = start.hours * 60 + start.minutes;
                    const rEndMin = end.hours * 60 + end.minutes;
                    const top = ((rStartMin - globalStart) / (globalEnd - globalStart)) * totalHeight;
                    const height = Math.max(18, ((rEndMin - rStartMin) / (globalEnd - globalStart)) * totalHeight);
                    return (
                      <button
                        key={r.id}
                        onClick={() => onSelect(r.id)}
                        className={`absolute inset-x-0.5 overflow-hidden rounded border px-0.5 py-px text-left ${statusColor(r.status)}`}
                        style={{ top, height }}
                      >
                        <p className="truncate text-[10px] font-semibold leading-tight">{r.pet.name}</p>
                        {height > 24 && (
                          <p className="truncate text-[9px] opacity-75 leading-tight">{r.service.name}</p>
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
