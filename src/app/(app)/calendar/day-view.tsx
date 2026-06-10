"use client";

import { useEffect, useRef, useMemo } from "react";
import type { CalendarReservation, DayHours } from "@/lib/calendar-data";
import { kstHourMin, nowKSTMinutes, layoutOverlaps } from "@/lib/calendar-utils";

const SLOT_HEIGHT = 48;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function statusStyle(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-blue-50 border-blue-200 text-blue-900";
    case "completed":
      return "bg-stone-50 border-stone-200 text-stone-500";
    case "no_show":
      return "bg-red-50 border-red-200 text-red-800";
    case "cancelled":
      return "bg-stone-50 border-stone-200 text-stone-400 line-through";
    default:
      return "bg-stone-50 border-stone-200";
  }
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
      <div className="flex items-center justify-center py-24 text-sm text-stone-400">
        휴무일입니다
      </div>
    );
  }

  const startMin = timeToMinutes(hours.open);
  const endMin = timeToMinutes(hours.close);
  const totalSlots = Math.ceil((endMin - startMin) / slotMinutes);
  const totalHeight = totalSlots * SLOT_HEIGHT;

  const slots = Array.from({ length: totalSlots }, (_, i) => {
    const min = startMin + i * slotMinutes;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  });

  const nowMin = nowKSTMinutes();
  const nowTop =
    isToday && nowMin >= startMin && nowMin <= endMin
      ? ((nowMin - startMin) / (endMin - startMin)) * totalHeight
      : null;

  useEffect(() => {
    if (isToday && containerRef.current && nowTop !== null) {
      containerRef.current.scrollTop = Math.max(0, nowTop - 100);
    }
  }, [isToday, nowTop]);

  return (
    <div ref={containerRef} className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 160px)" }}>
      <div className="relative mx-2 my-2" style={{ height: totalHeight }}>
        {slots.map((label, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 border-t border-stone-100 cursor-pointer"
            style={{ top: i * SLOT_HEIGHT, height: SLOT_HEIGHT }}
            onClick={() => onSlotClick?.(label)}
          >
            <span className="absolute -top-2.5 left-0 text-[10px] text-stone-400 w-10 pointer-events-none">{label}</span>
          </div>
        ))}

        {(() => {
          const items = reservations.map((r) => {
            const s = kstHourMin(r.starts_at);
            const e = kstHourMin(r.ends_at);
            return { id: r.id, startMin: s.hours * 60 + s.minutes, endMin: e.hours * 60 + e.minutes };
          });
          const layout = layoutOverlaps(items);
          const GUTTER_LEFT = 44; // px (w-11 = 2.75rem ≈ 44px)
          const GUTTER_RIGHT = 4;

          return reservations.map((r) => {
            const s = kstHourMin(r.starts_at);
            const e = kstHourMin(r.ends_at);
            const rStartMin = s.hours * 60 + s.minutes;
            const rEndMin = e.hours * 60 + e.minutes;
            const top = ((rStartMin - startMin) / (endMin - startMin)) * totalHeight;
            const height = Math.max(24, ((rEndMin - rStartMin) / (endMin - startMin)) * totalHeight);
            const l = layout.get(r.id) ?? { col: 0, totalCols: 1 };
            const colWidth = 100 / l.totalCols;
            const left = `calc(${GUTTER_LEFT}px + ${l.col * colWidth}% * (100% - ${GUTTER_LEFT + GUTTER_RIGHT}px) / 100)`;
            const width = `calc(${colWidth}% * (100% - ${GUTTER_LEFT + GUTTER_RIGHT}px) / 100 - 2px)`;

            return (
              <button
                key={r.id}
                onClick={(e) => { e.stopPropagation(); onSelect(r.id); }}
                className={`absolute z-[5] overflow-hidden rounded-lg border px-1.5 py-1 text-left transition hover:shadow-sm ${statusStyle(r.status)}`}
                style={{ top, height, left, width }}
              >
                <p className="truncate text-xs font-semibold">{r.pet.name}</p>
                <p className="truncate text-[10px] opacity-75">
                  {r.service.name}
                  {r.customer && ` · ${r.customer.name}`}
                </p>
                {r.status === "completed" && (
                  <span className="absolute right-1.5 top-1 text-[10px]">✓</span>
                )}
              </button>
            );
          });
        })()}

        {nowTop !== null && (
          <div className="absolute left-0 right-0 z-10 border-t-2 border-red-500" style={{ top: nowTop }}>
            <div className="absolute -left-0.5 -top-1 h-2 w-2 rounded-full bg-red-500" />
          </div>
        )}
      </div>
    </div>
  );
}
