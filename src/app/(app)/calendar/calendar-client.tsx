"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, addDays, subDays, addWeeks, subWeeks, startOfWeek } from "date-fns";
import { ko } from "date-fns/locale";
import type { CalendarReservation, ShopCalendarConfig, DayHours } from "@/lib/calendar-data";
import { DayView } from "./day-view";
import { WeekView } from "./week-view";
import { ReservationDetail } from "./reservation-detail";

type WeekDay = { date: string; dayKey: string; hours: DayHours | null };

export function CalendarClient({
  reservations,
  weekDays,
  config,
  currentDate,
  today,
}: {
  reservations: CalendarReservation[];
  weekDays: WeekDay[];
  config: ShopCalendarConfig;
  currentDate: string;
  today: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<"day" | "week">("day");
  const [showCancelled, setShowCancelled] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedReservation = useMemo(
    () => reservations.find((r) => r.id === selectedId) ?? null,
    [reservations, selectedId],
  );

  // 현재 날짜의 영업시간
  const currentDayInfo = weekDays.find((d) => d.date === currentDate);

  function navigate(date: string) {
    router.push(`/calendar?date=${date}`);
  }

  function navDay(offset: number) {
    const d = offset === 0
      ? new Date(today + "T00:00:00+09:00")
      : addDays(new Date(currentDate + "T00:00:00+09:00"), offset);
    navigate(format(d, "yyyy-MM-dd"));
  }

  function navWeek(offset: number) {
    if (offset === 0) {
      navigate(today);
      return;
    }
    const base = new Date(currentDate + "T00:00:00+09:00");
    const d = offset > 0 ? addWeeks(base, 1) : subWeeks(base, 1);
    const ws = startOfWeek(d, { weekStartsOn: 1 });
    navigate(format(ws, "yyyy-MM-dd"));
  }

  // 필터링
  const filtered = useMemo(
    () =>
      reservations.filter((r) => showCancelled || r.status !== "cancelled"),
    [reservations, showCancelled],
  );

  return (
    <div className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8 lg:-mt-8">
      {/* 헤더 */}
      <div className="sticky top-0 z-20 border-b border-stone-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          {/* 뷰 토글 */}
          <div className="flex rounded-lg bg-stone-100 p-0.5">
            <button
              onClick={() => setView("day")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                view === "day"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500"
              }`}
            >
              일간
            </button>
            <button
              onClick={() => setView("week")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                view === "week"
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500"
              }`}
            >
              주간
            </button>
          </div>

          {/* 네비게이션 */}
          {view === "day" ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => navDay(-1)}
                className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100"
              >
                <ChevronLeft />
              </button>
              <button
                onClick={() => navDay(0)}
                className="rounded-lg px-2 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100"
              >
                오늘
              </button>
              <button
                onClick={() => navDay(1)}
                className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100"
              >
                <ChevronRight />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => navWeek(-1)}
                className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100"
              >
                <ChevronLeft />
              </button>
              <button
                onClick={() => navWeek(0)}
                className="rounded-lg px-2 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100"
              >
                이번 주
              </button>
              <button
                onClick={() => navWeek(1)}
                className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100"
              >
                <ChevronRight />
              </button>
            </div>
          )}

          {/* 취소 토글 */}
          <label className="flex items-center gap-1.5 text-[11px] text-stone-400">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
              className="rounded"
            />
            취소
          </label>
        </div>

        {/* 날짜 표시 */}
        <p className="mt-1.5 text-sm font-semibold text-stone-900">
          {view === "day"
            ? format(new Date(currentDate + "T00:00:00+09:00"), "M월 d일 (EEEE)", { locale: ko })
            : `${format(new Date(weekDays[0].date + "T00:00:00+09:00"), "M/d")} – ${format(new Date(weekDays[6].date + "T00:00:00+09:00"), "M/d")}`}
        </p>
      </div>

      {/* 뷰 */}
      {view === "day" ? (
        <DayView
          reservations={filtered.filter((r) => {
            const rDate = r.starts_at.slice(0, 10);
            // KST 변환: timestamptz를 KST 날짜로
            const d = new Date(r.starts_at);
            const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
            const kstDate = format(kst, "yyyy-MM-dd");
            return kstDate === currentDate;
          })}
          hours={currentDayInfo?.hours ?? null}
          slotMinutes={config.slotMinutes}
          isToday={currentDate === today}
          onSelect={setSelectedId}
        />
      ) : (
        <WeekView
          reservations={filtered}
          weekDays={weekDays}
          slotMinutes={config.slotMinutes}
          today={today}
          onSelectDate={(date) => {
            setView("day");
            navigate(date);
          }}
          onSelect={setSelectedId}
        />
      )}

      {/* 상세 다이얼로그 */}
      {selectedReservation && (
        <ReservationDetail
          reservation={selectedReservation}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}
