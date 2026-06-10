"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { addDays, subDays, startOfWeek, format } from "date-fns";
import type { CalendarReservation, ShopCalendarConfig, DayHours } from "@/lib/calendar-data";
import { kstDateStr, formatDateKST } from "@/lib/calendar-utils";
import { DayView } from "./day-view";
import { WeekView } from "./week-view";
import { ReservationDetail } from "./reservation-detail";
import { ReservationForm, type FormPet, type FormService } from "./reservation-form";
import { CompleteDialog } from "./complete-dialog";

type DayInfo = { date: string; dayKey: string; hours: DayHours | null };

type FormState =
  | null
  | { mode: "create"; time?: string }
  | { mode: "edit"; reservation: CalendarReservation };

export function CalendarClient({
  reservations,
  allDays,
  config,
  initialDate,
  today,
  pets,
  services,
}: {
  reservations: CalendarReservation[];
  allDays: DayInfo[];
  config: ShopCalendarConfig;
  initialDate: string;
  today: string;
  pets: FormPet[];
  services: FormService[];
}) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [view, setView] = useState<"day" | "week">("day");
  const [showCancelled, setShowCancelled] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(null);
  const [completeId, setCompleteId] = useState<string | null>(null);

  const rangeStart = allDays[0].date;
  const rangeEnd = allDays[allDays.length - 1].date;

  function navigateTo(dateStr: string) {
    if (dateStr >= rangeStart && dateStr <= rangeEnd) {
      setSelectedDate(dateStr);
    } else {
      router.push(`/calendar?date=${dateStr}`);
    }
  }

  const currentWeekDays = useMemo(() => {
    const ws = startOfWeek(new Date(selectedDate + "T00:00:00Z"), { weekStartsOn: 1 });
    const wsStr = format(ws, "yyyy-MM-dd");
    const startIdx = allDays.findIndex((d) => d.date === wsStr);
    if (startIdx === -1) return allDays.slice(0, 7);
    return allDays.slice(startIdx, startIdx + 7);
  }, [selectedDate, allDays]);

  const currentDayInfo = allDays.find((d) => d.date === selectedDate);

  const filtered = useMemo(
    () => reservations.filter((r) => showCancelled || r.status !== "cancelled"),
    [reservations, showCancelled],
  );

  const dayReservations = useMemo(
    () => filtered.filter((r) => kstDateStr(r.starts_at) === selectedDate),
    [filtered, selectedDate],
  );

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

  const completeReservation = useMemo(
    () => reservations.find((r) => r.id === completeId) ?? null,
    [reservations, completeId],
  );

  function navDay(offset: number) {
    if (offset === 0) { navigateTo(today); return; }
    navigateTo(format(addDays(new Date(selectedDate + "T00:00:00Z"), offset), "yyyy-MM-dd"));
  }

  function navWeek(offset: number) {
    if (offset === 0) { navigateTo(today); return; }
    const base = new Date(selectedDate + "T00:00:00Z");
    const ws = startOfWeek(offset > 0 ? addDays(base, 7) : subDays(base, 7), { weekStartsOn: 1 });
    navigateTo(format(ws, "yyyy-MM-dd"));
  }

  function handleFormSuccess() {
    setFormState(null);
    router.refresh();
  }

  function handleCompleteSuccess() {
    setCompleteId(null);
    setSelectedId(null);
    router.refresh();
  }

  function handleSlotClick(time: string) {
    setFormState({ mode: "create", time });
  }

  return (
    <div className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8 lg:-mt-8">
      {/* 헤더 */}
      <div className="sticky top-0 z-20 border-b border-stone-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex rounded-lg bg-stone-100 p-0.5">
            <button onClick={() => setView("day")} className={`rounded-md px-3 py-1 text-xs font-medium transition ${view === "day" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}>일간</button>
            <button onClick={() => setView("week")} className={`rounded-md px-3 py-1 text-xs font-medium transition ${view === "week" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500"}`}>주간</button>
          </div>

          {view === "day" ? (
            <div className="flex items-center gap-1.5">
              <button onClick={() => navDay(-1)} className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100"><ChevronLeft /></button>
              <button onClick={() => navDay(0)} className="rounded-lg px-2 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100">오늘</button>
              <button onClick={() => navDay(1)} className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100"><ChevronRight /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button onClick={() => navWeek(-1)} className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100"><ChevronLeft /></button>
              <button onClick={() => navWeek(0)} className="rounded-lg px-2 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100">이번 주</button>
              <button onClick={() => navWeek(1)} className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100"><ChevronRight /></button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] text-stone-400">
              <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} className="rounded" />취소
            </label>
            {/* 데스크톱: 헤더 내 + 예약 버튼 */}
            <button onClick={() => setFormState({ mode: "create" })} className="hidden rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800 lg:block">
              + 예약
            </button>
          </div>
        </div>

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
          onSlotClick={handleSlotClick}
        />
      ) : (
        <WeekView
          reservations={weekReservations}
          weekDays={currentWeekDays}
          slotMinutes={config.slotMinutes}
          today={today}
          onSelectDate={(date) => { setSelectedDate(date); setView("day"); }}
          onSelect={setSelectedId}
        />
      )}

      {/* 모바일 플로팅 버튼 */}
      <button
        onClick={() => setFormState({ mode: "create" })}
        className="fixed bottom-20 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-stone-900 text-xl text-white shadow-lg hover:bg-stone-800 lg:hidden"
      >
        +
      </button>

      {/* 다이얼로그들 */}
      {selectedReservation && !formState && !completeId && (
        <ReservationDetail
          reservation={selectedReservation}
          onClose={() => setSelectedId(null)}
          onComplete={() => { setCompleteId(selectedReservation.id); setSelectedId(null); }}
          onEdit={() => { setFormState({ mode: "edit", reservation: selectedReservation }); setSelectedId(null); }}
        />
      )}

      {formState && (
        <ReservationForm
          pets={pets}
          services={services}
          hours={currentDayInfo?.hours ?? null}
          slotMinutes={config.slotMinutes}
          date={selectedDate}
          initialTime={formState.mode === "create" ? formState.time : undefined}
          existingReservations={dayReservations}
          editReservation={formState.mode === "edit" ? formState.reservation : undefined}
          onClose={() => setFormState(null)}
          onSuccess={handleFormSuccess}
        />
      )}

      {completeReservation && (
        <CompleteDialog
          reservationId={completeReservation.id}
          petName={completeReservation.pet.name}
          onClose={() => { setCompleteId(null); handleCompleteSuccess(); }}
          onSuccess={handleCompleteSuccess}
        />
      )}
    </div>
  );
}

function ChevronLeft() {
  return (<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>);
}
function ChevronRight() {
  return (<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>);
}
