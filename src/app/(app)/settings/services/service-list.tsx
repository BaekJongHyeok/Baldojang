"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import type { Json } from "@/types/database";
import { toast } from "sonner";
import {
  createServiceAction,
  updateServiceAction,
  toggleServiceAction,
  reorderServiceAction,
  updateDefaultCycleAction,
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
  if (typeof price !== "object" || price === null || Array.isArray(price)) return "-";
  const p = price as Record<string, number>;
  if ("all" in p) return `${p.all.toLocaleString()}원`;
  const parts: string[] = [];
  if (p.small != null) parts.push(`소형 ${p.small.toLocaleString()}`);
  if (p.medium != null) parts.push(`중형 ${p.medium.toLocaleString()}`);
  if (p.large != null) parts.push(`대형 ${p.large.toLocaleString()}`);
  return parts.join(" / ") + "원";
}

export function ServiceList({ services, defaultCycleWeeks }: { services: Service[]; defaultCycleWeeks: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [confirmToggleId, setConfirmToggleId] = useState<string | null>(null);
  const [cycle, setCycle] = useState(defaultCycleWeeks);
  const [cycleEditing, setCycleEditing] = useState(false);
  const [cycleValue, setCycleValue] = useState(String(defaultCycleWeeks));

  function handleToggle(service: Service) {
    const fd = new FormData();
    fd.set("id", service.id);
    fd.set("is_active", String(service.is_active));
    startTransition(async () => {
      await toggleServiceAction(fd);
      setConfirmToggleId(null);
      setMenuId(null);
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

  function saveCycle() {
    const num = Number(cycleValue);
    if (num < 1 || num > 52) { toast.error("1~52주 범위로 입력해주세요."); return; }
    const fd = new FormData();
    fd.set("default_cycle_weeks", String(num));
    startTransition(async () => {
      const result = await updateDefaultCycleAction(fd);
      if (result?.error) { toast.error(result.error); return; }
      setCycle(num);
      setCycleEditing(false);
      toast.success("기본 주기가 변경됐어요.");
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
        <ServiceFormDialog action={createServiceAction} onClose={() => setShowAdd(false)} defaultCycleWeeks={cycle} />
      )}
      {editId && (
        <ServiceFormDialog action={updateServiceAction} service={services.find((s) => s.id === editId)} onClose={() => setEditId(null)} defaultCycleWeeks={cycle} />
      )}

      {/* 시술 목록 */}
      {services.length === 0 ? (
        <p className="py-12 text-center text-sm text-ink-caption">등록된 시술이 없어요.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {services.map((s, idx) => (
            <div
              key={s.id}
              className={`flex items-center gap-3 rounded-lg border border-border bg-white p-4 ${!s.is_active ? "opacity-50" : ""}`}
            >
              {/* 정렬 ▲▼ */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleReorder(s.id, "up")}
                  disabled={idx === 0 || isPending}
                  className="flex h-6 w-6 items-center justify-center rounded text-ink-caption transition-colors hover:bg-bg hover:text-ink disabled:opacity-20"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
                </button>
                <button
                  onClick={() => handleReorder(s.id, "down")}
                  disabled={idx === services.length - 1 || isPending}
                  className="flex h-6 w-6 items-center justify-center rounded text-ink-caption transition-colors hover:bg-bg hover:text-ink disabled:opacity-20"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                </button>
              </div>

              {/* 정보 */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{s.name}</p>
                <p className="mt-0.5 text-xs text-ink-caption">
                  {s.duration_minutes}분 · {formatPrice(s.price)}
                  {s.recommend_cycle_weeks ? ` · ${s.recommend_cycle_weeks}주 주기` : ""}
                </p>
              </div>

              {/* 수정 아이콘 + ⋯ 메뉴 */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditId(s.id)}
                  aria-label="시술 수정"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-ink-caption transition-colors hover:bg-border-light hover:text-ink"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                </button>
                <div className="relative">
                  <button
                    onClick={() => setMenuId(menuId === s.id ? null : s.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-ink-caption transition-colors hover:bg-border-light hover:text-ink"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>
                  </button>
                  {menuId === s.id && (
                    <div className="absolute right-0 top-9 z-10 min-w-[100px] rounded-md border border-border bg-white py-1 shadow-lg">
                      <button
                        onClick={() => { setMenuId(null); setConfirmToggleId(s.id); }}
                        className={`w-full px-3 py-1.5 text-left text-[13px] transition-colors hover:bg-bg ${s.is_active ? "text-danger" : "text-success"}`}
                      >
                        {s.is_active ? "비활성화" : "활성화"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 확인 다이얼로그 (인라인) */}
              {confirmToggleId === s.id && (
                <div className="absolute inset-x-4 mt-2 rounded-md bg-bg p-3">
                  <p className="text-[13px] text-ink">{s.is_active ? `"${s.name}" 시술을 비활성화할까요?` : `"${s.name}" 시술을 다시 활성화할까요?`}</p>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => setConfirmToggleId(null)} className="flex-1 rounded-md border border-border py-1.5 text-[12px] font-medium text-ink-secondary">취소</button>
                    <button onClick={() => handleToggle(s)} disabled={isPending}
                      className={`flex-1 rounded-md py-1.5 text-[12px] font-medium text-white disabled:opacity-50 ${s.is_active ? "bg-danger" : "bg-success"}`}>
                      {s.is_active ? "비활성화" : "활성화"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 기본 재방문 주기 — 시술 목록 아래 가벼운 행 */}
      <div className="mt-6 flex items-center gap-3 px-1 text-[14px]">
        <span className="text-ink-caption">기본 재방문 주기</span>
        {!cycleEditing ? (
          <button onClick={() => setCycleEditing(true)} className="flex items-center gap-1 font-semibold text-ink hover:text-primary">
            {cycle}주
            <svg className="h-4 w-4 text-ink-caption" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <input type="number" min={1} max={52} value={cycleValue} onChange={(e) => setCycleValue(e.target.value)}
              className="w-16 rounded-md border border-border px-2 py-1 text-[14px] text-ink outline-none focus:border-primary" autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") saveCycle(); if (e.key === "Escape") setCycleEditing(false); }} />
            <span className="text-[13px] text-ink-caption">주</span>
            <button onClick={saveCycle} disabled={isPending} className="text-[12px] font-medium text-primary hover:underline">{isPending ? "..." : "저장"}</button>
            <button onClick={() => { setCycleEditing(false); setCycleValue(String(cycle)); }} className="text-[12px] text-ink-caption hover:underline">취소</button>
          </div>
        )}
        <span className="text-[11px] text-ink-disabled">시술별 주기가 없을 때 적용돼요</span>
      </div>
    </div>
  );
}
