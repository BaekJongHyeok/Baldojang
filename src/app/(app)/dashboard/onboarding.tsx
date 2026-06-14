"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateShopAction, createServiceAction } from "@/lib/settings-actions";
import { Spinner } from "@/components/spinner";

const DAYS = [
  { key: "mon", label: "월" },
  { key: "tue", label: "화" },
  { key: "wed", label: "수" },
  { key: "thu", label: "목" },
  { key: "fri", label: "금" },
  { key: "sat", label: "토" },
  { key: "sun", label: "일" },
] as const;

const TIME_SLOTS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    TIME_SLOTS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

type DayHours = { open: string; close: string };
type OpenHours = Record<string, DayHours>;

export function OnboardingModal({
  shopName,
  needsHours,
  needsService,
}: {
  shopName: string;
  needsHours: boolean;
  needsService: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // 이미 설정된 스텝은 건너뛰기
  const steps = [
    ...(needsHours ? ["hours" as const] : []),
    ...(needsService ? ["service" as const] : []),
  ];
  const [stepIdx, setStepIdx] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  // hours state — 평일 10-20 기본값
  const [hours, setHours] = useState<OpenHours>({
    mon: { open: "10:00", close: "20:00" },
    tue: { open: "10:00", close: "20:00" },
    wed: { open: "10:00", close: "20:00" },
    thu: { open: "10:00", close: "20:00" },
    fri: { open: "10:00", close: "20:00" },
    sat: { open: "10:00", close: "20:00" },
  });

  // service state
  const [svcName, setSvcName] = useState("");
  const [svcDuration, setSvcDuration] = useState(60);
  const [svcPrice, setSvcPrice] = useState(0);

  if (dismissed || steps.length === 0) return null;

  const currentStep = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;

  function toggleDay(key: string) {
    setHours((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = { open: "10:00", close: "20:00" };
      return next;
    });
  }

  function updateTime(key: string, field: "open" | "close", value: string) {
    setHours((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }

  function skip() {
    if (isLast) setDismissed(true);
    else setStepIdx((i) => i + 1);
  }

  function saveHours() {
    const fd = new FormData();
    fd.set("name", shopName);
    fd.set("slot_minutes", "30");
    fd.set("open_hours", JSON.stringify(hours));
    startTransition(async () => {
      const result = await updateShopAction(fd);
      if (result?.error) { toast.error(result.error); return; }
      toast.success("영업시간이 저장됐어요.");
      if (isLast) { setDismissed(true); router.refresh(); }
      else setStepIdx((i) => i + 1);
    });
  }

  function saveService() {
    if (!svcName.trim()) { toast.error("시술 이름을 입력해주세요."); return; }
    const fd = new FormData();
    fd.set("name", svcName);
    fd.set("duration_minutes", String(svcDuration));
    fd.set("price", JSON.stringify({ all: svcPrice }));
    startTransition(async () => {
      const result = await createServiceAction(fd);
      if (result?.error) { toast.error(result.error); return; }
      toast.success("시술이 등록됐어요.");
      setDismissed(true);
      router.refresh();
    });
  }

  const SEL = "min-w-[80px] flex-1 rounded-md border border-border px-2 py-1.5 text-xs outline-none focus:border-primary";
  const INPUT = "w-full rounded-md border border-border px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className={`w-full max-w-md rounded-lg bg-white shadow-modal ${isPending ? "pointer-events-none" : ""}`}>
        {/* 헤더 */}
        <div className="border-b border-border px-6 pt-6 pb-4">
          <p className="text-[12px] font-medium text-primary">
            시작하기 {stepIdx + 1}/{steps.length}
          </p>
          <h2 className="mt-1 text-[18px] font-bold text-ink">
            {currentStep === "hours" ? "영업시간을 설정해주세요" : "첫 시술을 등록해주세요"}
          </h2>
          <p className="mt-1 text-[13px] text-ink-caption">
            {currentStep === "hours"
              ? "캘린더에 영업시간이 표시돼요"
              : "예약을 잡으려면 시술이 1개 이상 필요해요"}
          </p>
        </div>

        {/* 본문 */}
        <div className="px-6 py-5">
          {currentStep === "hours" && (
            <div className="flex flex-col gap-2">
              {DAYS.map(({ key, label }) => {
                const active = !!hours[key];
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-6 text-center text-sm font-medium text-ink-secondary">{label}</span>
                    <button type="button" onClick={() => toggleDay(key)}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition ${active ? "bg-primary" : "bg-border"}`}>
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${active ? "left-[18px]" : "left-0.5"}`} />
                    </button>
                    {active ? (
                      <div className="flex min-w-0 items-center gap-1">
                        <select value={hours[key].open} onChange={(e) => updateTime(key, "open", e.target.value)} className={SEL}>
                          {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <span className="text-xs text-ink-caption">~</span>
                        <select value={hours[key].close} onChange={(e) => updateTime(key, "close", e.target.value)} className={SEL}>
                          {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    ) : (
                      <span className="text-xs text-ink-caption">휴무</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {currentStep === "service" && (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ink-secondary">시술 이름</span>
                <input type="text" value={svcName} onChange={(e) => setSvcName(e.target.value)} className={INPUT} placeholder="예) 전체미용" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ink-secondary">소요시간 (분)</span>
                  <input type="number" min={5} step={5} value={svcDuration} onChange={(e) => setSvcDuration(Number(e.target.value))} className={INPUT} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-ink-secondary">가격 (원)</span>
                  <input type="number" min={0} step={1000} value={svcPrice || ""} onChange={(e) => setSvcPrice(Number(e.target.value))} className={INPUT} placeholder="40,000" />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <button type="button" onClick={skip} className="text-[13px] text-ink-caption hover:text-ink transition-colors">
            나중에 할게요
          </button>
          <button
            type="button"
            onClick={currentStep === "hours" ? saveHours : saveService}
            disabled={isPending}
            className="flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-[14px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {isPending && <Spinner />}
            {isLast ? "완료" : "다음"}
          </button>
        </div>

        {/* 안내 */}
        <p className="px-6 pb-4 text-center text-[11px] text-ink-disabled">
          설정에서 언제든 변경할 수 있어요
        </p>
      </div>
    </div>
  );
}
