"use client";

import { useTransition, useState, useMemo } from "react";
import { kstHourMin, formatTimestampKST } from "@/lib/calendar-utils";
import { Spinner } from "@/components/spinner";
import { getPassStatus } from "@/lib/utils";

const METHODS = [
  { value: "card", label: "카드" },
  { value: "cash", label: "현금" },
  { value: "transfer", label: "계좌이체" },
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
  const [styleMemo, setStyleMemo] = useState("");
  const [behaviorMemo, setBehaviorMemo] = useState("");
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

  // 결제
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

  function doComplete(withMemo: boolean) {
    const actualEndsAt = `${dateStr}T${actualEnd}:00+09:00`;
    const fd = new FormData();
    fd.set("reservation_id", reservationId);
    fd.set("actual_ends_at", actualEndsAt);
    if (withMemo && styleMemo) fd.set("style_memo", styleMemo);
    if (withMemo && behaviorMemo) fd.set("behavior_memo", behaviorMemo);

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
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div
        className={`max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 shadow-lg ${isPending ? "pointer-events-none" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-stone-900">시술 완료 — {petName}</h3>

        <div className="mt-4 flex flex-col gap-3">
          {/* 종료 시각 */}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-stone-700">실제 종료 시각</span>
            <select value={actualEnd} onChange={(e) => setActualEnd(e.target.value)}
              className="min-w-0 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400">
              {endSlots.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          {/* 결제 */}
          <fieldset className="flex flex-col gap-2 rounded-xl bg-stone-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700">결제</span>
              <label className="flex items-center gap-1.5 text-[11px] text-stone-500">
                <input type="checkbox" checked={skipPayment} onChange={(e) => { setSkipPayment(e.target.checked); if (e.target.checked) setUsePass(false); }} className="rounded" />
                결제 나중에
              </label>
            </div>
            {!skipPayment && (
              <>
                <div className="flex gap-2 items-center">
                  <input type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))}
                    min={0} step={1000} className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-1.5 text-sm outline-none focus:border-stone-400" />
                  <span className="text-sm text-stone-500">원</span>
                </div>

                {/* 선불권 토글 */}
                {activePasses.length > 0 ? (
                  <label className="flex items-center gap-1.5 text-xs text-stone-600">
                    <input type="checkbox" checked={usePass} onChange={(e) => setUsePass(e.target.checked)} className="rounded" />
                    선불권 사용
                  </label>
                ) : passes.length > 0 ? (
                  <p className="text-[11px] text-stone-400">사용 가능한 선불권 없음</p>
                ) : null}

                {usePass && activePasses.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    <select value={selectedPassId} onChange={(e) => setSelectedPassId(e.target.value)}
                      className="min-w-0 rounded-lg border border-stone-200 px-3 py-1.5 text-xs outline-none focus:border-stone-400">
                      <option value="">선불권 선택</option>
                      {activePasses.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.type === "amount" ? `₩${(p.balance ?? 0).toLocaleString()}` : `${p.remaining ?? 0}회`}
                        </option>
                      ))}
                    </select>
                    {selectedPass && selectedPass.type === "amount" && (
                      <div className="text-xs text-stone-500">
                        선불권 차감 ₩{passDeductAmount.toLocaleString()}
                        {extraAmount > 0 && (
                          <span className="ml-1">
                            + 부족분 ₩{extraAmount.toLocaleString()}
                            <select value={extraMethod} onChange={(e) => setExtraMethod(e.target.value)}
                              className="ml-1 rounded border border-stone-200 px-1 py-0.5 text-[11px]">
                              {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                          </span>
                        )}
                      </div>
                    )}
                    {selectedPass && selectedPass.type === "count" && (
                      <p className="text-xs text-stone-500">1회 차감 (잔여 {(selectedPass.remaining ?? 0) - 1}회)</p>
                    )}
                  </div>
                ) : !usePass ? (
                  <div className="flex gap-1.5">
                    {METHODS.map((m) => (
                      <button key={m.value} type="button" onClick={() => setMethod(m.value)}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition ${method === m.value ? "bg-stone-900 text-white" : "bg-white text-stone-600 border border-stone-200"}`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </fieldset>

          {/* 메모 */}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-stone-700">스타일 메모</span>
            <input type="text" value={styleMemo} onChange={(e) => setStyleMemo(e.target.value)}
              className="min-w-0 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400" placeholder="예: 얼굴 둥글게, 6mm" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-stone-700">행동 메모</span>
            <input type="text" value={behaviorMemo} onChange={(e) => setBehaviorMemo(e.target.value)}
              className="min-w-0 rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400" placeholder="예: 드라이 싫어함" />
          </label>

          {error && <p className="text-center text-xs text-red-500">{error}</p>}

          <button type="button" onClick={() => doComplete(true)} disabled={isPending}
            className="flex items-center justify-center gap-2 rounded-xl bg-stone-900 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50">
            {isPending && <Spinner />}완료
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={isPending}
              className="flex-1 rounded-xl py-2 text-sm font-medium text-stone-500 hover:bg-stone-50 disabled:opacity-50">취소</button>
            <button type="button" onClick={() => doComplete(false)} disabled={isPending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-stone-200 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50">
              {isPending && <Spinner className="h-3.5 w-3.5" />}메모 없이 완료
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
