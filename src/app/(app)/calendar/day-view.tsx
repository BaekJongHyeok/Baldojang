"use client";

import { useEffect, useRef } from "react";
import type { CalendarReservation, DayHours } from "@/lib/calendar-data";
import { kstHourMin, nowKSTMinutes } from "@/lib/calendar-utils";

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
      return "bg-stone-50 border-stone-200 text-stone-400 line-through opacity-50";
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
      containerRef.current.scrollTop = Math.max(0, nowTop - 100);
    }
  }, [isToday, nowTop]);

  return (
    <div ref={containerRef} className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 160px)" }}>
      <div className="relative mx-2 my-2" style={{ height: totalHeight }}>
        {/* 슬롯 라인 */}
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

        {/* 블록 컨테이너 */}
        <div className="absolute top-0 bottom-0 left-11 right-1">
          {reservations.map((r) => {
            const s = kstHourMin(r.starts_at);
            const e = kstHourMin(r.ends_at);
            const rStartMin = s.hours * 60 + s.minutes;
            const rEndMin = e.hours * 60 + e.minutes;
            const top = (rStartMin - startMin) * pxPerMin;
            const height = Math.max(24, (rEndMin - rStartMin) * pxPerMin);

            return (
              <button
                key={r.id}
                onClick={(e) => { e.stopPropagation(); onSelect(r.id); }}
                className={`absolute left-0 right-0 z-[5] overflow-hidden rounded-lg border px-2 py-1 text-left transition hover:shadow-sm ${statusStyle(r.status)}`}
                style={{ top, height }}
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
          })}
        </div>

        {/* 현재 시각 라인 */}
        {nowTop !== null && (
          <div className="absolute left-0 right-0 z-10 border-t-2 border-red-500" style={{ top: nowTop }}>
            <div className="absolute -left-0.5 -top-1 h-2 w-2 rounded-full bg-red-500" />
          </div>
        )}
      </div>
    </div>
  );
}
