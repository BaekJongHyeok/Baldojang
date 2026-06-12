"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPhone } from "@/lib/utils";
import { PhoneButton } from "@/components/phone-button";
import { PetAvatar } from "@/components/pet-avatar";
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
  reservation: r, onClose, onComplete, onEdit, onStatusChange, onDelete, onRevertCompletion,
}: {
  reservation: CalendarReservation;
  onClose: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onStatusChange: (id: string, status: "confirmed" | "no_show" | "cancelled") => void;
  onDelete: (id: string) => void;
  onRevertCompletion: (id: string) => void;
}) {
  const [confirm, setConfirm] = useState<"no_show" | "cancelled" | "delete" | "revert_complete" | null>(null);
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
            <PetAvatar name={r.pet.name} photoUrl={r.pet.photo_url} size="lg" />
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
          <div className="mt-4 flex flex-col gap-3">
            {/* confirmed */}
            {r.status === "confirmed" && !confirm && (
              <>
                <button onClick={onComplete} className="w-full rounded-md bg-primary py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-primary-hover">완료</button>
                <div className="flex justify-around">
                  <CircleAction icon={<PencilIcon />} label="수정" onClick={onEdit} />
                  <CircleAction icon={<UserXIcon />} label="노쇼" warning onClick={() => setConfirm("no_show")} />
                  <CircleAction icon={<XIcon />} label="취소" onClick={() => setConfirm("cancelled")} />
                  <CircleAction icon={<TrashIcon />} label="삭제" danger onClick={() => setConfirm("delete")} />
                </div>
              </>
            )}

            {/* 종료 상태 (completed / no_show / cancelled) — 통일 구조 */}
            {isTerminal && !confirm && (
              <>
                <p className="text-center text-[13px] text-ink-caption">
                  {r.status === "completed" ? "시술이 완료됐어요" : r.status === "no_show" ? "노쇼로 처리된 예약이에요" : "취소된 예약이에요"}
                </p>
                <div className="flex justify-around">
                  <CircleAction icon={<ChartIcon />} label="펫 차트" href={`/pets/${r.pet.id}`} />
                  <CircleAction icon={<UndoIcon />} label="되돌리기" onClick={() => r.status === "completed" ? setConfirm("revert_complete") : onStatusChange(r.id, "confirmed")} />
                  <CircleAction icon={<TrashIcon />} label="삭제" danger onClick={() => setConfirm("delete")} />
                </div>
              </>
            )}

            {/* 노쇼/취소 confirm */}
            {confirm && confirm !== "delete" && confirm !== "revert_complete" && (
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

            {/* 완료 되돌리기 confirm */}
            {confirm === "revert_complete" && (
              <div className="rounded-lg border border-warning/30 bg-warning-light p-3">
                <p className="text-[14px] font-medium text-warning">완료를 되돌릴까요?</p>
                <p className="mt-0.5 text-[12px] text-warning/80">방문 기록, 결제 내역, 사진이 함께 삭제되고 예약이 확정 상태로 돌아가요.</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setConfirm(null)} className="flex-1 rounded-md border border-border bg-white py-2 text-[13px] font-medium text-ink-secondary">돌아가기</button>
                  <button onClick={() => onRevertCompletion(r.id)} className="flex-1 rounded-md bg-warning py-2 text-[13px] font-medium text-white">되돌리기</button>
                </div>
              </div>
            )}

            {/* 삭제 confirm */}
            {confirm === "delete" && r.status === "completed" && (
              <div className="rounded-lg border border-border bg-bg p-3">
                <p className="text-[14px] font-medium text-ink">방문 기록이 있는 예약이에요</p>
                <p className="mt-0.5 text-[12px] text-ink-caption">먼저 &lsquo;되돌리기&rsquo;로 완료를 취소한 후 삭제할 수 있어요.</p>
                <div className="mt-3">
                  <button onClick={() => setConfirm(null)} className="w-full rounded-md border border-border bg-white py-2 text-[13px] font-medium text-ink-secondary">돌아가기</button>
                </div>
              </div>
            )}
            {confirm === "delete" && r.status !== "completed" && (
              <div className="rounded-lg border border-danger/20 bg-danger-light p-3">
                <p className="text-[14px] font-medium text-danger">예약을 완전히 삭제할까요?</p>
                <p className="mt-0.5 text-[12px] text-danger/70">보호자가 취소한 예약이라면 &lsquo;취소&rsquo;를 사용해주세요 — 취소는 기록이 남아요.</p>
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

/* ── 원형 아이콘 액션 버튼 ── */
function CircleAction({ icon, label, danger, warning, onClick, href }: {
  icon: React.ReactNode; label: string; danger?: boolean; warning?: boolean;
  onClick?: () => void; href?: string;
}) {
  const colorClass = danger ? "text-danger" : warning ? "text-warning" : "text-ink-secondary";
  const inner = (
    <div className="flex flex-col items-center gap-1">
      <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-border-light transition-transform active:scale-95 ${colorClass}`}>
        {icon}
      </div>
      <span className={`text-[11px] font-medium ${colorClass}`}>{label}</span>
    </div>
  );
  if (href) return <Link href={href} className="flex flex-col items-center">{inner}</Link>;
  return <button type="button" onClick={onClick} className="flex flex-col items-center">{inner}</button>;
}

/* ── Icons (24px, strokeWidth 2) ── */
function PencilIcon() {
  return <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>;
}
function UserXIcon() {
  return <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" /></svg>;
}
function XIcon() {
  return <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
}
function UndoIcon() {
  return <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>;
}
function TrashIcon() {
  return <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>;
}
function ChartIcon() {
  return <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>;
}
