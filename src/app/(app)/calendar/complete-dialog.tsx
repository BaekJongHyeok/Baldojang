"use client";

import { useTransition, useState, useMemo } from "react";
import { kstHourMin, formatTimestampKST } from "@/lib/calendar-utils";
import { Spinner } from "@/components/spinner";
import { getPassStatus } from "@/lib/utils";

const PAY_METHODS = [
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

function buildEndSlots(startsAt: string, endsAt: string): string[] {
  const s = kstHourMin(startsAt);
  const e = kstHourMin(endsAt);
  const startMin = s.hours * 60 + s.minutes + 30;
  const endMin = e.hours * 60 + e.minutes;
  const slots: string[] = [];
  for (let m = startMin; m <= endMin; m += 30) {
    const h = Math.floor(m / 60);
    const mi = m % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`);
  }
  return slots;
}

function formatComma(n: number): string { return n ? n.toLocaleString() : ""; }
function parseComma(s: string): number { return Number(s.replace(/[^0-9]/g, "")) || 0; }

function resolvePrice(priceQuoted: number | null, servicePrice: Record<string, number> | null, petSize: string | null): { amount: number; sizeWarning: boolean } {
  if (priceQuoted != null && priceQuoted > 0) return { amount: priceQuoted, sizeWarning: false };
  if (!servicePrice) return { amount: 0, sizeWarning: false };
  if (servicePrice.all != null) return { amount: servicePrice.all, sizeWarning: false };
  if (petSize && servicePrice[petSize] != null) return { amount: servicePrice[petSize], sizeWarning: false };
  // 사이즈 미설정 — 첫 값 사용 + 경고
  const first = Object.values(servicePrice).find((v) => v != null && v > 0);
  return { amount: first ?? 0, sizeWarning: true };
}

export function CompleteDialog({
  reservationId, petName, startsAt, endsAt, slotMinutes, priceQuoted,
  servicePrice, petSize, passes, onClose, onSubmit,
}: {
  reservationId: string; petName: string; startsAt: string; endsAt: string;
  slotMinutes: number; priceQuoted: number | null;
  servicePrice?: Record<string, number> | null; petSize?: string | null;
  passes: PassOption[];
  onClose: () => void;
  onSubmit: (fd: FormData) => Promise<{ error?: string; success?: boolean; visitId?: string; passExhausted?: boolean }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [visitId, setVisitId] = useState<string | null>(null);
  const [passExhausted, setPassExhausted] = useState(false);
  const [styleMemo, setStyleMemo] = useState("");
  const [behaviorMemo, setBehaviorMemo] = useState("");
  const [memoOpen, setMemoOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 종료 시각
  const endSlots = useMemo(() => buildEndSlots(startsAt, endsAt), [startsAt, endsAt]);
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
  const [customTimeMode, setCustomTimeMode] = useState(false);
  const [customTime, setCustomTime] = useState(defaultEnd);
  const [timeError, setTimeError] = useState<string | null>(null);
  const startTimeMin = useMemo(() => { const s = kstHourMin(startsAt); return s.hours * 60 + s.minutes; }, [startsAt]);

  function handleCustomTimeChange(val: string) {
    setCustomTime(val);
    const [h, m] = val.split(":").map(Number);
    if (h * 60 + m <= startTimeMin) setTimeError("시작 시각 이후여야 해요");
    else { setTimeError(null); setActualEnd(val); }
  }

  // 결제
  const activePasses = useMemo(() => passes.filter((p) => getPassStatus(p) === "active"), [passes]);
  const hasActivePasses = activePasses.length > 0;
  const resolved = useMemo(() => resolvePrice(priceQuoted, servicePrice ?? null, petSize ?? null), [priceQuoted, servicePrice, petSize]);
  const defaultAmount = resolved.amount;

  type PayMode = "card" | "cash" | "transfer" | "pass";
  const [payMode, setPayMode] = useState<PayMode>("card");
  const [amount, setAmount] = useState(defaultAmount);
  const [amountDisplay, setAmountDisplay] = useState(formatComma(defaultAmount));
  const [selectedPassId, setSelectedPassId] = useState("");
  const [extraMethod, setExtraMethod] = useState("card");

  const selectedPass = activePasses.find((p) => p.id === selectedPassId);
  const passBalance = selectedPass?.type === "amount" ? (selectedPass.balance ?? 0) : 0;
  const passDeductAmount = selectedPass?.type === "amount" ? Math.min(amount, passBalance) : 0;
  const extraAmount = selectedPass?.type === "amount" ? Math.max(0, amount - passBalance) : 0;

  const dateStr = formatTimestampKST(startsAt, "yyyy-MM-dd");

  function handleAmountChange(val: string) {
    const num = parseComma(val);
    setAmount(num);
    setAmountDisplay(num ? num.toLocaleString() : "");
  }

  function switchPayMode(mode: PayMode) {
    setPayMode(mode);
    if (mode === "pass" && amount === 0 && defaultAmount > 0) {
      setAmount(defaultAmount);
      setAmountDisplay(formatComma(defaultAmount));
    }
    setError(null);
  }

  function doComplete() {
    if (timeError) return;
    if (payMode === "pass" && !selectedPassId) { setError("선불권을 선택해주세요."); return; }
    if (payMode !== "pass" && amount <= 0) { setError("금액을 입력해주세요."); return; }

    const actualEndsAt = `${dateStr}T${actualEnd}:00+09:00`;
    const fd = new FormData();
    fd.set("reservation_id", reservationId);
    fd.set("actual_ends_at", actualEndsAt);
    if (styleMemo) fd.set("style_memo", styleMemo);
    if (behaviorMemo) fd.set("behavior_memo", behaviorMemo);

    if (payMode === "pass" && selectedPass) {
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
      fd.set("payment_method", payMode);
    }

    setError(null);
    startTransition(async () => {
      const result = await onSubmit(fd);
      if (result?.error) setError(result.error);
      else {
        if (result?.visitId) setVisitId(result.visitId);
        if (result?.passExhausted) setPassExhausted(true);
        setDone(true);
      }
    });
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 px-4" onClick={onClose}>
        <div className="w-full max-w-xs rounded-lg border border-border bg-white p-8 text-center shadow-modal" onClick={(e) => e.stopPropagation()}>
          <svg className="mx-auto h-16 w-16 text-success" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="150" strokeDashoffset="150" style={{ animation: "circle-draw 0.3s ease-out forwards" }} />
            <path d="M14 27l8 8 16-16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="40" strokeDashoffset="40" style={{ animation: "check-draw 0.3s ease-out 0.15s forwards" }} />
          </svg>
          <p className="mt-4 text-[18px] font-bold text-ink">{petName} 미용 완료</p>
          {passExhausted && (
            <p className="mt-2 text-[13px] text-warning">선불권이 모두 소진됐어요. 재충전을 권유해보세요.</p>
          )}
          <div className="mt-6 flex flex-col gap-2">
            {visitId && (
              <a href={`/visits/${visitId}/card`} className="flex items-center justify-center gap-1.5 rounded-md bg-primary py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-primary-hover">
                완료 카드 만들기
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </a>
            )}
            <button onClick={onClose} className="rounded-md py-2 text-[14px] text-ink-caption transition-colors hover:bg-bg">닫기</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 lg:items-center lg:px-4" onClick={onClose}>
      <div className={`flex w-full max-w-md flex-col border-t border-border bg-white shadow-modal lg:rounded-lg lg:border ${isPending ? "pointer-events-none" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1 lg:hidden"><div className="h-1 w-8 rounded-full bg-border" /></div>

        <div className="max-h-[80vh] overflow-y-auto px-5 pt-3 pb-2">
          <h3 className="text-[18px] font-bold text-ink">시술 완료 — {petName}</h3>

          <div className="mt-4 flex flex-col gap-4">
            {/* 1. 종료 시각 */}
            <div>
              <p className="text-[12px] font-medium text-ink-secondary">실제 종료 시각</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {endSlots.map((s) => (
                  <button key={s} type="button" onClick={() => { setActualEnd(s); setCustomTimeMode(false); setTimeError(null); }}
                    className={`rounded-md px-3 py-1.5 text-[13px] font-medium tabular-nums transition-all ${actualEnd === s && !customTimeMode ? "bg-primary text-white" : "border border-border bg-white text-ink-secondary hover:bg-bg"}`}>
                    {s}
                  </button>
                ))}
                <button type="button" onClick={() => { setCustomTimeMode(true); setCustomTime(actualEnd); }}
                  className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-all ${customTimeMode ? "bg-primary text-white" : "border border-border bg-white text-ink-secondary hover:bg-bg"}`}>
                  직접 입력
                </button>
              </div>
              {customTimeMode && (
                <div className="mt-2">
                  <input type="time" value={customTime} onChange={(e) => handleCustomTimeChange(e.target.value)} step={300}
                    className="rounded-md border border-border px-3 py-2 text-[14px] tabular-nums text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
                  {timeError && <p className="mt-1 text-[12px] text-danger">{timeError}</p>}
                </div>
              )}
            </div>

            {/* 2. 결제 */}
            <div className="rounded-md border border-border p-4">
              <p className="text-[13px] font-bold text-ink-secondary">결제</p>

              {/* 수단 칩: 카드/현금/이체/선불권 */}
              <div className="mt-3 flex gap-1.5">
                {PAY_METHODS.map((m) => (
                  <button key={m.value} type="button" onClick={() => switchPayMode(m.value as PayMode)}
                    className={`flex-1 rounded-md py-2 text-[13px] font-medium transition-all ${payMode === m.value ? "bg-primary text-white" : "border border-border bg-white text-ink-secondary hover:bg-bg"}`}>
                    {m.label}
                  </button>
                ))}
                <button type="button" onClick={() => switchPayMode("pass")}
                  disabled={!hasActivePasses}
                  className={`flex-1 rounded-md py-2 text-[13px] font-medium transition-all ${payMode === "pass" ? "bg-primary text-white" : hasActivePasses ? "border border-border bg-white text-ink-secondary hover:bg-bg" : "border border-border bg-border-light text-ink-disabled cursor-not-allowed"}`}>
                  선불권
                </button>
              </div>

              {/* 카드/현금/이체: 금액 입력 */}
              {payMode !== "pass" && (
                <div className="mt-3">
                  <p className="mb-1 text-[11px] text-ink-caption">결제 금액</p>
                  <div className="flex items-center gap-2">
                    <input type="text" inputMode="numeric" value={amountDisplay} onChange={(e) => handleAmountChange(e.target.value)}
                      className="min-w-0 flex-1 rounded-md border border-border px-3 py-2 text-[14px] text-ink tabular-nums outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20" placeholder="0" />
                    <span className="text-[14px] text-ink-caption">원</span>
                  </div>
                  {resolved.sizeWarning && <p className="mt-1 text-[11px] text-warning">사이즈 미설정 — 금액을 확인해주세요</p>}
                </div>
              )}

              {/* 선불권: 패스 선택 + 차감 미리보기 */}
              {payMode === "pass" && (
                <div className="mt-3 flex flex-col gap-3">
                  <div>
                    <p className="mb-1 text-[11px] text-ink-caption">시술 금액</p>
                    <div className="flex items-center gap-2">
                      <input type="text" inputMode="numeric" value={amountDisplay} onChange={(e) => handleAmountChange(e.target.value)}
                        className="min-w-0 flex-1 rounded-md border border-border px-3 py-2 text-[14px] text-ink tabular-nums outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20" placeholder="0" />
                      <span className="text-[14px] text-ink-caption">원</span>
                    </div>
                    {resolved.sizeWarning && <p className="mt-1 text-[11px] text-warning">사이즈 미설정 — 금액을 확인해주세요</p>}
                  </div>

                  <select value={selectedPassId} onChange={(e) => setSelectedPassId(e.target.value)}
                    className="min-w-0 rounded-md border border-border px-3 py-2 text-[13px] text-ink outline-none transition-colors focus:border-primary">
                    <option value="">선불권 선택</option>
                    {activePasses.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.type === "amount" ? `₩${(p.balance ?? 0).toLocaleString()}` : `${p.remaining ?? 0}회`}
                      </option>
                    ))}
                  </select>

                  {selectedPass && selectedPass.type === "amount" && (() => {
                    const afterBalance = passBalance - passDeductAmount;
                    const extraLabel = PAY_METHODS.find((m) => m.value === extraMethod)?.label ?? extraMethod;
                    return (
                      <div className="rounded-md bg-bg px-3 py-2 text-[13px]">
                        <div className="flex items-center justify-between">
                          <span className="text-ink-caption">선불권 차감</span>
                          <span className="font-medium text-ink tabular-nums">₩{passDeductAmount.toLocaleString()}</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between border-t border-border-light pt-1.5">
                          <span className="text-ink-caption">차감 후 잔액</span>
                          <span className={`font-medium tabular-nums ${afterBalance <= 0 ? "text-ink-disabled" : "text-ink"}`}>
                            ₩{afterBalance.toLocaleString()}{afterBalance <= 0 && " · 소진"}
                          </span>
                        </div>
                        {extraAmount > 0 && (
                          <div className="mt-1.5 flex items-center justify-between border-t border-border-light pt-1.5">
                            <span className="text-ink-caption">부족분</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-ink tabular-nums">₩{extraAmount.toLocaleString()}</span>
                              <select value={extraMethod} onChange={(e) => setExtraMethod(e.target.value)}
                                className="rounded-sm border border-border px-1.5 py-0.5 text-[11px]">
                                {PAY_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                              </select>
                            </div>
                          </div>
                        )}
                        <p className="mt-2 text-[11px] text-ink-caption">
                          {extraAmount > 0
                            ? `선불권 ₩${passDeductAmount.toLocaleString()} + ${extraLabel} ₩${extraAmount.toLocaleString()}`
                            : `선불권 ₩${passDeductAmount.toLocaleString()} 결제`}
                        </p>
                      </div>
                    );
                  })()}

                  {selectedPass && selectedPass.type === "count" && (() => {
                    const afterCount = (selectedPass.remaining ?? 0) - 1;
                    return (
                      <div className="rounded-md bg-bg px-3 py-2 text-[13px] text-ink-secondary">
                        1회 차감 · {afterCount > 0
                          ? <span>사용 후 <span className="font-medium tabular-nums text-ink">{afterCount}회</span> 남음</span>
                          : <span className="font-medium text-warning">마지막 회차예요</span>}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* 3. 메모 */}
            <button type="button" onClick={() => setMemoOpen(!memoOpen)}
              className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-[13px] font-medium text-ink-secondary transition-colors hover:bg-bg">
              <span>메모 {(styleMemo || behaviorMemo) && "·"} {styleMemo && "스타일"} {behaviorMemo && "행동"}</span>
              <svg className={`h-4 w-4 text-ink-disabled transition-transform ${memoOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {memoOpen && (
              <div className="flex flex-col gap-3 -mt-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] font-medium text-ink-secondary">스타일 메모</span>
                  <input type="text" value={styleMemo} onChange={(e) => setStyleMemo(e.target.value)}
                    className="min-w-0 rounded-md border border-border px-3 py-2 text-[14px] text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
                    placeholder="예: 얼굴 둥글게, 6mm" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] font-medium text-ink-secondary">행동 메모</span>
                  <input type="text" value={behaviorMemo} onChange={(e) => setBehaviorMemo(e.target.value)}
                    className="min-w-0 rounded-md border border-border px-3 py-2 text-[14px] text-ink outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
                    placeholder="예: 드라이 싫어함" />
                </label>
              </div>
            )}

            {error && <p className="text-center text-[13px] text-danger">{error}</p>}
          </div>
        </div>

        <div className="border-t border-border px-5 py-4">
          <button type="button" onClick={doComplete} disabled={isPending || !!timeError}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-[14px] font-medium text-white transition-all hover:bg-primary-hover disabled:opacity-50">
            {isPending && <Spinner />}시술 완료
          </button>
          <button type="button" onClick={onClose} disabled={isPending}
            className="mt-2 w-full rounded-md border border-border py-2 text-[13px] font-medium text-ink-caption transition-colors hover:bg-bg disabled:opacity-50">
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
