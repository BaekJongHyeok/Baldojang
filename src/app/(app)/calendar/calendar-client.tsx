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
  passes,
  bookPetId,
}: {
  reservations: CalendarReservation[];
  allDays: DayInfo[];
  config: ShopCalendarConfig;
  initialDate: string;
  today: string;
  pets: FormPet[];
  services: FormService[];
  passes: { id: string; type: string; name: string; balance: number | null; remaining: number | null; expires_at: string | null; disabled_at?: string | null; customerId: string }[];
  bookPetId?: string;
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
  const bookHandledRef = useRef(false);
  useEffect(() => {
    if (bookHandledRef.current || !bookPetId) return;
    bookHandledRef.current = true;
    const pet = pets.find((p) => p.id === bookPetId);
    if (pet) {
      setFormState({ mode: "create" });
    }
    // URL에서 book 제거 (새로고침 시 재오픈 방지)
    router.replace(`/calendar?date=${initialDate}`, { scroll: false });
  }, [bookPetId, pets, router, initialDate]);

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
    const optimistic: CalendarReservation = { id: tempId, starts_at: startsAt, ends_at: endsAt, status: "confirmed", memo, price_quoted: priceQuoted, pet: { id: petId, name: pet?.name ?? "", photo_url: null, caution_tags: pet?.caution_tags ?? [] }, service: { name: svc?.name ?? "", duration_minutes: svc?.duration_minutes ?? 60 }, customer: pet?.customer ?? null };
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

  const handleStatusChange = useCallback(async (reservationId: string, status: "no_show" | "cancelled") => {
    setPatches((prev) => { const next = new Map(prev); next.set(reservationId, { status }); return next; });
    setSelectedId(null);
    const fd = new FormData();
    fd.set("reservation_id", reservationId);
    fd.set("status", status);
    const result = await changeReservationStatusAction(fd);
    if (result?.error) { setPatches((prev) => { const next = new Map(prev); next.delete(reservationId); return next; }); toast.error(result.error); }
    else router.refresh();
  }, [router]);

  const handleComplete = useCallback(async (fd: FormData): Promise<{ error?: string; success?: boolean; visitId?: string }> => {
    const reservationId = String(fd.get("reservation_id"));
    const actualEndsAt = fd.get("actual_ends_at") ? String(fd.get("actual_ends_at")) : null;
    setPatches((prev) => { const next = new Map(prev); next.set(reservationId, { status: "completed" as const, ...(actualEndsAt ? { ends_at: actualEndsAt } : {}) }); return next; });
    setCompleteId(null);
    setSelectedId(null);
    const result = await completeWithVisitAction(fd);
    if (result?.error) { setPatches((prev) => { const next = new Map(prev); next.delete(reservationId); return next; }); toast.error(result.error); return result; }
    const passId = String(fd.get("pass_id") ?? "");
    const passType = String(fd.get("pass_type") ?? "");
    const passAmount = Number(fd.get("pass_amount") ?? 0);
    if (passId) {
      const usedPass = passes.find((p) => p.id === passId);
      if (usedPass) {
        const newBalance = passType === "amount" ? (usedPass.balance ?? 0) - passAmount : (usedPass.remaining ?? 0) - 1;
        if (newBalance <= 0) toast.info("선불권이 모두 소진되었습니다. 재충전을 권유해보세요.");
      }
    }
    if (result.visitId) toast("완료 카드를 만들어보세요", { action: { label: "카드 만들기", onClick: () => router.push(`/visits/${result.visitId}/card`) } });
    router.refresh();
    return { success: true, visitId: result.visitId };
  }, [router, passes]);

  // --- 헤더 날짜 텍스트 ---
  const dayDateDisplay = formatDateKST(selectedDate, "M월 d일 (EEE)");
  const weekDateDisplay = currentWeekDays.length >= 7
    ? `${formatDateKST(currentWeekDays[0].date, "M월 d일")} – ${formatDateKST(currentWeekDays[6].date, "M월 d일")}`
    : "";

  // 미니 스트립용: 예약 있는 날짜 Set
  const reservationDates = useMemo(() => {
    const set = new Set<string>();
    for (const r of filtered) set.add(kstDateStr(r.starts_at));
    return set;
  }, [filtered]);

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
            {/* 모바일: 일 단위 */}
            <div className="flex lg:hidden">
              <button onClick={() => navDay(-1)} className="rounded-l-md border border-border p-1.5 text-ink-caption hover:bg-bg"><ChevronLeft /></button>
              <button onClick={() => navDay(1)} className="-ml-px rounded-r-md border border-border p-1.5 text-ink-caption hover:bg-bg"><ChevronRight /></button>
            </div>
            {/* 데스크톱: 주 단위 */}
            <div className="hidden lg:flex">
              <button onClick={() => navWeek(-1)} className="rounded-l-md border border-border p-1.5 text-ink-caption hover:bg-bg"><ChevronLeft /></button>
              <button onClick={() => navWeek(1)} className="-ml-px rounded-r-md border border-border p-1.5 text-ink-caption hover:bg-bg"><ChevronRight /></button>
            </div>
            <h2 className="text-[16px] font-semibold text-ink ml-1 hidden sm:block lg:hidden">{dayDateDisplay}</h2>
            <h2 className="text-[16px] font-semibold text-ink ml-1 hidden lg:block">{weekDateDisplay}</h2>
          </div>

          {/* 우: 취소 필터 + 예약 버튼 */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-[11px] text-ink-caption mr-1">
              <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} className="rounded" />취소
            </label>
            <button onClick={() => setFormState({ mode: "create" })} className="hidden rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-white hover:bg-primary-hover lg:block">+ 예약</button>
          </div>
        </div>
        {/* 모바일 날짜 (sm 미만에서만) */}
        <p className="px-4 pb-2 text-[14px] font-semibold text-ink sm:hidden">{dayDateDisplay}</p>
      </div>

      {/* ── 모바일: 미니 주간 스트립 + 일간 뷰 ── */}
      <div className="lg:hidden">
        <MiniWeekStrip
          weekDays={currentWeekDays}
          selectedDate={selectedDate}
          today={today}
          reservationDates={reservationDates}
          onSelect={setSelectedDate}
        />
        <DayView
          reservations={dayReservations}
          hours={currentDayInfo?.hours ?? null}
          slotMinutes={config.slotMinutes}
          isToday={selectedDate === today}
          onSelect={setSelectedId}
          onSlotClick={(time) => setFormState({ mode: "create", time })}
        />
      </div>

      {/* ── 데스크톱: 주간 뷰 ── */}
      <div className="hidden lg:block">
        <WeekView
          reservations={weekReservations}
          weekDays={currentWeekDays}
          slotMinutes={config.slotMinutes}
          today={today}
          onSelect={setSelectedId}
        />
      </div>

      {/* ── 다이얼로그들 ── */}
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
          passes={completeReservation.customer ? passes.filter((p) => p.customerId === completeReservation.customer!.id).map((p) => ({ id: p.id, type: p.type, name: p.name, balance: p.balance, remaining: p.remaining, expires_at: p.expires_at })) : []}
          onClose={() => setCompleteId(null)} onSubmit={handleComplete}
        />
      )}
    </div>
  );
}

