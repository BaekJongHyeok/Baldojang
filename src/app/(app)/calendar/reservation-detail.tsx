"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPhone } from "@/lib/utils";
import { PhoneButton } from "@/components/phone-button";
import { formatTimestampKST } from "@/lib/calendar-utils";
import type { CalendarReservation } from "@/lib/calendar-data";

function statusLabel(s: string) {
  switch (s) { case "confirmed": return "확정"; case "completed": return "완료"; case "no_show": return "노쇼"; case "cancelled": return "취소"; default: return s; }
}
const badgeStyles: Record<string, string> = {
  confirmed: "bg-primary-light text-primary",
  completed: "bg-success-light text-success",
  no_show: "bg-danger-light text-danger",
  cancelled: "bg-border-light text-ink-disabled",
};

export function ReservationDetail({
  reservation: r, onClose, onComplete, onEdit, onStatusChange, onDelete,
}: {
  reservation: CalendarReservation;
  onClose: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onStatusChange: (id: string, status: "confirmed" | "no_show" | "cancelled") => void;
  onDelete: (id: string) => void;
}) {
  const [confirm, setConfirm] = useState<"no_show" | "cancelled" | "delete" | null>(null);
  const hasCaution = r.pet.caution_tags.length > 0;
  const isTerminal = r.status === "completed" || r.status === "no_show" || r.status === "cancelled";
  const dateTime = `${formatTimestampKST(r.starts_at, "M월 d일 (EEE)")} · ${formatTimestampKST(r.starts_at, "HH:mm")}–${formatTimestampKST(r.ends_at, "HH:mm")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 lg:items-center lg:px-4" onClick={onClose}>
      <div className="relative w-full max-w-md bg-white shadow-modal lg:rounded-lg lg:border lg:border-border" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1 lg:hidden"><div className="h-1 w-8 rounded-full bg-border" /></div>

        <button onClick={onClose} className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-ink-caption transition-colors hover:bg-border-light hover:text-ink">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="px-5 pt-2 pb-5 lg:pt-5">
          {/* ── 헤더 ── */}
          <div className="flex items-center gap-3 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-border-light text-[14px] font-bold text-ink-caption overflow-hidden">
              {r.pet.photo_url
                ? <img src={r.pet.photo_url} alt="" className="h-full w-full object-cover" />
                : r.pet.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`/pets/${r.pet.id}`} className="inline-flex items-center gap-0.5 text-[17px] font-bold text-ink hover:text-primary">
                {r.pet.name}
                <svg className="h-4 w-4 shrink-0 text-ink-caption" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </Link>
              <p className="text-[13px] text-ink-caption">{r.service.name}</p>
            </div>
            <span className={`shrink-0 rounded-sm px-2 py-0.5 text-[11px] font-medium ${badgeStyles[r.status] ?? "bg-border-light text-ink-secondary"}`}>
              {statusLabel(r.status)}
            </span>
          </div>

          {/* ── 정보 블록 ── */}
          <div className="mt-4 flex flex-col gap-1.5 rounded-lg border border-border bg-white p-3 text-[14px]">
            <div className="flex justify-between">
              <span className="text-ink-caption">일시</span>
              <span className="text-ink tabular-nums">{dateTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-caption">시술</span>
              <span className="text-ink">
                {r.service.name} · {r.service.duration_minutes}분
                {r.price_quoted != null && r.price_quoted > 0 && (
                  <span className="ml-1.5 tabular-nums text-ink-caption">₩{r.price_quoted.toLocaleString()}</span>
                )}
              </span>
            </div>
            {r.customer && (
              <div className="flex items-center justify-between">
                <span className="text-ink-caption">보호자</span>
                <span className="flex items-center gap-2">
                  <Link href={`/customers/${r.customer.id}`} className="font-medium text-ink hover:text-primary">{r.customer.name}</Link>
                  <PhoneButton phone={r.customer.phone} className="flex h-6 w-6 items-center justify-center rounded-full text-ink-caption transition-colors hover:bg-bg hover:text-ink">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                  </PhoneButton>
                </span>
              </div>
            )}
            {r.memo && (
              <div className="flex justify-between">
                <span className="text-ink-caption">메모</span>
                <span className="text-ink">{r.memo}</span>
              </div>
            )}
          </div>

          {hasCaution && (
            <div className="mt-2 flex flex-wrap gap-1 rounded-md bg-danger-light px-3 py-2">
              {r.pet.caution_tags.map((tag) => (
                <span key={tag} className="rounded-sm bg-white/70 px-1.5 py-0.5 text-[11px] font-medium text-danger">{tag}</span>
              ))}
            </div>
          )}

          {/* ── 액션 ── */}
          <div className="mt-4 flex flex-col gap-2">
            {/* confirmed */}
            {r.status === "confirmed" && !confirm && (
              <>
                <button onClick={onComplete} className="w-full rounded-md bg-primary py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-primary-hover">완료</button>
                <button onClick={onEdit} className="w-full rounded-md border border-border py-2 text-[14px] font-medium text-ink transition-colors hover:bg-bg">수정</button>
                <div className="flex gap-2">
                  <button onClick={() => setConfirm("no_show")} className="flex-1 rounded-md border border-danger/30 py-2 text-[13px] font-medium text-danger transition-colors hover:bg-danger-light">노쇼</button>
                  <button onClick={() => setConfirm("cancelled")} className="flex-1 rounded-md border border-border py-2 text-[13px] font-medium text-ink-caption transition-colors hover:bg-bg">취소</button>
                </div>
              </>
            )}

            {/* completed */}
            {r.status === "completed" && !confirm && (
              <>
                <p className="text-center text-[13px] text-success">시술이 완료됐어요</p>
                <Link href={`/pets/${r.pet.id}`} className="rounded-md border border-border py-2.5 text-center text-[14px] font-medium text-ink transition-colors hover:bg-bg">펫 차트</Link>
                <button onClick={() => setConfirm("delete")} className="py-1.5 text-[12px] text-ink-disabled transition-colors hover:text-danger">삭제</button>
              </>
            )}

            {/* no_show */}
            {r.status === "no_show" && !confirm && (
              <>
                <p className="text-center text-[13px] text-danger">노쇼로 처리된 예약이에요</p>
                <Link href={`/pets/${r.pet.id}`} className="rounded-md border border-border py-2.5 text-center text-[14px] font-medium text-ink transition-colors hover:bg-bg">펫 차트</Link>
                <button onClick={() => onStatusChange(r.id, "confirmed")} className="py-1.5 text-[12px] text-ink-disabled transition-colors hover:text-ink-caption">확정으로 되돌리기</button>
                <button onClick={() => setConfirm("delete")} className="py-1 text-[12px] text-ink-disabled transition-colors hover:text-danger">삭제</button>
              </>
            )}

            {/* cancelled */}
            {r.status === "cancelled" && !confirm && (
              <>
                <p className="text-center text-[13px] text-ink-caption">취소된 예약이에요</p>
                <Link href={`/pets/${r.pet.id}`} className="rounded-md border border-border py-2.5 text-center text-[14px] font-medium text-ink transition-colors hover:bg-bg">펫 차트</Link>
                <button onClick={() => onStatusChange(r.id, "confirmed")} className="py-1.5 text-[12px] text-ink-disabled transition-colors hover:text-ink-caption">확정으로 되돌리기</button>
                <button onClick={() => setConfirm("delete")} className="py-1 text-[12px] text-ink-disabled transition-colors hover:text-danger">삭제</button>
              </>
            )}

            {/* 노쇼/취소 confirm */}
            {confirm && confirm !== "delete" && (
              <div className="rounded-lg border border-border bg-bg p-3">
                <p className="text-[14px] font-medium text-ink">
                  {r.pet.name} 예약을 {confirm === "no_show" ? "노쇼로 처리할까요?" : "취소할까요?"}
                </p>
                <p className="mt-0.5 text-[12px] text-ink-caption">
                  {confirm === "no_show" ? "노쇼로 기록되고 시간대는 비워져요." : "취소로 기록되고 시간대는 비워져요."}
                </p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setConfirm(null)} className="flex-1 rounded-md border border-border bg-white py-2 text-[13px] font-medium text-ink-secondary">돌아가기</button>
                  <button onClick={() => onStatusChange(r.id, confirm)} className="flex-1 rounded-md bg-danger py-2 text-[13px] font-medium text-white">
                    {confirm === "no_show" ? "노쇼 처리" : "예약 취소"}
                  </button>
                </div>
              </div>
            )}

            {/* 삭제 confirm */}
            {confirm === "delete" && (
              <div className="rounded-lg border border-danger/20 bg-danger-light p-3">
                <p className="text-[14px] font-medium text-danger">이 예약을 삭제할까요?</p>
                <p className="mt-0.5 text-[12px] text-danger/70">잘못 만든 예약을 지울 때만 사용하세요. 보호자가 취소한 경우엔 &lsquo;취소&rsquo;로 처리해야 기록이 남아요.</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setConfirm(null)} className="flex-1 rounded-md border border-border bg-white py-2 text-[13px] font-medium text-ink-secondary">돌아가기</button>
                  <button onClick={() => onDelete(r.id)} className="flex-1 rounded-md bg-danger py-2 text-[13px] font-medium text-white">삭제</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
