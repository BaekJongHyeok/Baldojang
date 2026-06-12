"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
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
  defaultCycleWeeks,
}: {
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  service?: Service;
  onClose: () => void;
  defaultCycleWeeks?: number;
}) {
  const router = useRouter();
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
        toast.success(service ? "시술이 수정됐어요." : "시술이 추가됐어요.");
        onClose();
        router.refresh();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className={`w-full max-w-md rounded-lg border border-border bg-white p-6 shadow-modal ${isPending ? "pointer-events-none" : ""}`}>
        <h2 className="text-base font-bold text-ink">
          {service ? "시술 수정" : "시술 추가"}
        </h2>

        {/* onSubmit + preventDefault: React 19 form action 자동 리셋 차단 */}
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)); }} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-secondary">시술 이름</span>
            <input
              name="name"
              type="text"
              required
              defaultValue={service?.name ?? ""}
              className="rounded-md border border-border px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="예) 전체미용"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-secondary">
              소요시간 (분)
            </span>
            <input
              name="duration_minutes"
              type="number"
              required
              min={5}
              step={5}
              defaultValue={service?.duration_minutes ?? 60}
              className="rounded-md border border-border px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>

          {/* 가격 토글 */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-ink-secondary">가격</legend>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPriceMode("single")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  priceMode === "single"
                    ? "bg-primary text-white"
                    : "bg-border-light text-ink-secondary"
                }`}
              >
                단일가
              </button>
              <button
                type="button"
                onClick={() => setPriceMode("size")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  priceMode === "size"
                    ? "bg-primary text-white"
                    : "bg-border-light text-ink-secondary"
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
                  className="flex-1 rounded-md border border-border px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="40,000"
                />
                <span className="text-sm text-ink-caption">원</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {(["small", "medium", "large"] as const).map((size) => (
                  <div key={size} className="flex items-center gap-2">
                    <span className="w-10 text-xs font-medium text-ink-caption">
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
                      className="flex-1 rounded-md border border-border px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    <span className="text-sm text-ink-caption">원</span>
                  </div>
                ))}
              </div>
            )}
          </fieldset>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-secondary">
              권장 재방문 주기 (주, 선택)
            </span>
            <span className="text-xs text-ink-disabled">비워두면 기본 주기({defaultCycleWeeks ?? 5}주)가 적용돼요</span>
            <input
              name="recommend_cycle_weeks"
              type="number"
              min={1}
              defaultValue={service?.recommend_cycle_weeks ?? ""}
              className="rounded-md border border-border px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="예) 5"
            />
          </label>

          {error && (
            <p className="text-center text-sm text-danger">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-border py-2.5 text-sm font-medium text-ink-secondary transition hover:bg-bg"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-medium text-white transition hover:bg-primary-hover disabled:opacity-50"
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