function ChevronLeft() { return (<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>); }
function ChevronRight() { return (<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>); }

const MINI_DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function MiniWeekStrip({
  weekDays,
  selectedDate,
  today,
  reservationDates,
  onSelect,
}: {
  weekDays: { date: string; dayKey: string; hours: { open: string; close: string } | null }[];
  selectedDate: string;
  today: string;
  reservationDates: Set<string>;
  onSelect: (date: string) => void;
}) {
  return (
    <div className="flex border-b border-border bg-white px-1 py-1.5">
      {weekDays.map((d, i) => {
        const isSelected = d.date === selectedDate;
        const isToday = d.date === today;
        const hasRes = reservationDates.has(d.date);
        return (
          <button
            key={d.date}
            onClick={() => onSelect(d.date)}
            className="flex flex-1 flex-col items-center gap-0.5"
          >
            <span className={`text-[11px] font-medium ${isToday ? "text-primary" : "text-ink-caption"}`}>
              {MINI_DAY_LABELS[i]}
            </span>
            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums transition-colors ${
              isSelected
                ? "bg-primary text-white"
                : isToday
                  ? "text-primary"
                  : "text-ink"
            }`}>
              {d.date.slice(8).replace(/^0/, "")}
            </span>
            <span className={`h-1 w-1 rounded-full ${hasRes ? (isSelected ? "bg-white" : "bg-primary") : "bg-transparent"}`} />
          </button>
        );
      })}
    </div>
  );
}
