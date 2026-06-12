"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updatePetCycleAction } from "@/lib/pet-actions";

export function InlineCycleEdit({
  petId,
  cycleWeeks,
  effectiveCycle,
  cycleSource,
}: {
  petId: string;
  cycleWeeks: number | null;
  effectiveCycle: number;
  cycleSource: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(cycleWeeks?.toString() ?? "");
  const [current, setCurrent] = useState(cycleWeeks);
  const [isPending, startTransition] = useTransition();

  function save() {
    const num = value === "" ? null : Number(value);
    if (num !== null && (num < 1 || num > 52)) { toast.error("1~52주 범위로 입력해주세요."); return; }
    const fd = new FormData();
    fd.set("pet_id", petId);
    fd.set("cycle_weeks", value);
    startTransition(async () => {
      const result = await updatePetCycleAction(fd);
      if (result?.error) toast.error(result.error);
      else { setCurrent(num); setEditing(false); toast.success("재방문 주기가 변경됐어요."); }
    });
  }

  // 표시할 주기와 출처 (현재 값 기준)
  const displayCycle = current ?? effectiveCycle;
  const displaySource = current != null ? "펫 설정" : cycleSource;

  if (editing) {
    return (
      <div className="flex items-center justify-between">
        <dt className="text-ink-caption">재방문 주기</dt>
        <dd className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            max={52}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-16 rounded border border-border px-2 py-0.5 text-[13px] text-ink outline-none focus:border-primary"
            placeholder="주"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          />
          <button onClick={save} disabled={isPending} className="text-[12px] font-medium text-primary hover:underline">{isPending ? "..." : "저장"}</button>
          <button onClick={() => { setEditing(false); setValue(current?.toString() ?? ""); }} className="text-[12px] text-ink-caption hover:underline">취소</button>
        </dd>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-caption">재방문 주기</dt>
      <dd className="flex items-center gap-1.5">
        <span className="text-ink">{displayCycle}주</span>
        <span className="text-[11px] text-ink-disabled">· {displaySource}</span>
        <button onClick={() => setEditing(true)} className="text-[12px] text-primary hover:underline">변경</button>
      </dd>
    </div>
  );
}
