"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { formatPhone } from "@/lib/utils";
import { formatTimestampKST } from "@/lib/calendar-utils";
import { changeReservationStatusAction } from "@/lib/reservation-actions";
import type { CalendarReservation } from "@/lib/calendar-data";

function statusLabel(s: string) {
  switch (s) { case "confirmed": return "확정"; case "completed": return "완료"; case "no_show": return "노쇼"; case "cancelled": return "취소"; default: return s; }
}
function statusBadge(s: string) {
  switch (s) { case "confirmed": return "bg-blue-100 text-blue-700"; case "completed": return "bg-stone-100 text-stone-600"; case "no_show": return "bg-red-100 text-red-700"; case "cancelled": return "bg-stone-100 text-stone-400"; default: return "bg-stone-100 text-stone-600"; }
}

export function ReservationDetail({
  reservation: r,
  onClose,
  onComplete,
  onEdit,
}: {
  reservation: CalendarReservation;
  onClose: () => void;
  onComplete: () => void;
  onEdit: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<"no_show" | "cancelled" | null>(null);

  function handleStatusChange(status: "no_show" | "cancelled") {
    const fd = new FormData();
    fd.set("reservation_id", r.id);
    fd.set("status", status);
    startTransition(async () => {
      await changeReservationStatusAction(fd);
      setConfirm(null);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-4 lg:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-lg lg:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex justify-center lg:hidden">
          <div className="h-1 w-8 rounded-full bg-stone-200" />
        </div>

        <div className="flex items-start justify-between">
          <div>
            <Link href={`/pets/${r.pet.id}`} className="text-lg font-bold text-stone-900 hover:underline">{r.pet.name}</Link>
            <p className="text-sm text-stone-500">{r.service.name}</p>
          </div>
          <span className={`rounded-lg px-2 py-1 text-xs font-medium ${statusBadge(r.status)}`}>{statusLabel(r.status)}</span>
        </div>

        <div className="mt-4 flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-500">날짜</span>
            <span className="text-stone-900">{formatTimestampKST(r.starts_at, "M월 d일 (EEEE)")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">시간</span>
            <span className="text-stone-900">{formatTimestampKST(r.starts_at, "HH:mm")} – {formatTimestampKST(r.ends_at, "HH:mm")}</span>
          </div>
          {r.customer && (
            <div className="flex justify-between">
              <span className="text-stone-500">보호자</span>
              <a href={`tel:${r.customer.phone}`} className="text-stone-900 hover:underline">{r.customer.name} · {formatPhone(r.customer.phone)}</a>
            </div>
          )}
          {r.memo && (
            <div className="flex justify-between">
              <span className="text-stone-500">메모</span>
              <span className="text-stone-900">{r.memo}</span>
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="mt-5 flex flex-col gap-2">
          {r.status === "confirmed" && !confirm && (
            <>
              <div className="flex gap-2">
                <button onClick={onComplete} className="flex-1 rounded-xl bg-stone-900 py-2.5 text-sm font-medium text-white hover:bg-stone-800">완료</button>
                <button onClick={onEdit} className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50">수정</button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setConfirm("no_show")} className="flex-1 rounded-xl border border-red-200 py-2 text-xs font-medium text-red-500 hover:bg-red-50">노쇼</button>
                <button onClick={() => setConfirm("cancelled")} className="flex-1 rounded-xl border border-stone-200 py-2 text-xs font-medium text-stone-400 hover:bg-stone-50">취소</button>
              </div>
            </>
          )}

          {confirm && (
            <div className="rounded-xl bg-stone-50 p-3">
              <p className="text-sm text-stone-700">
                {confirm === "no_show" ? "노쇼 처리하시겠습니까?" : "예약을 취소하시겠습니까?"}
              </p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => setConfirm(null)} className="flex-1 rounded-lg border border-stone-200 py-2 text-xs font-medium text-stone-500">아니오</button>
                <button onClick={() => handleStatusChange(confirm)} disabled={isPending} className="flex-1 rounded-lg bg-red-500 py-2 text-xs font-medium text-white disabled:opacity-50">{isPending ? "처리 중..." : "확인"}</button>
              </div>
            </div>
          )}

          {r.status !== "confirmed" && (
            <Link href={`/pets/${r.pet.id}`} className="rounded-xl border border-stone-200 py-2.5 text-center text-sm font-medium text-stone-700 hover:bg-stone-50">펫 차트</Link>
          )}
        </div>

        <button onClick={onClose} className="mt-2 w-full rounded-xl py-2 text-sm text-stone-500 hover:bg-stone-50">닫기</button>
      </div>
    </div>
  );
}
