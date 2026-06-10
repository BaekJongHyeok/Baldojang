"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { addDays, subDays, startOfWeek, format } from "date-fns";
import type { CalendarReservation, ShopCalendarConfig, DayHours } from "@/lib/calendar-data";
import { kstDateStr, formatDateKST } from "@/lib/calendar-utils";
import { DayView } from "./day-view";
import { WeekView } from "./week-view";
import { ReservationDetail } from "./reservation-detail";

type DayInfo = { date: string; dayKey: string; hours: DayHours | null };

export function CalendarClient({
  reservations,
  allDays,
  config,
  initialDate,
  today,
}: {
  reservations: CalendarReservation[];
  allDays: DayInfo[];
  config: ShopCalendarConfig;
  initialDate: string;
  today: string;
}) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [view, setView] = useState<"day" | "week">("day");
  const [showCancelled, setShowCancelled] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 데이터 범위 (allDays의 첫날~마지막날)
  const rangeStart = allDays[0].date;
  const rangeEnd = allDays[allDays.length - 1].date;

  // 선택된 날짜가 데이터 범위 내인지 확인, 벗어나면 서버 이동
  function navigateTo(dateStr: string) {
    if (dateStr >= rangeStart && dateStr <= rangeEnd) {
      setSelectedDate(dateStr);
    } else {
      router.push(`/calendar?date=${dateStr}`);
    }
  }

  // 선택 날짜의 주간 (월~일)
  const currentWeekDays = useMemo(() => {
    const ws = startOfWeek(new Date(selectedDate + "T00:00:00Z"), { weekStartsOn: 1 });
    const wsStr = format(ws, "yyyy-MM-dd");
    const startIdx = allDays.findIndex((d) => d.date === wsStr);
    if (startIdx === -1) return allDays.slice(0, 7);
    return allDays.slice(startIdx, startIdx + 7);
  }, [selectedDate, allDays]);

  // 현재 날짜 정보
  const currentDayInfo = allDays.find((d) => d.date === selectedDate);

  // 취소 필터
  const filtered = useMemo(
    () => reservations.filter((r) => showCancelled || r.status !== "cancelled"),
    [reservations, showCancelled],
  );

  // 일간 뷰용: 선택 날짜의 예약만
  const dayReservations = useMemo(
    () => filtered.filter((r) => kstDateStr(r.starts_at) === selectedDate),
    [filtered, selectedDate],
  );

  // 주간 뷰용: 현재 주 예약만
  const weekReservations = useMemo(() => {
    if (currentWeekDays.length === 0) return [];
    const ws = currentWeekDays[0].date;
    const we = currentWeekDays[currentWeekDays.length - 1].date;
    return filtered.filter((r) => {
      const d = kstDateStr(r.starts_at);
      return d >= ws && d <= we;
    });
  }, [filtered, currentWeekDays]);

  const selectedReservation = useMemo(
    () => reservations.find((r) => r.id === selectedId) ?? null,
    [reservations, selectedId],
  );

  // 일간 네비
  function navDay(offset: number) {
    if (offset === 0) {
      navigateTo(today);
      return;
    }
    const d = addDays(new Date(selectedDate + "T00:00:00Z"), offset);
    navigateTo(format(d, "yyyy-MM-dd"));
  }

  // 주간 네비
  function navWeek(offset: number) {
    if (offset === 0) {
      navigateTo(today);
      return;
    }
    const base = new Date(selectedDate + "T00:00:00Z");
    const ws = startOfWeek(
      offset > 0 ? addDays(base, 7) : subDays(base, 7),
      { weekStartsOn: 1 },
    );
    navigateTo(format(ws, "yyyy-MM-dd"));
  }

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
                view === "day" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
              }`}
            >
              일간
            </button>
            <button
              onClick={() => setView("week")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                view === "week" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"
              }`}
            >
              주간
            </button>
          </div>

          {/* 네비게이션 */}
          {view === "day" ? (
            <div className="flex items-center gap-1.5">
              <button onClick={() => navDay(-1)} className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100">
                <ChevronLeft />
              </button>
              <button onClick={() => navDay(0)} className="rounded-lg px-2 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100">
                오늘
              </button>
              <button onClick={() => navDay(1)} className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100">
                <ChevronRight />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button onClick={() => navWeek(-1)} className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100">
                <ChevronLeft />
              </button>
              <button onClick={() => navWeek(0)} className="rounded-lg px-2 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100">
                이번 주
              </button>
              <button onClick={() => navWeek(1)} className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100">
                <ChevronRight />
              </button>
            </div>
          )}

          {/* 취소 토글 */}
          <label className="flex items-center gap-1.5 text-[11px] text-stone-400">
            <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} className="rounded" />
            취소
          </label>
        </div>

        {/* 날짜 표시 */}
        <p className="mt-1.5 text-sm font-semibold text-stone-900">
          {view === "day"
            ? formatDateKST(selectedDate, "M월 d일 (EEEE)")
            : currentWeekDays.length >= 7
              ? `${formatDateKST(currentWeekDays[0].date, "M/d")} – ${formatDateKST(currentWeekDays[6].date, "M/d")}`
              : ""}
        </p>
      </div>

      {/* 뷰 */}
      {view === "day" ? (
        <DayView
          reservations={dayReservations}
          hours={currentDayInfo?.hours ?? null}
          slotMinutes={config.slotMinutes}
          isToday={selectedDate === today}
          onSelect={setSelectedId}
        />
      ) : (
        <WeekView
          reservations={weekReservations}
          weekDays={currentWeekDays}
          slotMinutes={config.slotMinutes}
          today={today}
          onSelectDate={(date) => {
            setSelectedDate(date);
            setView("day");
          }}
          onSelect={setSelectedId}
        />
      )}

      {/* 상세 다이얼로그 */}
      {selectedReservation && (
        <ReservationDetail reservation={selectedReservation} onClose={() => setSelectedId(null)} />
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
