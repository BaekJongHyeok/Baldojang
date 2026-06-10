"use client";

import { useMemo, useEffect, useRef } from "react";
import { format } from "date-fns";
import type { CalendarReservation, DayHours } from "@/lib/calendar-data";

const SLOT_HEIGHT = 48; // px per slot

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function kstTime(iso: string): { hours: number; minutes: number } {
  const d = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return { hours: kst.getUTCHours(), minutes: kst.getUTCMinutes() };
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
}: {
  reservations: CalendarReservation[];
  hours: DayHours | null;
  slotMinutes: number;
  isToday: boolean;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 휴무
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

  // 슬롯 라벨
  const slots = Array.from({ length: totalSlots }, (_, i) => {
    const min = startMin + i * slotMinutes;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  });

  // 현재 시각 위치
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const nowMin = kstNow.getUTCHours() * 60 + kstNow.getUTCMinutes();
  const nowTop =
    isToday && nowMin >= startMin && nowMin <= endMin
      ? ((nowMin - startMin) / (endMin - startMin)) * totalHeight
      : null;

  // 오늘이면 현재 시각 근처로 스크롤
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
            className="absolute left-0 right-0 border-t border-stone-100"
            style={{ top: i * SLOT_HEIGHT }}
          >
            <span className="absolute -top-2.5 left-0 text-[10px] text-stone-400 w-10">
              {label}
            </span>
          </div>
        ))}

        {/* 예약 블록 */}
        {reservations.map((r) => {
          const start = kstTime(r.starts_at);
          const end = kstTime(r.ends_at);
          const rStartMin = start.hours * 60 + start.minutes;
          const rEndMin = end.hours * 60 + end.minutes;
          const top = ((rStartMin - startMin) / (endMin - startMin)) * totalHeight;
          const height = Math.max(
            24,
            ((rEndMin - rStartMin) / (endMin - startMin)) * totalHeight,
          );
          return (
            <button
              key={r.id}
              onClick={() => onSelect(r.id)}
              className={`absolute left-11 right-1 overflow-hidden rounded-lg border px-2 py-1 text-left transition hover:shadow-sm ${statusStyle(r.status)}`}
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

        {/* 현재 시각 라인 */}
        {nowTop !== null && (
          <div
            className="absolute left-0 right-0 z-10 border-t-2 border-red-500"
            style={{ top: nowTop }}
          >
            <div className="absolute -left-0.5 -top-1 h-2 w-2 rounded-full bg-red-500" />
          </div>
        )}
      </div>
    </div>
  );
}
