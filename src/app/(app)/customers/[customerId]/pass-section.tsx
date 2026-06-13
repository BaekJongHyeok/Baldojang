"use client";

import { useTransition, useState, useMemo } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/spinner";
import { createPassAction, togglePassDisableAction } from "@/lib/pass-actions";
import { getPassStatus, type PassStatus } from "@/lib/utils";

type Pass = {
  id: string;
  type: string;
  name: string;
  total_amount: number | null;
  balance: number | null;
  total_count: number | null;
  remaining: number | null;
  expires_at: string | null;
  disabled_at?: string | null;
};

function isExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
}

function statusBadge(status: PassStatus, expiresAt: string | null) {
  if (status === "disabled") return { label: "중지됨", cls: "bg-border-light text-ink-caption" };
  if (status === "expired") return { label: "만료", cls: "bg-danger-light text-danger" };
  if (status === "depleted") return { label: "소진", cls: "bg-border-light text-ink-caption" };
  if (isExpiringSoon(expiresAt)) return { label: "만료 임박", cls: "bg-warning-light text-warning" };
  return { label: "사용중", cls: "bg-success-light text-success" };
}

function formatExpiry(expiresAt: string | null) {
  if (!expiresAt) return "기한 없음";
  const d = new Date(expiresAt);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.까지`;
}

export function PassSection({ customerId, passes }: { customerId: string; passes: Pass[] }) {
  const [showForm, setShowForm] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { active, inactive } = useMemo(() => {
    const a: Pass[] = [];
    const i: Pass[] = [];
    for (const p of passes) {
      const s = getPassStatus(p);
      if (s === "active") a.push(p);
      else i.push(p);
    }
    return { active: a, inactive: i };
  }, [passes]);

  // 폼 state
  const [type, setType] = useState<"amount" | "count">("amount");
  const [name, setName] = useState("");
  const [chargeAmount, setChargeAmount] = useState(0);
  const [bonusAmount, setBonusAmount] = useState(0);
  const [totalCount, setTotalCount] = useState(10);
  const [validityMode, setValidityMode] = useState<"6" | "12" | "0" | "custom">("12");
  const [customDate, setCustomDate] = useState("");
  const [payMethod, setPayMethod] = useState("card");
  const [error, setError] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  function handleSubmit() {
    if (validityMode === "custom" && (!customDate || customDate <= todayStr)) {
      setError("만료일은 오늘 이후여야 해요."); return;
    }
    if (type === "count" && chargeAmount <= 0) {
      setError("판매 금액을 입력해주세요."); return;
    }
    const fd = new FormData();
    fd.set("customer_id", customerId);
    fd.set("type", type);
    fd.set("name", name || (type === "amount" ? `${(chargeAmount / 10000).toFixed(0)}만원권` : `${totalCount}회권`));
    fd.set("payment_method", payMethod);
    if (validityMode === "custom") { fd.set("validity_months", "0"); fd.set("expires_at", customDate); }
    else fd.set("validity_months", validityMode);
    if (type === "amount") {
      fd.set("charge_amount", String(chargeAmount));
      fd.set("bonus_amount", String(bonusAmount));
      fd.set("payment_amount", String(chargeAmount));
    } else {
      fd.set("total_count", String(totalCount));
      fd.set("charge_amount", String(chargeAmount));
      fd.set("payment_amount", String(chargeAmount));
    }
    setError(null);
    startTransition(async () => {
      const result = await createPassAction(fd);
      if (result?.error) { setError(result.error); toast.error(result.error); }
      else { toast.success("선불권이 판매됐어요."); setShowForm(false); setName(""); setChargeAmount(0); setBonusAmount(0); }
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-bold text-ink-secondary">선불권</p>
        <button onClick={() => setShowForm(!showForm)} className="text-[12px] font-medium text-primary hover:underline">
          {showForm ? "닫기" : "+ 판매"}
        </button>
      </div>

      {/* 판매 폼 */}
      {showForm && (
        <div className={`mt-3 rounded-lg border border-border bg-white p-4 ${isPending ? "pointer-events-none" : ""}`}>
          <div className="flex gap-2 mb-3">
            <button type="button" onClick={() => setType("amount")}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium ${type === "amount" ? "bg-primary text-white" : "bg-border-light text-ink-secondary"}`}>금액권</button>
            <button type="button" onClick={() => setType("count")}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium ${type === "count" ? "bg-primary text-white" : "bg-border-light text-ink-secondary"}`}>횟수권</button>
          </div>
          {type === "amount" ? (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                <input type="number" value={chargeAmount || ""} onChange={(e) => setChargeAmount(Number(e.target.value))} min={0} step={10000} placeholder="충전액"
                  className="min-w-0 flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:border-primary" />
                <span className="text-xs text-ink-caption">원</span>
              </div>
              <div className="flex gap-2 items-center">
                <input type="number" value={bonusAmount || ""} onChange={(e) => setBonusAmount(Number(e.target.value))} min={0} step={10000} placeholder="보너스"
                  className="min-w-0 flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:border-primary" />
                <span className="text-xs text-ink-caption">보너스</span>
              </div>
              {chargeAmount > 0 && <p className="text-xs text-ink-caption">사용 가능 잔액: ₩{(chargeAmount + bonusAmount).toLocaleString()}</p>}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                <input type="number" value={totalCount || ""} onChange={(e) => setTotalCount(Number(e.target.value))} min={1} placeholder="횟수"
                  className="min-w-0 flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:border-primary" />
                <span className="text-xs text-ink-caption">회</span>
              </div>
              <div className="flex gap-2 items-center">
                <input type="number" value={chargeAmount || ""} onChange={(e) => setChargeAmount(Number(e.target.value))} min={0} step={10000} placeholder="판매가"
                  className="min-w-0 flex-1 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:border-primary" />
                <span className="text-xs text-ink-caption">원</span>
              </div>
              {chargeAmount > 0 && totalCount > 0 && (
                <p className="text-xs text-ink-caption">회당 단가: ₩{Math.floor(chargeAmount / totalCount).toLocaleString()}</p>
              )}
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-ink-caption">유효기간</span>
              <select value={validityMode} onChange={(e) => setValidityMode(e.target.value as typeof validityMode)}
                className="min-w-0 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:border-primary">
                <option value="6">6개월</option>
                <option value="12">1년</option>
                <option value="0">무제한</option>
                <option value="custom">직접 입력</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-ink-caption">결제 수단</span>
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}
                className="min-w-0 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:border-primary">
                <option value="card">카드</option>
                <option value="cash">현금</option>
                <option value="transfer">이체</option>
              </select>
            </div>
          </div>
          {validityMode === "custom" && (
            <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} min={todayStr}
              className="mt-2 w-full rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:border-primary" />
          )}
          {error && <p className="mt-2 text-center text-xs text-danger">{error}</p>}
          <button onClick={handleSubmit} disabled={isPending}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50">
            {isPending && <Spinner />}판매
          </button>
        </div>
      )}

      {/* 활성 패스 */}
      <div className="mt-3 flex flex-col gap-2">
        {active.length === 0 && !showForm && (
          <div className="flex flex-col items-center py-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-border-light">
              <svg className="h-5 w-5 text-ink-disabled" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
            </div>
            <p className="mt-2 text-[13px] text-ink-caption">아직 선불권이 없어요</p>
            <p className="text-[11px] text-ink-disabled">판매하면 잔액이 여기 표시돼요</p>
          </div>
        )}
        {active.map((p) => <PassCard key={p.id} pass={p} />)}
      </div>

      {/* 소진/만료/중지 */}
      {inactive.length > 0 && (
        <div className="mt-3">
          <button onClick={() => setShowInactive(!showInactive)}
            className="flex items-center gap-1 text-[12px] text-ink-caption hover:text-ink-secondary">
            <svg className={`h-3 w-3 transition ${showInactive ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            지난 선불권 ({inactive.length})
          </button>
          {showInactive && (
            <div className="mt-2 flex flex-col gap-1.5">
              {inactive.map((p) => <PassCard key={p.id} pass={p} inactive />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PassCard({ pass: p, inactive }: { pass: Pass; inactive?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<"disable" | "enable" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const status = getPassStatus(p);
  const badge = statusBadge(status, p.expires_at);
  const isAmount = p.type === "amount";
  const total = isAmount ? (p.total_amount ?? 0) : (p.total_count ?? 0);
  const current = isAmount ? (p.balance ?? 0) : (p.remaining ?? 0);
  const ratio = total > 0 ? current / total : 0;
  const expiringSoon = isExpiringSoon(p.expires_at);
  const isDisabled = status === "disabled";
  const canToggle = status === "active" || status === "disabled";

  function handleToggle(disable: boolean) {
    const fd = new FormData();
    fd.set("pass_id", p.id);
    fd.set("disable", String(disable));
    startTransition(async () => {
      const result = await togglePassDisableAction(fd);
      if (result?.error) toast.error(result.error);
      else toast.success(disable ? "선불권이 사용 중지됐어요." : "선불권이 다시 활성화됐어요.");
      setConfirm(null);
      setMenuOpen(false);
    });
  }

  return (
    <div className={`rounded-lg border border-border bg-white p-4 ${inactive && !isDisabled ? "opacity-60" : ""} ${isDisabled ? "opacity-70 bg-bg" : ""}`}>
      {/* 1행 */}
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-ink">{p.name}</span>
        <div className="flex items-center gap-1.5">
          <span className={`rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${badge.cls}`}>{badge.label}</span>
          {canToggle && (
            <div className="relative">
              <button onClick={() => setMenuOpen(!menuOpen)} className="flex h-6 w-6 items-center justify-center rounded text-ink-caption hover:bg-bg">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-7 z-10 min-w-[120px] rounded-md border border-border bg-white py-1 shadow-lg">
                  <button
                    onClick={() => { setMenuOpen(false); setConfirm(isDisabled ? "enable" : "disable"); }}
                    className={`w-full px-3 py-1.5 text-left text-[13px] transition-colors hover:bg-bg ${isDisabled ? "text-primary" : "text-danger"}`}
                  >
                    {isDisabled ? "다시 활성화" : "사용 중지"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* 2행 */}
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-[22px] font-bold text-ink tabular-nums">
          {isAmount ? `₩${current.toLocaleString()}` : `${current}회 남음`}
        </span>
        <span className="text-[12px] text-ink-caption">
          / {isAmount ? `₩${total.toLocaleString()} 충전` : `${total}회`}
        </span>
      </div>
      {!isAmount && (p.total_amount ?? 0) > 0 && (
        <p className="mt-0.5 text-[11px] text-ink-caption">
          잔여 ₩{(p.balance ?? 0).toLocaleString()} / ₩{p.total_amount!.toLocaleString()} (회당 ₩{Math.floor(p.total_amount! / (p.total_count ?? 1)).toLocaleString()})
        </p>
      )}
      {/* 프로그레스 바 */}
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border-light">
        <div className={`h-full rounded-full transition-all ${isDisabled ? "bg-ink-disabled" : "bg-primary"}`} style={{ width: `${Math.max(0, Math.min(100, ratio * 100))}%` }} />
      </div>
      {/* 3행 */}
      <p className={`mt-1.5 text-[11px] ${expiringSoon ? "text-warning font-medium" : "text-ink-disabled"}`}>
        {formatExpiry(p.expires_at)}
      </p>

      {/* confirm 다이얼로그 */}
      {confirm && (
        <div className={`mt-3 rounded-md p-3 ${confirm === "disable" ? "bg-danger-light" : "bg-primary-light"}`}>
          <p className={`text-[13px] font-medium ${confirm === "disable" ? "text-danger" : "text-primary"}`}>
            {confirm === "disable" ? "이 선불권을 사용 중지할까요?" : "이 선불권을 다시 활성화할까요?"}
          </p>
          {confirm === "disable" && (
            <p className="mt-0.5 text-[11px] text-danger/70">잔액 차감이 불가해지고, 판매 기록은 유지돼요.</p>
          )}
          {confirm === "enable" && (
            <p className="mt-0.5 text-[11px] text-primary/70">다시 잔액 차감이 가능해져요.</p>
          )}
          <div className="mt-2 flex gap-2">
            <button onClick={() => setConfirm(null)} className="flex-1 rounded-md border border-border bg-white py-1.5 text-[12px] font-medium text-ink-secondary">돌아가기</button>
            <button onClick={() => handleToggle(confirm === "disable")} disabled={isPending}
              className={`flex-1 rounded-md py-1.5 text-[12px] font-medium text-white disabled:opacity-50 ${confirm === "disable" ? "bg-danger" : "bg-primary"}`}>
              {isPending ? "처리 중..." : confirm === "disable" ? "사용 중지" : "활성화"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
