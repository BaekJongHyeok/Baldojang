"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPhone } from "@/lib/utils";
import { formatTimestampKST } from "@/lib/calendar-utils";
import type { CalendarReservation } from "@/lib/calendar-data";

function statusLabel(s: string) {
  switch (s) { case "confirmed": return "확정"; case "completed": return "완료"; case "no_show": return "노쇼"; case "cancelled": return "취소"; default: return s; }
}

const badgeStyles: Record<string, string> = {
  confirmed: "bg-accent-subtle text-accent",
  completed: "bg-status-success-subtle text-status-success",
  no_show: "bg-status-danger-subtle text-status-danger",
  cancelled: "bg-warm-100 text-ink-faint",
};

export function ReservationDetail({
  reservation: r,
  onClose,
  onComplete,
  onEdit,
  onStatusChange,
}: {
  reservation: CalendarReservation;
  onClose: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onStatusChange: (id: string, status: "no_show" | "cancelled") => void;
}) {
  const [confirm, setConfirm] = useState<"no_show" | "cancelled" | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/25 px-4 lg:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-[20px] bg-surface-card p-5 shadow-float lg:rounded-card" onClick={(e) => e.stopPropagation()}>
        {/* drag handle */}
        <div className="mb-3 flex justify-center lg:hidden">
          <div className="h-1 w-8 rounded-full bg-warm-300" />
        </div>

        <div className="flex items-start justify-between">
          <div>
            <Link href={`/pets/${r.pet.id}`} className="text-[18px] font-bold text-ink hover:underline">{r.pet.name}</Link>
            <p className="text-[15px] text-ink-secondary">{r.service.name}</p>
          </div>
          <span className={`rounded-badge px-2.5 py-1 text-[11px] font-medium ${badgeStyles[r.status] ?? "bg-warm-100 text-ink-secondary"}`}>
            {statusLabel(r.status)}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-2 text-[15px]">
          <div className="flex justify-between">
            <span className="text-ink-tertiary">날짜</span>
            <span className="text-ink">{formatTimestampKST(r.starts_at, "M월 d일 (EEEE)")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-tertiary">시간</span>
            <span className="text-ink tabular-nums">{formatTimestampKST(r.starts_at, "HH:mm")} – {formatTimestampKST(r.ends_at, "HH:mm")}</span>
          </div>
          {r.customer && (
            <div className="flex justify-between">
              <span className="text-ink-tertiary">보호자</span>
              <a href={`tel:${r.customer.phone}`} className="text-ink hover:underline">{r.customer.name} · {formatPhone(r.customer.phone)}</a>
            </div>
          )}
          {r.memo && (
            <div className="flex justify-between">
              <span className="text-ink-tertiary">메모</span>
              <span className="text-ink">{r.memo}</span>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-2">
          {r.status === "confirmed" && !confirm && (
            <>
              <div className="flex gap-2">
                <button onClick={onComplete} className="flex-1 rounded-button bg-accent py-2.5 text-[15px] font-medium text-white press-scale transition-transform duration-150 hover:bg-accent-hover">완료</button>
                <button onClick={onEdit} className="flex-1 rounded-button border border-border py-2.5 text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-surface-hover">수정</button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setConfirm("no_show")} className="flex-1 rounded-button border border-status-danger/30 py-2 text-[13px] font-medium text-status-danger transition-colors hover:bg-status-danger-subtle">노쇼</button>
                <button onClick={() => setConfirm("cancelled")} className="flex-1 rounded-button border border-border py-2 text-[13px] font-medium text-ink-tertiary transition-colors hover:bg-surface-hover">취소</button>
              </div>
            </>
          )}

          {confirm && (
            <div className="rounded-button bg-surface p-3">
              <p className="text-[15px] text-ink">
                {confirm === "no_show" ? "노쇼 처리하시겠습니까?" : "예약을 취소하시겠습니까?"}
              </p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => setConfirm(null)} className="flex-1 rounded-button border border-border py-2 text-[13px] font-medium text-ink-secondary">아니오</button>
                <button onClick={() => onStatusChange(r.id, confirm)} className="flex-1 rounded-button bg-status-danger py-2 text-[13px] font-medium text-white">확인</button>
              </div>
            </div>
          )}

          {r.status !== "confirmed" && (
            <Link href={`/pets/${r.pet.id}`} className="rounded-button border border-border py-2.5 text-center text-[15px] font-medium text-ink transition-colors hover:bg-surface-hover">펫 차트</Link>
          )}
        </div>

        <button onClick={onClose} className="mt-2 w-full rounded-button py-2 text-[15px] text-ink-tertiary transition-colors hover:bg-surface-hover">닫기</button>
      </div>
    </div>
  );
}
