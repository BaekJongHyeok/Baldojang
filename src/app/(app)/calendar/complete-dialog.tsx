"use client";

import { useTransition, useState, useMemo } from "react";
import { kstHourMin, formatTimestampKST } from "@/lib/calendar-utils";
import { Spinner } from "@/components/spinner";
import { getPassStatus } from "@/lib/utils";

const METHODS = [
  { value: "card", label: "카드" },
  { value: "cash", label: "현금" },
  { value: "transfer", label: "이체" },
] as const;

export type PassOption = {
  id: string;
  type: string;
  name: string;
  balance: number | null;
  remaining: number | null;
  expires_at: string | null;
};

function buildEndSlots(startsAt: string, endsAt: string, slotMinutes: number): string[] {
  const s = kstHourMin(startsAt);
  const e = kstHourMin(endsAt);
  const startMin = s.hours * 60 + s.minutes + slotMinutes;
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
  priceQuoted,
  passes,
  onClose,
  onSubmit,
}: {
  reservationId: string;
  petName: string;
  startsAt: string;
  endsAt: string;
  slotMinutes: number;
  priceQuoted: number | null;
  passes: PassOption[];
  onClose: () => void;
  onSubmit: (fd: FormData) => Promise<{ error?: string; success?: boolean }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [styleMemo, setStyleMemo] = useState("");
  const [behaviorMemo, setBehaviorMemo] = useState("");
  const [memoOpen, setMemoOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endSlots = useMemo(() => buildEndSlots(startsAt, endsAt, slotMinutes), [startsAt, endsAt, slotMinutes]);
  const defaultEnd = useMemo(() => {
    const now = new Date();
    const ms = slotMinutes * 60 * 1000;
    const nowCeiled = new Date(Math.ceil(now.getTime() / ms) * ms);
    const nowKst = kstHourMin(nowCeiled.toISOString());
    const nowMin = nowKst.hours * 60 + nowKst.minutes;
    const eKst = kstHourMin(endsAt);
    const endMin = eKst.hours * 60 + eKst.minutes;
    const targetMin = Math.min(nowMin, endMin);
    if (endSlots.length === 0) return "";
    return endSlots.reduce((prev, curr) => {
      const [ch, cm] = curr.split(":").map(Number);
      const [ph, pm] = prev.split(":").map(Number);
      return Math.abs(ch * 60 + cm - targetMin) < Math.abs(ph * 60 + pm - targetMin) ? curr : prev;
    }, endSlots[endSlots.length - 1]);
  }, [endsAt, slotMinutes, endSlots]);
  const [actualEnd, setActualEnd] = useState(defaultEnd);

  // payment
  const activePasses = useMemo(() => passes.filter((p) => getPassStatus(p) === "active"), [passes]);
  const [amount, setAmount] = useState(priceQuoted ?? 0);
  const [method, setMethod] = useState<string>("card");
  const [skipPayment, setSkipPayment] = useState(false);
  const [usePass, setUsePass] = useState(false);
  const [selectedPassId, setSelectedPassId] = useState("");
  const [extraMethod, setExtraMethod] = useState("card");

  const selectedPass = activePasses.find((p) => p.id === selectedPassId);
  const passBalance = selectedPass?.type === "amount" ? (selectedPass.balance ?? 0) : 0;
  const passDeductAmount = selectedPass?.type === "amount" ? Math.min(amount, passBalance) : 0;
  const extraAmount = selectedPass?.type === "amount" ? Math.max(0, amount - passBalance) : 0;

  const dateStr = formatTimestampKST(startsAt, "yyyy-MM-dd");
  const [visitId, setVisitId] = useState<string | null>(null);

  function doComplete() {
    const actualEndsAt = `${dateStr}T${actualEnd}:00+09:00`;
    const fd = new FormData();
    fd.set("reservation_id", reservationId);
    fd.set("actual_ends_at", actualEndsAt);
    if (styleMemo) fd.set("style_memo", styleMemo);
    if (behaviorMemo) fd.set("behavior_memo", behaviorMemo);

    if (skipPayment) {
      fd.set("skip_payment", "true");
    } else if (usePass && selectedPass) {
      fd.set("pass_id", selectedPass.id);
      fd.set("pass_type", selectedPass.type);
      fd.set("payment_amount", String(amount));
      if (selectedPass.type === "amount") {
        fd.set("pass_amount", String(passDeductAmount));
        if (extraAmount > 0) {
          fd.set("extra_method", extraMethod);
          fd.set("extra_amount", String(extraAmount));
        }
      }
    } else {
      fd.set("payment_amount", String(amount));
      fd.set("payment_method", method);
    }

    setError(null);
    startTransition(async () => {
      const result = await onSubmit(fd);
      if (result?.error) {
        setError(result.error);
      } else {
        setDone(true);
      }
    });
  }

  /* -- completion celebration screen -- */
  if (done) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/25 px-4" onClick={onClose}>
        <div className="w-full max-w-xs rounded-lg border border-border bg-white p-8 text-center shadow-modal" onClick={(e) => e.stopPropagation()}>
          {/* SVG check drawing animation */}
          <svg className="mx-auto h-16 w-16 text-success" viewBox="0 0 52 52">
            <circle
              cx="26" cy="26" r="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="animate-[circle-draw_0.3s_ease-out_forwards]"
              strokeDasharray="150"
              strokeDashoffset="150"
              style={{ animation: "circle-draw 0.3s ease-out forwards" }}
            />
            <path
              d="M14 27l8 8 16-16"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="40"
              strokeDashoffset="40"
              style={{ animation: "check-draw 0.3s ease-out 0.15s forwards" }}
            />
          </svg>

          <p className="mt-4 text-[18px] font-bold text-ink">
            {petName} 미용 완료
          </p>

          <div className="mt-6 flex flex-col gap-2">
            {visitId && (
              <a
                href={`/visits/${visitId}/card`}
                className="flex items-center justify-center gap-1.5 rounded-md bg-primary py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-primary-hover"
              >
                완료 카드 만들기
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </a>
            )}
            <button
              onClick={onClose}
              className="rounded-md py-2 text-[14px] text-ink-caption transition-colors hover:bg-bg"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* -- input screen (bottom sheet) -- */
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/25 lg:items-center lg:px-4" onClick={onClose}>
      <div
        className={`flex w-full max-w-md flex-col border-t border-border bg-white shadow-modal lg:rounded-lg lg:border ${isPending ? "pointer-events-none" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="h-1 w-8 rounded-full bg-border" />
        </div>

        {/* scrollable content */}
        <div className="max-h-[80vh] overflow-y-auto px-5 pt-3 pb-2">
          <h3 className="text-[18px] font-bold text-ink">시술 완료 — {petName}</h3>

          <div className="mt-4 flex flex-col gap-4">
            {/* -- 1. end time (slot chips) -- */}
            <div>
              <p className="text-[12px] font-medium text-ink-secondary">실제 종료 시각</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {endSlots.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setActualEnd(s)}
                    className={`rounded-md px-3 py-1.5 text-[13px] font-medium tabular-nums transition-all duration-150 ${
                      actualEnd === s
                        ? "bg-primary text-white"
                        : "border border-border bg-white text-ink-secondary hover:bg-bg"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* -- 2. payment -- */}
            <div className="rounded-md border border-border p-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold text-ink-secondary">결제</p>
                <label className="flex items-center gap-1.5 text-[11px] text-ink-caption">
                  <input type="checkbox" checked={skipPayment} onChange={(e) => { setSkipPayment(e.target.checked); if (e.target.checked) setUsePass(false); }} className="rounded" />
                  나중에
                </label>
              </div>

              {!skipPayment && (
                <div className="mt-3 flex flex-col gap-3">
                  {/* amount */}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={amount || ""}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      min={0}
                      step={1000}
                      className="min-w-0 flex-1 rounded-md border border-border px-3 py-2 text-[14px] text-ink tabular-nums outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                    <span className="text-[14px] text-ink-caption">원</span>
                  </div>

                  {/* pass toggle */}
                  {activePasses.length > 0 ? (
                    <label className="flex items-center gap-1.5 text-[13px] text-ink-secondary">
                      <input type="checkbox" checked={usePass} onChange={(e) => setUsePass(e.target.checked)} className="rounded" />
                      선불권 사용
                    </label>
                  ) : passes.length > 0 ? (
                    <p className="text-[11px] text-ink-disabled">사용 가능한 선불권 없음</p>
                  ) : null}

                  {/* pass select */}
                  {usePass && activePasses.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <select
                        value={selectedPassId}
                        onChange={(e) => setSelectedPassId(e.target.value)}
                        className="min-w-0 rounded-md border border-border px-3 py-2 text-[13px] text-ink outline-none transition-colors focus:border-primary"
                      >
                        <option value="">선불권 선택</option>
                        {activePasses.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.type === "amount" ? `₩${(p.balance ?? 0).toLocaleString()}` : `${p.remaining ?? 0}회`}
                          </option>
                        ))}
                      </select>
                      {selectedPass && selectedPass.type === "amount" && (
                        <div className="rounded-md bg-bg px-3 py-2 text-[13px] text-ink-secondary">
                          차감 <span className="font-medium text-ink tabular-nums">₩{passDeductAmount.toLocaleString()}</span>
                          {extraAmount > 0 && (
                            <span className="ml-2">
                              + 부족분 <span className="font-medium text-ink tabular-nums">₩{extraAmount.toLocaleString()}</span>
                              <select
                                value={extraMethod}
                                onChange={(e) => setExtraMethod(e.target.value)}
                                className="ml-1 rounded-sm border border-border px-1.5 py-0.5 text-[11px]"
                              >
                                {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                              </select>
                            </span>
                          )}
                        </div>
                      )}
                      {selectedPass && selectedPass.type === "count" && (
                        <p className="text-[13px] text-ink-secondary">
                          1회 차감 (잔여 <span className="font-medium tabular-nums">{(selectedPass.remaining ?? 0) - 1}회</span>)
                        </p>
                      )}
                    </div>
                  ) : !usePass ? (
                    /* payment method chips */
                    <div className="flex gap-1.5">
                      {METHODS.map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => setMethod(m.value)}
                          className={`flex-1 rounded-md py-2 text-[13px] font-medium transition-all duration-150 ${
                            method === m.value
                              ? "bg-ink text-white"
                              : "border border-border bg-white text-ink-secondary hover:bg-bg"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* -- 3. memo (collapsible) -- */}
            <button
              type="button"
              onClick={() => setMemoOpen(!memoOpen)}
              className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-[13px] font-medium text-ink-secondary transition-colors hover:bg-bg"
            >
              <span>메모 {(styleMemo || behaviorMemo) && "·"} {styleMemo && "스타일"} {behaviorMemo && "행동"}</span>
              <svg
                className={`h-4 w-4 text-ink-disabled transition-transform duration-150 ${memoOpen ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {memoOpen && (
              <div className="flex flex-col gap-3 -mt-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] font-medium text-ink-secondary">스타일 메모</span>
                  <input
                    type="text"
                    value={styleMemo}
                    onChange={(e) => setStyleMemo(e.target.value)}
                    className="min-w-0 rounded-md border border-border px-3 py-2 text-[14px] text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
                    placeholder="예: 얼굴 둥글게, 6mm"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] font-medium text-ink-secondary">행동 메모</span>
                  <input
                    type="text"
                    value={behaviorMemo}
                    onChange={(e) => setBehaviorMemo(e.target.value)}
                    className="min-w-0 rounded-md border border-border px-3 py-2 text-[14px] text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
                    placeholder="예: 드라이 싫어함"
                  />
                </label>
              </div>
            )}

            {error && <p className="text-center text-[13px] text-danger">{error}</p>}
          </div>
        </div>

        {/* -- bottom fixed button -- */}
        <div className="border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={doComplete}
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-[14px] font-medium text-white transition-all duration-150 hover:bg-primary-hover disabled:opacity-50"
          >
            {isPending && <Spinner />}시술 완료
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="mt-2 w-full rounded-md py-2 text-[14px] text-ink-caption transition-colors hover:bg-bg disabled:opacity-50"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
