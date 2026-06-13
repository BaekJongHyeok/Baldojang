"use client";

import { useState, useMemo, useCallback, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDays, subDays, startOfWeek, format } from "date-fns";
import type { CalendarReservation, ShopCalendarConfig, DayHours } from "@/lib/calendar-data";
import { kstDateStr, formatDateKST } from "@/lib/calendar-utils";
import { toast } from "sonner";
import {
  createReservationAction,
  updateReservationAction,
  changeReservationStatusAction,
  deleteReservationAction,
  revertCompletionAction,
  completeWithVisitAction,
} from "@/lib/reservation-actions";
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
  passes,
  bookPetId,
  openNew,
}: {
  reservations: CalendarReservation[];
  allDays: DayInfo[];
  config: ShopCalendarConfig;
  initialDate: string;
  today: string;
  pets: FormPet[];
  services: FormService[];
  passes: { id: string; type: string; name: string; total_amount: number | null; total_count: number | null; balance: number | null; remaining: number | null; expires_at: string | null; disabled_at?: string | null; customerId: string }[];
  bookPetId?: string;
  openNew?: boolean;
}) {
  const router = useRouter();
  const [patches, setPatches] = useState<Map<string, Partial<CalendarReservation> | "remove">>(new Map());
  const [tempItems, setTempItems] = useState<CalendarReservation[]>([]);

  const prevServerRef = useRef(serverReservations);
  useEffect(() => {
    if (prevServerRef.current !== serverReservations) {
      prevServerRef.current = serverReservations;
      setPatches(new Map());
      setTempItems([]);
    }
  }, [serverReservations]);

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
  // initialDate가 변경되면(router.push 후) selectedDate 동기화
  const prevInitialDateRef = useRef(initialDate);
  useEffect(() => {
    if (prevInitialDateRef.current !== initialDate) {
      prevInitialDateRef.current = initialDate;
      setSelectedDate(initialDate);
    }
  }, [initialDate]);
  const [showCancelled, setShowCancelled] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(null);
  const [completeId, setCompleteId] = useState<string | null>(null);

  // ?book= 파라미터: 마운트 시 1회, 유효한 펫이면 생성 폼 자동 오픈
  // ?book= 또는 ?new=1: 마운트 시 1회 예약 생성 폼 자동 오픈
  const bookHandledRef = useRef(false);
  useEffect(() => {
    if (bookHandledRef.current) return;
    if (!bookPetId && !openNew) return;
    bookHandledRef.current = true;
    if (bookPetId) {
      const pet = pets.find((p) => p.id === bookPetId);
      if (pet) setFormState({ mode: "create" });
    } else if (openNew) {
      setFormState({ mode: "create" });
    }
    router.replace(`/calendar?date=${initialDate}`, { scroll: false });
  }, [bookPetId, openNew, pets, router, initialDate]);

  const reservations = localReservations;
  const rangeStart = allDays[0].date;
  const rangeEnd = allDays[allDays.length - 1].date;

  const [, startTransition] = useTransition();

  function navigateTo(dateStr: string) {
    if (dateStr >= rangeStart && dateStr <= rangeEnd) {
      // 범위 안: 즉시 화면 전환 + 백그라운드로 데이터 창을 새 날짜 중심으로 재요청.
      // 다음 ◀▶도 항상 범위 안에 머물러 "한 번 걸러 느려지는" 경계 왕복이 사라진다.
      setSelectedDate(dateStr);
      startTransition(() => {
        router.replace(`/calendar?date=${dateStr}`, { scroll: false });
      });
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
    return filtered.filter((r) => { const d = kstDateStr(r.starts_at); return d >= ws && d <= we; });
  }, [filtered, currentWeekDays]);

  const selectedReservation = useMemo(() => reservations.find((r) => r.id === selectedId) ?? null, [reservations, selectedId]);
  const completeReservation = useMemo(() => reservations.find((r) => r.id === completeId) ?? null, [reservations, completeId]);

  function navWeek(offset: number) {
    if (offset === 0) { navigateTo(today); return; }
    const base = new Date(selectedDate + "T00:00:00Z");
    const ws = startOfWeek(offset > 0 ? addDays(base, 7) : subDays(base, 7), { weekStartsOn: 1 });
    navigateTo(format(ws, "yyyy-MM-dd"));
  }

  // --- 낙관적 업데이트 핸들러들 (전부 기존 로직 유지) ---

  const handleCreate = useCallback(async (fd: FormData): Promise<{ error?: string; success?: boolean }> => {
    const petId = String(fd.get("pet_id"));
    const serviceId = String(fd.get("service_id"));
    const startsAt = String(fd.get("starts_at"));
    const endsAt = String(fd.get("ends_at"));
    const memo = fd.get("memo") ? String(fd.get("memo")) : null;
    const pet = pets.find((p) => p.id === petId);
    const svc = services.find((s) => s.id === serviceId);
    const tempId = `temp-${Date.now()}`;
    const priceQuoted = fd.get("price_quoted") ? Number(fd.get("price_quoted")) : null;
    const optimistic: CalendarReservation = { id: tempId, starts_at: startsAt, ends_at: endsAt, status: "confirmed", memo, price_quoted: priceQuoted, pet: { id: petId, name: pet?.name ?? "", photo_url: null, caution_tags: pet?.caution_tags ?? [] }, service: { name: svc?.name ?? "", duration_minutes: svc?.duration_minutes ?? 60 }, customer: pet?.customer ?? null, visit_ends_at: null };
    setTempItems((prev) => [...prev, optimistic]);
    setFormState(null);
    const result = await createReservationAction(fd);
    if (result?.error) { setTempItems((prev) => prev.filter((r) => r.id !== tempId)); toast.error(result.error); return result; }
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
    setPatches((prev) => { const next = new Map(prev); next.set(reservationId, { starts_at: startsAt, ends_at: endsAt, memo, service: { name: svc?.name ?? "", duration_minutes: svc?.duration_minutes ?? 60 } }); return next; });
    setFormState(null);
    const result = await updateReservationAction(fd);
    if (result?.error) { setPatches((prev) => { const next = new Map(prev); next.delete(reservationId); return next; }); toast.error(result.error); return result; }
    router.refresh();
    return { success: true };
  }, [services, router]);

  const handleStatusChange = useCallback(async (reservationId: string, status: "confirmed" | "no_show" | "cancelled") => {
    setPatches((prev) => { const next = new Map(prev); next.set(reservationId, { status }); return next; });
    setSelectedId(null);
    const fd = new FormData();
    fd.set("reservation_id", reservationId);
    fd.set("status", status);
    const result = await changeReservationStatusAction(fd);
    if (result?.error) { setPatches((prev) => { const next = new Map(prev); next.delete(reservationId); return next; }); toast.error(result.error); }
    else router.refresh();
  }, [router]);

  const handleDelete = useCallback(async (reservationId: string) => {
    setPatches((prev) => { const next = new Map(prev); next.set(reservationId, "remove"); return next; });
    setSelectedId(null);
    const fd = new FormData();
    fd.set("reservation_id", reservationId);
    const result = await deleteReservationAction(fd);
    if (result?.error) { setPatches((prev) => { const next = new Map(prev); next.delete(reservationId); return next; }); toast.error(result.error); }
    else { toast.success("예약이 삭제됐어요."); router.refresh(); }
  }, [router]);

  const handleRevertCompletion = useCallback(async (reservationId: string) => {
    setPatches((prev) => { const next = new Map(prev); next.set(reservationId, { status: "confirmed" as const, visit_ends_at: null }); return next; });
    setSelectedId(null);
    const fd = new FormData();
    fd.set("reservation_id", reservationId);
    const result = await revertCompletionAction(fd);
    if (result?.error) { setPatches((prev) => { const next = new Map(prev); next.delete(reservationId); return next; }); toast.error(result.error); }
    else { toast.success("완료가 되돌려졌어요."); router.refresh(); }
  }, [router]);

  const handleComplete = useCallback(async (fd: FormData): Promise<{ error?: string; success?: boolean; visitId?: string; passExhausted?: boolean }> => {
    const reservationId = String(fd.get("reservation_id"));
    const actualEndsAt = fd.get("actual_ends_at") ? String(fd.get("actual_ends_at")) : null;
    setPatches((prev) => { const next = new Map(prev); next.set(reservationId, { status: "completed" as const, ...(actualEndsAt ? { visit_ends_at: actualEndsAt } : {}) }); return next; });
    setSelectedId(null);
    const result = await completeWithVisitAction(fd);
    if (result?.error) { setPatches((prev) => { const next = new Map(prev); next.delete(reservationId); return next; }); toast.error(result.error); return result; }
    // 선불권 소진 여부 확인 (성공 화면에서 표시)
    let passExhausted = false;
    const passId = String(fd.get("pass_id") ?? "");
    if (passId) {
      const passType = String(fd.get("pass_type") ?? "");
      const passAmount = Number(fd.get("pass_amount") ?? 0);
      const usedPass = passes.find((p) => p.id === passId);
      if (usedPass) {
        const newBalance = passType === "amount" ? (usedPass.balance ?? 0) - passAmount : (usedPass.remaining ?? 0) - 1;
        passExhausted = newBalance <= 0;
      }
    }
    router.refresh();
    return { success: true, visitId: result.visitId, passExhausted };
  }, [router, passes]);

  // --- 헤더 날짜 텍스트 ---
  const weekDateDisplay = currentWeekDays.length >= 7
    ? `${formatDateKST(currentWeekDays[0].date, "M월 d일")} – ${formatDateKST(currentWeekDays[6].date, "M월 d일")}`
    : "";

  return (
    <div className="-mx-4 -mt-5 sm:-mx-6 lg:-mx-8 lg:-mt-6">
      {/* ── 헤더 ── */}
      <div className="sticky top-0 z-20 border-b border-border bg-white">
        <div className="flex items-center justify-between px-4 py-2.5 lg:px-6">
          {/* 좌: 오늘 + 네비 + 날짜 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateTo(today)}
              className="rounded-md border border-border px-2.5 py-1 text-[13px] font-medium text-ink hover:bg-bg"
            >
              오늘
            </button>
            {/* 주 단위 네비게이션 (모바일/데스크톱 공통) */}
            <div className="flex">
              <button onClick={() => navWeek(-1)} className="rounded-l-md border border-border p-1.5 text-ink-caption hover:bg-bg"><ChevronLeft /></button>
              <button onClick={() => navWeek(1)} className="-ml-px rounded-r-md border border-border p-1.5 text-ink-caption hover:bg-bg"><ChevronRight /></button>
            </div>
            <h2 className="text-[16px] font-semibold text-ink ml-1 hidden sm:block">{weekDateDisplay}</h2>
          </div>

          {/* 우: 취소 필터 + 예약 버튼 */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-[11px] text-ink-caption mr-1">
              <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} className="rounded" />취소
            </label>
            <div className="hidden lg:block">
              <button onClick={() => setFormState({ mode: "create" })} className="rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-white hover:bg-primary-hover">+ 예약</button>
            </div>
          </div>
        </div>
        {/* 모바일 날짜 (sm 미만에서만) */}
        <p className="px-4 pb-2 text-[14px] font-semibold text-ink sm:hidden">{weekDateDisplay}</p>
      </div>

      {/* ── 주간 뷰 (모바일: 가로 스크롤, 데스크톱: 풀 폭) ── */}
      <WeekView
        reservations={weekReservations}
        weekDays={currentWeekDays}
        slotMinutes={config.slotMinutes}
        today={today}
        onSelect={setSelectedId}
      />

      {/* ── 모바일 FAB (lg 미만에서만 렌더) ── */}
      <div className="lg:hidden">
        <button
          onClick={() => setFormState({ mode: "create" })}
          className="fixed bottom-20 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary-hover"
          aria-label="예약 추가"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
        </button>
      </div>

      {/* ── 다이얼로그들 ── */}
      {selectedReservation && !formState && !completeId && (
        <ReservationDetail
          reservation={selectedReservation}
          onClose={() => setSelectedId(null)}
          onComplete={() => { setCompleteId(selectedReservation.id); setSelectedId(null); }}
          onEdit={() => { setFormState({ mode: "edit", reservation: selectedReservation }); setSelectedId(null); }}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onRevertCompletion={handleRevertCompletion}
        />
      )}
      {formState && (
        <ReservationForm
          pets={pets} services={services} hours={currentDayInfo?.hours ?? null}
          slotMinutes={config.slotMinutes} date={selectedDate}
          initialTime={formState.mode === "create" ? formState.time : undefined}
          initialPetId={formState.mode === "create" ? bookPetId : undefined}
          existingReservations={dayReservations}
          editReservation={formState.mode === "edit" ? formState.reservation : undefined}
          onClose={() => setFormState(null)}
          onSubmit={formState.mode === "edit" ? handleUpdate : handleCreate}
        />
      )}
      {completeReservation && (
        <CompleteDialog
          reservationId={completeReservation.id} petName={completeReservation.pet.name}
          startsAt={completeReservation.starts_at} endsAt={completeReservation.ends_at}
          slotMinutes={config.slotMinutes} priceQuoted={completeReservation.price_quoted}
          servicePrice={(() => { const svc = services.find((s) => s.name === completeReservation.service.name); return svc?.price ?? null; })()}
          petSize={(() => { const pet = pets.find((p) => p.id === completeReservation.pet.id); return pet?.size ?? null; })()}
          passes={completeReservation.customer ? passes.filter((p) => p.customerId === completeReservation.customer!.id).map((p) => ({ id: p.id, type: p.type, name: p.name, total_amount: p.total_amount, total_count: p.total_count, balance: p.balance, remaining: p.remaining, expires_at: p.expires_at })) : []}
          onClose={() => setCompleteId(null)} onSubmit={handleComplete}
        />
      )}
    </div>
  );
}

function ChevronLeft() { return (<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>); }
function ChevronRight() { return (<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>); }

