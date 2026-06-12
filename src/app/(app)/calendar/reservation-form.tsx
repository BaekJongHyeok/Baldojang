"use client";

import { useTransition, useState, useMemo } from "react";
import Link from "next/link";
import { sizeLabel } from "@/lib/utils";
import { kstHourMin, kstDateStr } from "@/lib/calendar-utils";
import { Spinner } from "@/components/spinner";
import type { CalendarReservation, DayHours } from "@/lib/calendar-data";

export type FormPet = {
  id: string;
  name: string;
  breed: string | null;
  size: string | null;
  caution_tags: string[];
  customer: { id: string; name: string; phone: string } | null;
};

export type FormService = {
  id: string;
  name: string;
  duration_minutes: number;
  price: Record<string, number>;
};

type Props = {
  pets: FormPet[];
  services: FormService[];
  hours: DayHours | null;
  slotMinutes: number;
  date: string;
  initialTime?: string;
  initialPetId?: string;
  existingReservations: CalendarReservation[];
  editReservation?: CalendarReservation;
  onClose: () => void;
  onSubmit: (fd: FormData) => Promise<{ error?: string; success?: boolean }>;
};

function buildSlots(hours: DayHours, slotMinutes: number): string[] {
  const [oh, om] = hours.open.split(":").map(Number);
  const [ch, cm] = hours.close.split(":").map(Number);
  const start = oh * 60 + om;
  const end = ch * 60 + cm;
  const slots: string[] = [];
  for (let m = start; m < end; m += slotMinutes) {
    const h = Math.floor(m / 60);
    const mi = m % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`);
  }
  return slots;
}

function minToTime(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function priceForSize(price: Record<string, number>, size: string | null): number | null {
  if (price.all != null) return price.all;
  if (size === "small" && price.small != null) return price.small;
  if (size === "medium" && price.medium != null) return price.medium;
  if (size === "large" && price.large != null) return price.large;
  return null;
}

export function ReservationForm({
  pets,
  services,
  hours,
  slotMinutes,
  date,
  initialTime,
  initialPetId,
  existingReservations,
  editReservation,
  onClose,
  onSubmit,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!editReservation;

  // 프리필 계산
  const editStartTime = editReservation ? (() => { const t = kstHourMin(editReservation.starts_at); return minToTime(t.hours * 60 + t.minutes); })() : "";
  const editEndTime = editReservation ? (() => { const t = kstHourMin(editReservation.ends_at); return minToTime(t.hours * 60 + t.minutes); })() : "";
  const editDate = editReservation ? kstDateStr(editReservation.starts_at) : "";
  const editServiceId = editReservation ? (services.find((s) => s.name === editReservation.service.name && s.duration_minutes === editReservation.service.duration_minutes)?.id ?? services.find((s) => s.name === editReservation.service.name)?.id ?? "") : "";

  const [petSearch, setPetSearch] = useState("");
  const [petId, setPetId] = useState(editReservation?.pet.id ?? initialPetId ?? "");
  const [serviceId, setServiceId] = useState(editServiceId);
  const [startTime, setStartTime] = useState(editStartTime || initialTime || "");
  const [endTime, setEndTime] = useState(editEndTime);
  const [memo, setMemo] = useState(editReservation?.memo ?? "");
  const [selectedDate, setSelectedDate] = useState(editDate || date);

  const selectedPet = pets.find((p) => p.id === petId);
  const selectedService = services.find((s) => s.id === serviceId);

  const filteredPets = useMemo(() => {
    if (!petSearch.trim()) return pets;
    const q = petSearch.trim().toLowerCase();
    return pets.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.customer?.name?.toLowerCase().includes(q) ?? false) ||
        (p.customer?.phone?.includes(q) ?? false),
    );
  }, [pets, petSearch]);

  const slots = hours ? buildSlots(hours, slotMinutes) : [];

  function handleServiceChange(sid: string) {
    setServiceId(sid);
    const svc = services.find((s) => s.id === sid);
    if (svc && startTime) {
      const [h, m] = startTime.split(":").map(Number);
      setEndTime(minToTime(h * 60 + m + svc.duration_minutes));
    }
  }

  function handleStartChange(time: string) {
    setStartTime(time);
    if (selectedService) {
      const [h, m] = time.split(":").map(Number);
      setEndTime(minToTime(h * 60 + m + selectedService.duration_minutes));
    }
  }

  const hasConflict = useMemo(() => {
    if (!startTime || !endTime) return false;
    const sISO = `${selectedDate}T${startTime}:00+09:00`;
    const eISO = `${selectedDate}T${endTime}:00+09:00`;
    return existingReservations.some((r) => {
      if (r.status === "cancelled") return false;
      if (isEdit && r.id === editReservation?.id) return false;
      return r.starts_at < eISO && r.ends_at > sISO;
    });
  }, [startTime, endTime, selectedDate, existingReservations, isEdit, editReservation]);

  const priceQuoted = selectedPet && selectedService
    ? priceForSize(selectedService.price, selectedPet.size)
    : null;

  function handleSubmit() {
    if (!petId || !serviceId || !startTime || !endTime) {
      setError("필수 항목을 모두 입력해주세요.");
      return;
    }
    const startsAt = `${selectedDate}T${startTime}:00+09:00`;
    const endsAt = `${selectedDate}T${endTime}:00+09:00`;

    const fd = new FormData();
    if (isEdit) fd.set("reservation_id", editReservation.id);
    fd.set("pet_id", petId);
    fd.set("service_id", serviceId);
    fd.set("starts_at", startsAt);
    fd.set("ends_at", endsAt);
    if (memo) fd.set("memo", memo);
    if (priceQuoted != null) fd.set("price_quoted", String(priceQuoted));

    setError(null);
    startTransition(async () => {
      const result = await onSubmit(fd);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-4 lg:items-center" onClick={onClose}>
      <div
        className={`max-h-[85vh] w-full max-w-md overflow-y-auto border-t border-border bg-white p-5 shadow-modal lg:rounded-lg lg:border ${isPending ? "pointer-events-none" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex justify-center lg:hidden">
          <div className="h-1 w-8 rounded-full bg-border" />
        </div>

        <h2 className="text-[18px] font-bold text-ink">
          {isEdit ? `예약 수정 — ${editReservation.pet.name}` : "새 예약"}
        </h2>

        <div className="mt-4 flex flex-col gap-4">
          {/* 펫 선택 (신규만) */}
          {!isEdit ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-ink-secondary">펫 선택</span>
              {!petId ? (
                <>
                  <input type="text" value={petSearch} onChange={(e) => setPetSearch(e.target.value)}
                    placeholder="이름, 보호자, 전화번호 검색"
                    className="min-w-0 rounded-md border border-border px-4 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20" />
                  <div className="max-h-40 overflow-y-auto rounded-md border border-border">
                    {filteredPets.length === 0 ? (
                      <div className="p-3 text-center text-[13px] text-ink-caption">
                        검색 결과 없음 · <Link href="/pets/new?returnTo=/calendar" className="font-medium text-primary hover:underline">새 펫 등록</Link>
                      </div>
                    ) : (
                      filteredPets.slice(0, 20).map((p) => (
                        <button key={p.id} type="button" onClick={() => { setPetId(p.id); setPetSearch(""); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] transition-colors hover:bg-bg">
                          <span className="font-medium text-ink">{p.name}</span>
                          <span className="text-[13px] text-ink-caption">
                            {[p.breed, sizeLabel(p.size)].filter(Boolean).join(" · ")}
                            {p.customer && ` · ${p.customer.name}`}
                          </span>
                          {p.caution_tags.length > 0 && (
                            <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-danger-light">
                              <svg className="h-2.5 w-2.5 text-danger" fill="none" viewBox="0 0 16 16" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8 4v4m0 3h.01" /></svg>
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between rounded-md bg-bg px-3 py-2">
                  <div>
                    <span className="text-[14px] font-medium text-ink">{selectedPet?.name}</span>
                    <span className="ml-1.5 text-[13px] text-ink-caption">{selectedPet?.customer && `· ${selectedPet.customer.name}`}</span>
                  </div>
                  <button type="button" onClick={() => setPetId("")} className="text-[13px] text-ink-caption hover:text-ink-secondary">변경</button>
                </div>
              )}
              {selectedPet && selectedPet.caution_tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedPet.caution_tags.map((tag) => (
                    <span key={tag} className="rounded-sm bg-danger-light px-2 py-0.5 text-[11px] font-medium text-danger">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* 시술 선택 */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-ink-secondary">시술</span>
            <select value={serviceId} onChange={(e) => handleServiceChange(e.target.value)}
              className="min-w-0 rounded-md border border-border px-4 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20">
              <option value="">선택</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes}분)</option>
              ))}
            </select>
            {priceQuoted != null && (
              <p className="text-[13px] text-ink-caption">예상 금액: {priceQuoted.toLocaleString()}원</p>
            )}
          </label>

          {/* 날짜 */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-ink-secondary">날짜</span>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
              className="min-w-0 rounded-md border border-border px-4 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20" />
          </label>

          {/* 시간 */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-ink-secondary">시작</span>
              <select value={startTime} onChange={(e) => handleStartChange(e.target.value)}
                className="min-w-0 rounded-md border border-border px-3 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20">
                <option value="">선택</option>
                {slots.map((s) => <option key={s} value={s}>{s}</option>)}
                {/* 수정 시 기존 시간이 슬롯에 없으면 추가 */}
                {editStartTime && !slots.includes(editStartTime) && (
                  <option value={editStartTime}>{editStartTime}</option>
                )}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-ink-secondary">종료</span>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} step={300}
                className="min-w-0 rounded-md border border-border px-3 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20" />
            </label>
          </div>

          {hasConflict && (
            <p className="rounded-md bg-danger-light px-3 py-2 text-[13px] font-medium text-danger">
              이 시간에 이미 예약이 있습니다.
            </p>
          )}

          {/* 메모 */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-ink-secondary">메모</span>
            <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)}
              className="min-w-0 rounded-md border border-border px-4 py-2.5 text-[14px] text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
              placeholder="선택 사항" />
          </label>

          {error && <p className="text-center text-[13px] text-danger">{error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="w-1/3 rounded-md border border-border py-2.5 text-[13px] font-medium text-ink-caption transition-colors hover:bg-bg">
              취소
            </button>
            <button type="button" onClick={handleSubmit} disabled={isPending || hasConflict}
              className="flex w-2/3 items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-[14px] font-medium text-white transition-all hover:bg-primary-hover disabled:opacity-50">
              {isPending && <Spinner />}
              {isEdit ? "수정 저장" : "예약"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
