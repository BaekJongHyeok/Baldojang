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
        className="flex-1 rounded-xl border border-red-200 py-2.5 text-center text-sm font-medium text-red-500 transition hover:bg-red-50"
      >
        비활성화
      </button>
    );
  }

  return (
    <div className="flex flex-1 gap-1.5">
      <button
        onClick={() => setConfirm(false)}
        className="flex-1 rounded-xl border border-stone-200 py-2.5 text-xs font-medium text-stone-500"
      >
        취소
      </button>
      <button
        onClick={handleDeactivate}
        disabled={isPending}
        className="flex-1 rounded-xl bg-red-500 py-2.5 text-xs font-medium text-white disabled:opacity-50"
      >
        {isPending ? "처리 중..." : "확인"}
      </button>
    </div>
  );
}
