"use client";

import { useTransition, useState, useMemo } from "react";
import { completeWithVisitAction } from "@/lib/reservation-actions";
import { kstHourMin, formatTimestampKST } from "@/lib/calendar-utils";

function buildEndSlots(
  startsAt: string,
  endsAt: string,
  slotMinutes: number,
): string[] {
  const s = kstHourMin(startsAt);
  const e = kstHourMin(endsAt);
  const startMin = s.hours * 60 + s.minutes + slotMinutes; // 최소 1슬롯
  const endMin = e.hours * 60 + e.minutes;
  const slots: string[] = [];
  for (let m = startMin; m <= endMin; m += slotMinutes) {
    const h = Math.floor(m / 60);
    const mi = m % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`);
  }
  return slots;
}

export function CompleteDialog({
  reservationId,
  petName,
  startsAt,
  endsAt,
  slotMinutes,
  onClose,
  onSuccess,
}: {
  reservationId: string;
  petName: string;
  startsAt: string;
  endsAt: string;
  slotMinutes: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [styleMemo, setStyleMemo] = useState("");
  const [behaviorMemo, setBehaviorMemo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const endSlots = useMemo(
    () => buildEndSlots(startsAt, endsAt, slotMinutes),
    [startsAt, endsAt, slotMinutes],
  );

  // 기본값: min(원래 ends_at 시각, 현재 시각 올림)
  const defaultEnd = useMemo(() => {
    const now = new Date();
    const ms = slotMinutes * 60 * 1000;
    const nowCeiledMs = Math.ceil(now.getTime() / ms) * ms;
    const nowCeiled = new Date(nowCeiledMs);
    const nowKst = kstHourMin(nowCeiled.toISOString());
    const nowMin = nowKst.hours * 60 + nowKst.minutes;

    const eKst = kstHourMin(endsAt);
    const endMin = eKst.hours * 60 + eKst.minutes;

    const targetMin = Math.min(nowMin, endMin);
    // 슬롯 목록에서 가장 가까운 값 찾기
    const closest = endSlots.reduce((prev, curr) => {
      const [ch, cm] = curr.split(":").map(Number);
      const cMin = ch * 60 + cm;
      const [ph, pm] = prev.split(":").map(Number);
      const pMin = ph * 60 + pm;
      return Math.abs(cMin - targetMin) < Math.abs(pMin - targetMin)
        ? curr
        : prev;
    }, endSlots[endSlots.length - 1]);

    return closest;
  }, [endsAt, slotMinutes, endSlots]);

  const [actualEnd, setActualEnd] = useState(defaultEnd);

  // 날짜 부분은 starts_at에서 가져옴
  const dateStr = formatTimestampKST(startsAt, "yyyy-MM-dd");

  function doComplete(withMemo: boolean) {
    const actualEndsAt = `${dateStr}T${actualEnd}:00+09:00`;
    const fd = new FormData();
    fd.set("reservation_id", reservationId);
    fd.set("actual_ends_at", actualEndsAt);
    if (withMemo) {
      if (styleMemo) fd.set("style_memo", styleMemo);
      if (behaviorMemo) fd.set("behavior_memo", behaviorMemo);
    }

    setError(null);
    startTransition(async () => {
      const result = await completeWithVisitAction(fd);
      if (result?.error) {
        setError(result.error);
      } else {
        onSuccess();
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-stone-900">
          시술 완료 — {petName}
        </h3>
        <p className="mt-1 text-xs text-stone-500">
          실제 종료 시각을 확인하고 메모를 남겨주세요
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-stone-700">
              실제 종료 시각
            </span>
            <select
              value={actualEnd}
              onChange={(e) => setActualEnd(e.target.value)}
              className="min-w-0 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
            >
              {endSlots.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-stone-400">
              {formatTimestampKST(startsAt, "HH:mm")} 시작 ·{" "}
              {actualEnd} 종료로 슬롯 확정
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-stone-700">
              스타일 메모
            </span>
            <input
              type="text"
              value={styleMemo}
              onChange={(e) => setStyleMemo(e.target.value)}
              className="min-w-0 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
              placeholder="예: 얼굴 둥글게, 6mm, 발 알밤컷"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-stone-700">
              행동 메모
            </span>
            <input
              type="text"
              value={behaviorMemo}
              onChange={(e) => setBehaviorMemo(e.target.value)}
              className="min-w-0 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
              placeholder="예: 드라이 싫어함, 입마개 필요"
            />
          </label>

          {error && (
            <p className="text-center text-xs text-red-500">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => doComplete(false)}
              disabled={isPending}
              className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-500 hover:bg-stone-50 disabled:opacity-50"
            >
              {isPending ? "처리 중..." : "건너뛰기"}
            </button>
            <button
              type="button"
              onClick={() => doComplete(true)}
              disabled={isPending}
              className="flex-1 rounded-xl bg-stone-900 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
            >
              {isPending ? "저장 중..." : "메모와 완료"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
