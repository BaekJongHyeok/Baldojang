"use client";

import { useEffect, useRef, useMemo } from "react";
import type { CalendarReservation, DayHours } from "@/lib/calendar-data";
import { kstHourMin, nowKSTMinutes } from "@/lib/calendar-utils";

const SLOT_HEIGHT = 48;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/* -- Status styles: color + icon for accessibility -- */
function statusStyle(status: string) {
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

function StatusIcon({ status, className }: { status: string; className?: string }) {
  if (status === "completed")
    return (
      <svg className={className} fill="none" viewBox="0 0 16 16" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.5l3.5 3.5L13 5" />
      </svg>
    );
  if (status === "no_show")
    return (
      <svg className={className} fill="none" viewBox="0 0 16 16" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l8 8M12 4l-8 8" />
      </svg>
    );
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

  if (!hours) {
    return (
      <div className="flex items-center justify-center py-24 text-[14px] text-ink-caption">
        휴무일입니다
      </div>
    );
  }

  const startMin = timeToMinutes(hours.open);
  const endMin = timeToMinutes(hours.close);
  const totalSlots = Math.ceil((endMin - startMin) / slotMinutes);
  const totalHeight = totalSlots * SLOT_HEIGHT;
  const pxPerMin = totalHeight / (endMin - startMin);

  const slots = Array.from({ length: totalSlots }, (_, i) => {
    const min = startMin + i * slotMinutes;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  });

  const nowMin = nowKSTMinutes();
  const nowTop =
    isToday && nowMin >= startMin && nowMin <= endMin
      ? (nowMin - startMin) * pxPerMin
      : null;

  useEffect(() => {
    if (isToday && containerRef.current && nowTop !== null) {
      containerRef.current.scrollTop = Math.max(0, nowTop - 120);
    }
  }, [isToday, nowTop]);

  // DEV: overlap check
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const active = reservations.filter((r) => r.status !== "cancelled");
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const a = active[i], b = active[j];
        if (a.starts_at < b.ends_at && b.starts_at < a.ends_at) {
          console.warn(
            `[Calendar overlap] "${a.pet.name}" (${a.starts_at}~${a.ends_at}) ↔ "${b.pet.name}" (${b.starts_at}~${b.ends_at})`,
          );
        }
      }
    }
  }, [reservations]);

  return (
    <div ref={containerRef} className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 160px)" }}>
      <div className="relative mx-2 my-2" style={{ height: totalHeight }}>
        {/* slot lines */}
        {slots.map((label, i) => (
          <div
            key={i}
            className="group absolute left-0 right-0 cursor-pointer border-t border-border-light"
            style={{ top: i * SLOT_HEIGHT, height: SLOT_HEIGHT }}
            onClick={() => onSlotClick?.(label)}
          >
            <span className="absolute -top-2.5 left-0 w-10 text-[11px] text-ink-disabled tabular-nums pointer-events-none">
              {label}
            </span>
            {/* + hint on hover */}
            <span className="absolute right-2 top-1/2 -translate-y-1/2 hidden h-6 items-center gap-0.5 rounded-sm bg-primary-light px-2 text-[11px] font-medium text-primary pointer-events-none group-hover:flex">
              + 예약
            </span>
          </div>
        ))}

        {/* block container */}
        <div className="absolute top-0 bottom-0 left-11 right-1">
          {reservations.map((r) => {
            const s = kstHourMin(r.starts_at);
            const e = kstHourMin(r.ends_at);
            const rStartMin = s.hours * 60 + s.minutes;
            const rEndMin = e.hours * 60 + e.minutes;
            const top = (rStartMin - startMin) * pxPerMin;
            const height = Math.max(32, (rEndMin - rStartMin) * pxPerMin);

            return (
              <button
                key={r.id}
                onClick={(ev) => { ev.stopPropagation(); onSelect(r.id); }}
                className={`absolute left-0 right-0 z-[5] flex items-start gap-2 overflow-hidden rounded-md border px-2.5 py-1.5 text-left transition-colors duration-150 hover:brightness-95 ${statusStyle(r.status)}`}
                style={{ top, height }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="truncate text-[12px] font-semibold">{r.pet.name}</p>
                    <StatusIcon status={r.status} className="h-3.5 w-3.5 shrink-0" />
                  </div>
                  {height >= 48 && (
                    <p className="truncate text-[11px] opacity-70">
                      {r.service.name}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* now line */}
        {nowTop !== null && (
          <div className="absolute left-0 right-0 z-10 flex items-center" style={{ top: nowTop }}>
            <div className="h-2 w-2 rounded-full bg-primary -ml-1" />
            <div className="flex-1 border-t border-primary" />
            <span className="ml-1 rounded-sm bg-primary px-1 py-px text-[9px] font-bold text-white tabular-nums">
              {`${String(Math.floor(nowMin / 60)).padStart(2, "0")}:${String(nowMin % 60).padStart(2, "0")}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
