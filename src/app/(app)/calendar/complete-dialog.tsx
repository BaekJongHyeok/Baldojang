"use client";

import { useTransition, useState } from "react";
import { completeWithVisitAction } from "@/lib/reservation-actions";

export function CompleteDialog({
  reservationId,
  petName,
  onClose,
  onSuccess,
}: {
  reservationId: string;
  petName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [styleMemo, setStyleMemo] = useState("");
  const [behaviorMemo, setBehaviorMemo] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    const fd = new FormData();
    fd.set("reservation_id", reservationId);
    if (styleMemo) fd.set("style_memo", styleMemo);
    if (behaviorMemo) fd.set("behavior_memo", behaviorMemo);

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold text-stone-900">시술 완료 — {petName}</h3>
        <p className="mt-1 text-xs text-stone-500">방문 기록에 메모를 남길 수 있습니다 (건너뛰기 가능)</p>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-stone-700">스타일 메모</span>
            <input
              type="text"
              value={styleMemo}
              onChange={(e) => setStyleMemo(e.target.value)}
              className="min-w-0 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
              placeholder="예: 얼굴 둥글게, 6mm, 발 알밤컷"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-stone-700">행동 메모</span>
            <input
              type="text"
              value={behaviorMemo}
              onChange={(e) => setBehaviorMemo(e.target.value)}
              className="min-w-0 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
              placeholder="예: 드라이 싫어함, 입마개 필요"
            />
          </label>

          {error && <p className="text-center text-xs text-red-500">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-500 hover:bg-stone-50"
            >
              건너뛰기
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="flex-1 rounded-xl bg-stone-900 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
            >
              {isPending ? "저장 중..." : "완료"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
