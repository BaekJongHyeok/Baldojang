"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/spinner";
import { createPassAction } from "@/lib/pass-actions";

type Pass = {
  id: string;
  type: string;
  name: string;
  total_amount: number | null;
  balance: number | null;
  total_count: number | null;
  remaining: number | null;
  expires_at: string | null;
};

function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const d = new Date(expiresAt);
  const diff = d.getTime() - Date.now();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export function PassSection({ customerId, passes: initialPasses }: { customerId: string; passes: Pass[] }) {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // 폼 state
  const [type, setType] = useState<"amount" | "count">("amount");
  const [name, setName] = useState("");
  const [chargeAmount, setChargeAmount] = useState(0);
  const [bonusAmount, setBonusAmount] = useState(0);
  const [totalCount, setTotalCount] = useState(10);
  const [validityMonths, setValidityMonths] = useState(12);
  const [payMethod, setPayMethod] = useState("card");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    const fd = new FormData();
    fd.set("customer_id", customerId);
    fd.set("type", type);
    fd.set("name", name || (type === "amount" ? `${(chargeAmount / 10000).toFixed(0)}만원권` : `${totalCount}회권`));
    fd.set("validity_months", String(validityMonths));
    fd.set("payment_method", payMethod);

    if (type === "amount") {
      fd.set("charge_amount", String(chargeAmount));
      fd.set("bonus_amount", String(bonusAmount));
      fd.set("payment_amount", String(chargeAmount));
    } else {
      fd.set("total_count", String(totalCount));
      fd.set("payment_amount", "0");
    }

    setError(null);
    startTransition(async () => {
      const result = await createPassAction(fd);
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success("선불권이 판매되었습니다.");
        setShowForm(false);
        setName("");
        setChargeAmount(0);
        setBonusAmount(0);
      }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-stone-700">선불권</p>
        <button onClick={() => setShowForm(!showForm)} className="text-xs font-medium text-stone-600 hover:underline">
          {showForm ? "닫기" : "+ 선불권 판매"}
        </button>
      </div>

      {/* 판매 폼 */}
      {showForm && (
        <div className={`mt-3 rounded-2xl bg-white p-4 shadow-sm ${isPending ? "pointer-events-none" : ""}`}>
          <div className="flex gap-2 mb-3">
            <button type="button" onClick={() => setType("amount")}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium ${type === "amount" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}>금액권</button>
            <button type="button" onClick={() => setType("count")}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium ${type === "count" ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}>횟수권</button>
          </div>

          {type === "amount" ? (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                <input type="number" value={chargeAmount || ""} onChange={(e) => setChargeAmount(Number(e.target.value))}
                  min={0} step={10000} placeholder="충전액" className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-1.5 text-sm outline-none focus:border-stone-400" />
                <span className="text-xs text-stone-500">원</span>
              </div>
              <div className="flex gap-2 items-center">
                <input type="number" value={bonusAmount || ""} onChange={(e) => setBonusAmount(Number(e.target.value))}
                  min={0} step={10000} placeholder="보너스" className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-1.5 text-sm outline-none focus:border-stone-400" />
                <span className="text-xs text-stone-500">보너스</span>
              </div>
              {chargeAmount > 0 && (
                <p className="text-xs text-stone-500">사용 가능 잔액: ₩{(chargeAmount + bonusAmount).toLocaleString()}</p>
              )}
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <input type="number" value={totalCount || ""} onChange={(e) => setTotalCount(Number(e.target.value))}
                min={1} placeholder="횟수" className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-1.5 text-sm outline-none focus:border-stone-400" />
              <span className="text-xs text-stone-500">회</span>
            </div>
          )}

          <div className="mt-2 flex gap-2 items-center">
            <select value={validityMonths} onChange={(e) => setValidityMonths(Number(e.target.value))}
              className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-1.5 text-sm outline-none focus:border-stone-400">
              <option value={6}>6개월</option>
              <option value={12}>1년</option>
              <option value={0}>무제한</option>
            </select>
            <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-1.5 text-sm outline-none focus:border-stone-400">
              <option value="card">카드</option>
              <option value="cash">현금</option>
              <option value="transfer">계좌이체</option>
            </select>
          </div>

          {error && <p className="mt-2 text-center text-xs text-red-500">{error}</p>}

          <button onClick={handleSubmit} disabled={isPending}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50">
            {isPending && <Spinner />}판매
          </button>
        </div>
      )}

      {/* 보유 목록 */}
      <div className="mt-3 flex flex-col gap-2">
        {initialPasses.length === 0 && !showForm && (
          <p className="py-4 text-center text-xs text-stone-400">보유 중인 선불권이 없습니다</p>
        )}
        {initialPasses.map((p) => {
          const expired = isExpired(p.expires_at);
          const expiringSoon = isExpiringSoon(p.expires_at);
          return (
            <div key={p.id} className={`rounded-xl bg-white p-3 shadow-sm ${expired ? "opacity-50" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-stone-900">{p.name}</span>
                {expired && <span className="rounded bg-stone-200 px-1.5 py-0.5 text-[10px] text-stone-500">만료</span>}
                {expiringSoon && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">만료 임박</span>}
              </div>
              <p className="mt-1 text-xs text-stone-500">
                {p.type === "amount"
                  ? `잔액 ₩${(p.balance ?? 0).toLocaleString()} / ₩${(p.total_amount ?? 0).toLocaleString()}`
                  : `잔여 ${p.remaining ?? 0}회 / ${p.total_count ?? 0}회`}
                {p.expires_at && ` · ~${p.expires_at}`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
