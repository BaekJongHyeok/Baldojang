"use client";

import { useTransition, useState, useMemo } from "react";
import Link from "next/link";
import { sizeLabel } from "@/lib/utils";
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
  existingReservations,
  editReservation,
  onClose,
  onSubmit,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [petSearch, setPetSearch] = useState("");
  const [petId, setPetId] = useState(editReservation?.pet.id ?? "");
  const [serviceId, setServiceId] = useState("");
  const [startTime, setStartTime] = useState(initialTime ?? "");
  const [endTime, setEndTime] = useState("");
  const [memo, setMemo] = useState(editReservation?.memo ?? "");

  const isEdit = !!editReservation;

  const selectedPet = pets.find((p) => p.id === petId);
  const selectedService = services.find((s) => s.id === serviceId);

  // 검색 필터
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

  // 시술 선택 시 종료시각 자동계산
  function handleServiceChange(sid: string) {
    setServiceId(sid);
    const svc = services.find((s) => s.id === sid);
    if (svc && startTime) {
      const [h, m] = startTime.split(":").map(Number);
      const endMin = h * 60 + m + svc.duration_minutes;
      const eh = Math.floor(endMin / 60);
      const em = endMin % 60;
      setEndTime(`${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`);
    }
  }

  function handleStartChange(time: string) {
    setStartTime(time);
    if (selectedService) {
      const [h, m] = time.split(":").map(Number);
      const endMin = h * 60 + m + selectedService.duration_minutes;
      const eh = Math.floor(endMin / 60);
      const em = endMin % 60;
      setEndTime(`${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`);
    }
  }

  // 클라이언트 충돌 경고 (cancelled 제외 모든 상태 차단)
  const hasConflict = useMemo(() => {
    if (!startTime || !endTime) return false;
    const sISO = `${date}T${startTime}:00+09:00`;
    const eISO = `${date}T${endTime}:00+09:00`;
    return existingReservations.some((r) => {
      if (r.status === "cancelled") return false;
      if (isEdit && r.id === editReservation?.id) return false;
      return r.starts_at < eISO && r.ends_at > sISO;
    });
  }, [startTime, endTime, date, existingReservations, isEdit, editReservation]);

  const priceQuoted = selectedPet && selectedService
    ? priceForSize(selectedService.price, selectedPet.size)
    : null;

  function handleSubmit() {
    if (!petId || !serviceId || !startTime || !endTime) {
      setError("필수 항목을 모두 입력해주세요.");
      return;
    }
    const startsAt = `${date}T${startTime}:00+09:00`;
    const endsAt = `${date}T${endTime}:00+09:00`;

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
      if (result?.error) {
        setError(result.error);
      }
      // onSubmit handles closing and optimistic update
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-4 lg:items-center"
      onClick={onClose}
    >
      <div
        className={`max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-lg lg:rounded-2xl ${isPending ? "pointer-events-none" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex justify-center lg:hidden">
          <div className="h-1 w-8 rounded-full bg-stone-200" />
        </div>

        <h2 className="text-lg font-bold text-stone-900">
          {isEdit ? "예약 수정" : "새 예약"}
        </h2>

        <div className="mt-4 flex flex-col gap-4">
          {/* 펫 선택 */}
          {!isEdit && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-stone-700">펫 선택</span>
              {!petId ? (
                <>
                  <input
                    type="text"
                    value={petSearch}
                    onChange={(e) => setPetSearch(e.target.value)}
                    placeholder="이름, 보호자, 전화번호 검색"
                    className="min-w-0 rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
                  />
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-stone-100">
                    {filteredPets.length === 0 ? (
                      <div className="p-3 text-center text-xs text-stone-400">
                        검색 결과 없음 ·{" "}
                        <Link href="/pets/new?returnTo=/calendar" className="text-stone-700 underline">
                          새 펫 등록
                        </Link>
                      </div>
                    ) : (
                      filteredPets.slice(0, 20).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { setPetId(p.id); setPetSearch(""); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-stone-50"
                        >
                          <span className="font-medium text-stone-900">{p.name}</span>
                          <span className="text-xs text-stone-400">
                            {[p.breed, sizeLabel(p.size)].filter(Boolean).join(" · ")}
                            {p.customer && ` · ${p.customer.name}`}
                          </span>
                          {p.caution_tags.length > 0 && (
                            <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-red-500" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2">
                  <div>
                    <span className="text-sm font-medium text-stone-900">{selectedPet?.name}</span>
                    <span className="ml-1.5 text-xs text-stone-500">
                      {selectedPet?.customer && `· ${selectedPet.customer.name}`}
                    </span>
                  </div>
                  <button type="button" onClick={() => setPetId("")} className="text-xs text-stone-400 hover:text-stone-600">
                    변경
                  </button>
                </div>
              )}
              {selectedPet && selectedPet.caution_tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedPet.caution_tags.map((tag) => (
                    <span key={tag} className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 시술 선택 */}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700">시술</span>
            <select
              value={serviceId}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="min-w-0 rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
            >
              <option value="">선택</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.duration_minutes}분)
                </option>
              ))}
            </select>
            {priceQuoted != null && (
              <p className="text-xs text-stone-500">
                예상 금액: {priceQuoted.toLocaleString()}원
              </p>
            )}
          </label>

          {/* 시간 */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-stone-700">시작</span>
              <select
                value={startTime}
                onChange={(e) => handleStartChange(e.target.value)}
                className="min-w-0 rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
              >
                <option value="">선택</option>
                {slots.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-stone-700">종료</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="min-w-0 rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
              />
            </label>
          </div>

          {hasConflict && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              이 시간에 이미 예약이 있습니다. 제출 시 거부됩니다.
            </p>
          )}

          {/* 메모 */}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700">메모</span>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="min-w-0 rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
              placeholder="선택 사항"
            />
          </label>

          {error && <p className="text-center text-sm text-red-500">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-stone-900 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
            >
              {isPending && <Spinner />}
              {isEdit ? "수정" : "예약"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
