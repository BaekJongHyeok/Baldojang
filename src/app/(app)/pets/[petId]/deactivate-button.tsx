"use client";

import { useTransition, useState } from "react";
import { deactivatePetAction } from "@/lib/pet-actions";

export function DeactivateButton({ petId }: { petId: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  function handleDeactivate() {
    const fd = new FormData();
    fd.set("pet_id", petId);
    startTransition(async () => {
      await deactivatePetAction(fd);
    });
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="flex-1 rounded-md border border-danger/30 py-2 text-center text-[14px] font-medium text-danger hover:bg-danger-light"
      >
        비활성화
      </button>
    );
  }

  return (
    <div className="flex flex-1 gap-1.5">
      <button onClick={() => setConfirm(false)} className="flex-1 rounded-md border border-border py-2 text-[13px] font-medium text-ink-secondary">취소</button>
      <button onClick={handleDeactivate} disabled={isPending} className="flex-1 rounded-md bg-danger py-2 text-[13px] font-medium text-white disabled:opacity-40">
        {isPending ? "처리 중..." : "확인"}
      </button>
    </div>
  );
}
