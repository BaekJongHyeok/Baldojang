"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { addDays, subDays, startOfWeek, format } from "date-fns";
import type { CalendarReservation, ShopCalendarConfig, DayHours } from "@/lib/calendar-data";
import { kstDateStr, formatDateKST } from "@/lib/calendar-utils";
import { toast } from "sonner";
import {
  createReservationAction,
  updateReservationAction,
  changeReservationStatusAction,
  completeWithVisitAction,
} from "@/lib/reservation-actions";
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
  reservations: serverReservations,
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
  // 낙관적 패치: 서버 데이터 위에 로컬 오버라이드를 적용
  // patches: Map<id, partial update> 또는 추가(temp-*) 항목
  const [patches, setPatches] = useState<Map<string, Partial<CalendarReservation> | "remove">>(new Map());
  const [tempItems, setTempItems] = useState<CalendarReservation[]>([]);

  // 서버 prop이 바뀌면 (router.refresh 성공) 낙관적 패치 초기화
  const prevServerRef = useRef(serverReservations);
  useEffect(() => {
    if (prevServerRef.current !== serverReservations) {
      prevServerRef.current = serverReservations;
      setPatches(new Map());
      setTempItems([]);
    }
  }, [serverReservations]);

  // 서버 데이터 + 패치 병합
  const localReservations = useMemo(() => {
    const merged = serverReservations
      .filter((r) => patches.get(r.id) !== "remove")
      .map((r) => {
        const patch = patches.get(r.id);
        if (patch && patch !== "remove") return { ...r, ...patch };
        return r;
      });
    return [...merged, ...tempItems];
  }, [serverReservations, patches, tempItems]);

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [view, setView] = useState<"day" | "week">("day");
  const [showCancelled, setShowCancelled] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(null);
  const [completeId, setCompleteId] = useState<string | null>(null);

  // 서버 prop이 바뀌면 (router.refresh 등) 동기화
  // SSR re-render 시 serverReservations가 바뀌므로 key로 동기화
  const reservations = localReservations;

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

  // --- 낙관적 업데이트 핸들러들 ---

  const handleCreate = useCallback(async (fd: FormData): Promise<{ error?: string; success?: boolean }> => {
    const petId = String(fd.get("pet_id"));
    const serviceId = String(fd.get("service_id"));
    const startsAt = String(fd.get("starts_at"));
    const endsAt = String(fd.get("ends_at"));
    const memo = fd.get("memo") ? String(fd.get("memo")) : null;

    const pet = pets.find((p) => p.id === petId);
    const svc = services.find((s) => s.id === serviceId);
    const tempId = `temp-${Date.now()}`;
    const optimistic: CalendarReservation = {
      id: tempId,
      starts_at: startsAt,
      ends_at: endsAt,
      status: "confirmed",
      memo,
      pet: { id: petId, name: pet?.name ?? "", photo_url: null },
      service: { name: svc?.name ?? "", duration_minutes: svc?.duration_minutes ?? 60 },
      customer: pet?.customer ?? null,
    };

    setTempItems((prev) => [...prev, optimistic]);
    setFormState(null);

    const result = await createReservationAction(fd);
    if (result?.error) {
      setTempItems((prev) => prev.filter((r) => r.id !== tempId));
      toast.error(result.error);
      return result;
    }
    router.refresh();
    return { success: true };
  }, [pets, services, router]);

  const handleUpdate = useCallback(async (fd: FormData): Promise<{ error?: string; success?: boolean }> => {
    const reservationId = String(fd.get("reservation_id"));
    const serviceId = String(fd.get("service_id"));
    const startsAt = String(fd.get("starts_at"));
    const endsAt = String(fd.get("ends_at"));
    const memo = fd.get("memo") ? String(fd.get("memo")) : null;
    const svc = services.find((s) => s.id === serviceId);

    setPatches((prev) => {
      const next = new Map(prev);
      next.set(reservationId, {
        starts_at: startsAt,
        ends_at: endsAt,
        memo,
        service: { name: svc?.name ?? "", duration_minutes: svc?.duration_minutes ?? 60 },
      });
      return next;
    });
    setFormState(null);

    const result = await updateReservationAction(fd);
    if (result?.error) {
      setPatches((prev) => { const next = new Map(prev); next.delete(reservationId); return next; });
      toast.error(result.error);
      return result;
    }
    router.refresh();
    return { success: true };
  }, [services, router]);

  const handleStatusChange = useCallback(async (reservationId: string, status: "no_show" | "cancelled") => {
    setPatches((prev) => { const next = new Map(prev); next.set(reservationId, { status }); return next; });
    setSelectedId(null);

    const fd = new FormData();
    fd.set("reservation_id", reservationId);
    fd.set("status", status);
    const result = await changeReservationStatusAction(fd);
    if (result?.error) {
      setPatches((prev) => { const next = new Map(prev); next.delete(reservationId); return next; });
      toast.error(result.error);
    } else {
      router.refresh();
    }
  }, [router]);

  const handleComplete = useCallback(async (fd: FormData): Promise<{ error?: string; success?: boolean }> => {
    const reservationId = String(fd.get("reservation_id"));
    const actualEndsAt = fd.get("actual_ends_at") ? String(fd.get("actual_ends_at")) : null;

    setPatches((prev) => {
      const next = new Map(prev);
      next.set(reservationId, {
        status: "completed" as const,
        ...(actualEndsAt ? { ends_at: actualEndsAt } : {}),
      });
      return next;
    });
    setCompleteId(null);
    setSelectedId(null);

    const result = await completeWithVisitAction(fd);
    if (result?.error) {
      setPatches((prev) => { const next = new Map(prev); next.delete(reservationId); return next; });
      toast.error(result.error);
      return result;
    }
    router.refresh();
    return { success: true };
  }, [router]);

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
          onSlotClick={(time) => setFormState({ mode: "create", time })}
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
          onStatusChange={handleStatusChange}
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
          onSubmit={formState.mode === "edit" ? handleUpdate : handleCreate}
        />
      )}

      {completeReservation && (
        <CompleteDialog
          reservationId={completeReservation.id}
          petName={completeReservation.pet.name}
          startsAt={completeReservation.starts_at}
          endsAt={completeReservation.ends_at}
          slotMinutes={config.slotMinutes}
          onClose={() => setCompleteId(null)}
          onSubmit={handleComplete}
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
