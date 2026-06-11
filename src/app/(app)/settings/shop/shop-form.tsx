"use client";

import { useTransition, useState } from "react";
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
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [hours, setHours] = useState<OpenHours>(openHours);

  function toggleDay(key: string) {
    setHours((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = { open: "10:00", close: "20:00" };
      }
      return next;
    });
  }

  function updateTime(key: string, field: "open" | "close", value: string) {
    setHours((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  }

  function handleSubmit(formData: FormData) {
    formData.set("open_hours", JSON.stringify(hours));
    setMessage(null);
    startTransition(async () => {
      const result = await updateShopAction(formData);
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
        toast.error(result.error);
      } else {
        setMessage({ type: "success", text: "저장되었습니다." });
        toast.success("샵 정보가 저장되었습니다.");
      }
    });
  }

  return (
    <form action={handleSubmit} className={`flex flex-col gap-5 ${isPending ? "pointer-events-none" : ""}`}>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-stone-700">샵 이름</span>
        <input
          name="name"
          type="text"
          required
          defaultValue={name}
          className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-stone-700">전화번호</span>
        <input
          name="phone"
          type="tel"
          defaultValue={phone}
          className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
          placeholder="02-1234-5678"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-stone-700">주소</span>
        <input
          name="address"
          type="text"
          defaultValue={address}
          className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
          placeholder="서울시 강남구 ..."
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-stone-700">
          슬롯 단위 (분)
        </span>
        <select
          name="slot_minutes"
          defaultValue={slotMinutes}
          className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
        >
          <option value={15}>15분</option>
          <option value={30}>30분</option>
          <option value={60}>60분</option>
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-stone-700">
          기본 재방문 주기 (주)
        </span>
        <input
          name="default_cycle_weeks"
          type="number"
          min={1}
          max={52}
          defaultValue={defaultCycleWeeks}
          className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
        />
        <span className="text-[10px] text-stone-400">시술별 주기가 없을 때 적용됩니다</span>
      </label>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium text-stone-700">영업시간</legend>
        <div className="mt-2 flex flex-col gap-2">
          {DAYS.map(({ key, label }) => {
            const active = !!hours[key];
            return (
              <div
                key={key}
                className="flex flex-col gap-1.5 rounded-xl bg-stone-50 p-3 lg:flex-row lg:items-center lg:gap-3 lg:rounded-none lg:bg-transparent lg:p-0"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-sm font-medium text-stone-600">
                    {label}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleDay(key)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                      active ? "bg-stone-900" : "bg-stone-200"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                        active ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </button>
                  {!active && (
                    <span className="text-xs text-stone-400">휴무</span>
                  )}
                </div>
                {active && (
                  <div className="flex min-w-0 items-center gap-1.5 pl-9 lg:pl-0">
                    <input
                      type="time"
                      value={hours[key].open}
                      onChange={(e) => updateTime(key, "open", e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-stone-200 px-2 py-1 text-xs outline-none focus:border-stone-400"
                    />
                    <span className="shrink-0 text-xs text-stone-400">~</span>
                    <input
                      type="time"
                      value={hours[key].close}
                      onChange={(e) => updateTime(key, "close", e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-stone-200 px-2 py-1 text-xs outline-none focus:border-stone-400"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-stone-900 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:opacity-50"
      >
        {isPending && <Spinner />}
        저장
      </button>

      {message && (
        <p
          className={`text-center text-sm ${
            message.type === "success" ? "text-green-600" : "text-red-500"
          }`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
