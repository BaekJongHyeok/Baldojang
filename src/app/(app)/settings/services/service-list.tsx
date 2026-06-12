"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import type { Json } from "@/types/database";
import {
  createServiceAction,
  updateServiceAction,
  toggleServiceAction,
  reorderServiceAction,
} from "@/lib/settings-actions";
import { ServiceFormDialog } from "./service-form";

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price: Json;
  recommend_cycle_weeks: number | null;
  sort_order: number;
  is_active: boolean;
};

function formatPrice(price: Json): string {
  if (typeof price !== "object" || price === null || Array.isArray(price))
    return "-";
  const p = price as Record<string, number>;
  if ("all" in p) return `${p.all.toLocaleString()}원`;
  const parts: string[] = [];
  if (p.small != null) parts.push(`소형 ${p.small.toLocaleString()}`);
  if (p.medium != null) parts.push(`중형 ${p.medium.toLocaleString()}`);
  if (p.large != null) parts.push(`대형 ${p.large.toLocaleString()}`);
  return parts.join(" / ") + "원";
}

export function ServiceList({ services }: { services: Service[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  function handleToggle(service: Service) {
    const fd = new FormData();
    fd.set("id", service.id);
    fd.set("is_active", String(service.is_active));
    startTransition(async () => {
      await toggleServiceAction(fd);
      router.refresh();
    });
  }

  function handleReorder(id: string, direction: "up" | "down") {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("direction", direction);
    startTransition(async () => {
      await reorderServiceAction(fd);
      router.refresh();
    });
  }

  return (
    <div className="mt-6">
      <button
        onClick={() => setShowAdd(true)}
        className="mb-4 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-hover"
      >
        + 시술 추가
      </button>

      {showAdd && (
        <ServiceFormDialog
          action={createServiceAction}
          onClose={() => setShowAdd(false)}
        />
      )}

      {editId && (
        <ServiceFormDialog
          action={updateServiceAction}
          service={services.find((s) => s.id === editId)}
          onClose={() => setEditId(null)}
        />
      )}

      {services.length === 0 ? (
        <p className="py-12 text-center text-sm text-ink-caption">
          등록된 시술이 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {services.map((s, idx) => (
            <div
              key={s.id}
              className={`flex items-center gap-3 rounded-lg border border-border bg-white p-4 ${
                !s.is_active ? "opacity-50" : ""
              }`}
            >
              {/* 정렬 버튼 */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleReorder(s.id, "up")}
                  disabled={idx === 0 || isPending}
                  className="text-ink-caption hover:text-ink-secondary disabled:opacity-30"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                  </svg>
                </button>
                <button
                  onClick={() => handleReorder(s.id, "down")}
                  disabled={idx === services.length - 1 || isPending}
                  className="text-ink-caption hover:text-ink-secondary disabled:opacity-30"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>

              {/* 정보 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {s.name}
                </p>
                <p className="mt-0.5 text-xs text-ink-caption">
                  {s.duration_minutes}분 · {formatPrice(s.price)}
                  {s.recommend_cycle_weeks
                    ? ` · ${s.recommend_cycle_weeks}주 주기`
                    : ""}
                </p>
              </div>

              {/* 액션 */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditId(s.id)}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-secondary transition hover:bg-bg"
                >
                  수정
                </button>
                <button
                  onClick={() => handleToggle(s)}
                  disabled={isPending}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                    s.is_active
                      ? "text-danger hover:bg-danger-light"
                      : "text-success hover:bg-success-light"
                  }`}
                >
                  {s.is_active ? "비활성화" : "활성화"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
