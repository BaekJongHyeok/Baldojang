"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import type { Json } from "@/types/database";
import { Spinner } from "@/components/spinner";

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price: Json;
  recommend_cycle_weeks: number | null;
};

function parsePriceMode(price: Json): "single" | "size" {
  if (typeof price === "object" && price !== null && !Array.isArray(price)) {
    if ("all" in price) return "single";
  }
  return "size";
}

function parsePriceValues(price: Json) {
  if (typeof price !== "object" || price === null || Array.isArray(price))
    return { all: 0, small: 0, medium: 0, large: 0 };
  const p = price as Record<string, number>;
  return {
    all: p.all ?? 0,
    small: p.small ?? 0,
    medium: p.medium ?? 0,
    large: p.large ?? 0,
  };
}

export function ServiceFormDialog({
  action,
  service,
  onClose,
}: {
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  service?: Service;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [priceMode, setPriceMode] = useState<"single" | "size">(
    service ? parsePriceMode(service.price) : "single",
  );
  const initPrices = service ? parsePriceValues(service.price) : { all: 0, small: 0, medium: 0, large: 0 };
  const [prices, setPrices] = useState(initPrices);

  function handleSubmit(formData: FormData) {
    const priceJson =
      priceMode === "single"
        ? { all: prices.all }
        : { small: prices.small, medium: prices.medium, large: prices.large };
    formData.set("price", JSON.stringify(priceJson));
    if (service) formData.set("id", service.id);
    setError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success(service ? "시술이 수정되었습니다." : "시술이 추가되었습니다.");
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className={`w-full max-w-md rounded-2xl bg-white p-6 shadow-lg ${isPending ? "pointer-events-none" : ""}`}>
        <h2 className="text-lg font-bold text-stone-900">
          {service ? "시술 수정" : "시술 추가"}
        </h2>

        <form action={handleSubmit} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700">시술 이름</span>
            <input
              name="name"
              type="text"
              required
              defaultValue={service?.name ?? ""}
              className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
              placeholder="예) 전체미용"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700">
              소요시간 (분)
            </span>
            <input
              name="duration_minutes"
              type="number"
              required
              min={5}
              step={5}
              defaultValue={service?.duration_minutes ?? 60}
              className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
            />
          </label>

          {/* 가격 토글 */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-stone-700">가격</legend>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPriceMode("single")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  priceMode === "single"
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600"
                }`}
              >
                단일가
              </button>
              <button
                type="button"
                onClick={() => setPriceMode("size")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  priceMode === "size"
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600"
                }`}
              >
                체급별
              </button>
            </div>

            {priceMode === "single" ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={prices.all || ""}
                  onChange={(e) =>
                    setPrices((p) => ({ ...p, all: Number(e.target.value) }))
                  }
                  className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
                  placeholder="40,000"
                />
                <span className="text-sm text-stone-500">원</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {(["small", "medium", "large"] as const).map((size) => (
                  <div key={size} className="flex items-center gap-2">
                    <span className="w-10 text-xs font-medium text-stone-500">
                      {size === "small"
                        ? "소형"
                        : size === "medium"
                          ? "중형"
                          : "대형"}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={prices[size] || ""}
                      onChange={(e) =>
                        setPrices((p) => ({
                          ...p,
                          [size]: Number(e.target.value),
                        }))
                      }
                      className="flex-1 rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
                    />
                    <span className="text-sm text-stone-500">원</span>
                  </div>
                ))}
              </div>
            )}
          </fieldset>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700">
              권장 재방문 주기 (주, 선택)
            </span>
            <input
              name="recommend_cycle_weeks"
              type="number"
              min={1}
              defaultValue={service?.recommend_cycle_weeks ?? ""}
              className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
              placeholder="예) 5"
            />
          </label>

          {error && (
            <p className="text-center text-sm text-red-500">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-stone-900 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:opacity-50"
            >
              {isPending && <Spinner />}
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
