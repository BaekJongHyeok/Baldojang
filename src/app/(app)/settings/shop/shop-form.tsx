"use client";

import { useTransition, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateShopAction } from "@/lib/settings-actions";
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

// 00:00 ~ 23:30, 30분 단위
const TIME_SLOTS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    TIME_SLOTS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

type DayHours = { open: string; close: string };
type OpenHours = Record<string, DayHours>;

export function ShopSettingsForm({
  name,
  phone,
  address,
  openHours,
  slotMinutes,
  defaultCycleWeeks,
}: {
  name: string;
  phone: string;
  address: string;
  openHours: OpenHours;
  slotMinutes: number;
  defaultCycleWeeks: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hours, setHours] = useState<OpenHours>(openHours);
  const [isDirty, setDirty] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function toggleDay(key: string) {
    setHours((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = { open: "10:00", close: "20:00" };
      return next;
    });
    setDirty(true);
  }

  function updateTime(key: string, field: "open" | "close", value: string) {
    setHours((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
    setDirty(true);
  }

  function handleSubmit(formData: FormData) {
    formData.set("open_hours", JSON.stringify(hours));
    startTransition(async () => {
      const result = await updateShopAction(formData);
      if (result?.error) toast.error(result.error);
      else { toast.success("샵 정보가 저장되었습니다."); setDirty(false); router.refresh(); }
    });
  }

  const SEL = "min-w-0 flex-1 rounded-md border border-border px-2 py-1 text-xs outline-none focus:border-primary";
  const INPUT = "rounded-md border border-border px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary";

  return (
    // onSubmit + preventDefault: React 19의 form action 자동 리셋(저장 직후 필드가
    // 초기값으로 되돌아가 보이는 문제)을 차단한다. action={...}로 되돌리지 말 것.
    <form ref={formRef}
      onSubmit={(e) => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)); }}
      onChange={() => setDirty(true)}
      className={`flex flex-col gap-5 ${isPending ? "pointer-events-none" : ""}`}>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-secondary">샵 이름</span>
        <input name="name" type="text" required defaultValue={name} className={INPUT} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-secondary">전화번호</span>
        <input name="phone" type="tel" defaultValue={phone} className={INPUT} placeholder="02-1234-5678" />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-secondary">주소</span>
        <input name="address" type="text" defaultValue={address} className={INPUT} placeholder="서울시 강남구 ..." />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-secondary">슬롯 단위 (분)</span>
        <select name="slot_minutes" defaultValue={slotMinutes} className={INPUT}>
          <option value={15}>15분</option>
          <option value={30}>30분</option>
          <option value={60}>60분</option>
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-secondary">기본 재방문 주기 (주)</span>
        <input name="default_cycle_weeks" type="number" min={1} max={52} defaultValue={defaultCycleWeeks} className={INPUT} />
        <span className="text-[10px] text-ink-caption">시술별 주기가 없을 때 적용됩니다</span>
      </label>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-ink-secondary">영업시간</legend>
        <div className="mt-2 flex flex-col gap-2">
          {DAYS.map(({ key, label }) => {
            const active = !!hours[key];
            return (
              <div key={key} className="flex flex-col gap-1.5 rounded-md bg-bg p-3 lg:flex-row lg:items-center lg:gap-3 lg:rounded-none lg:bg-transparent lg:p-0">
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-sm font-medium text-ink-secondary">{label}</span>
                  <button type="button" onClick={() => toggleDay(key)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${active ? "bg-primary" : "bg-border-light"}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${active ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                  {!active && <span className="text-xs text-ink-caption">휴무</span>}
                </div>
                {active && (
                  <div className="flex min-w-0 items-center gap-1.5 pl-9 lg:pl-0">
                    <select value={hours[key].open} onChange={(e) => updateTime(key, "open", e.target.value)} className={SEL}>
                      {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <span className="shrink-0 text-xs text-ink-caption">~</span>
                    <select value={hours[key].close} onChange={(e) => updateTime(key, "close", e.target.value)} className={SEL}>
                      {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>

      <button type="submit" disabled={isPending || !isDirty}
        className="mt-2 flex items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-medium text-white transition hover:bg-primary-hover disabled:opacity-50">
        {isPending && <Spinner />}
        저장
      </button>
    </form>
  );
}
