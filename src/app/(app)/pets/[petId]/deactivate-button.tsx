"use client";

import { useTransition, useState } from "react";
import { deactivatePetAction, reactivatePetAction } from "@/lib/pet-actions";
import { toast } from "sonner";

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
        className="w-full rounded-md border border-border py-1.5 text-center text-[12px] font-medium text-ink-caption transition-colors hover:border-danger/30 hover:bg-danger-light hover:text-danger"
      >
        비활성화
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-danger/20 bg-danger-light p-4">
      <p className="text-[13px] font-semibold text-danger">이 펫을 비활성화할까요?</p>
      <p className="mt-1 text-[12px] text-danger/70">목록에서 숨겨지고 기록은 보존됩니다. 언제든 다시 활성화할 수 있어요.</p>
      <div className="mt-3 flex gap-2">
        <button onClick={() => setConfirm(false)} className="flex-1 rounded-md border border-border bg-white py-2 text-[13px] font-medium text-ink-secondary">취소</button>
        <button onClick={handleDeactivate} disabled={isPending} className="flex-1 rounded-md bg-danger py-2 text-[13px] font-medium text-white disabled:opacity-40">
          {isPending ? "처리 중..." : "비활성화"}
        </button>
      </div>
    </div>
  );
}

export function ReactivateButton({ petId }: { petId: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  function handleReactivate() {
    const fd = new FormData();
    fd.set("pet_id", petId);
    startTransition(async () => {
      const result = await reactivatePetAction(fd);
      if (result?.error) toast.error(result.error);
      else { toast.success("다시 활성화됐어요."); setConfirm(false); }
    });
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="w-full rounded-md border border-primary/30 py-1.5 text-center text-[12px] font-medium text-primary transition-colors hover:bg-primary-light"
      >
        다시 활성화
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary-light p-4">
      <p className="text-[13px] font-semibold text-primary">이 펫을 다시 활성화할까요?</p>
      <p className="mt-1 text-[12px] text-ink-caption">목록에 표시되고 예약이 가능해집니다.</p>
      <div className="mt-3 flex gap-2">
        <button onClick={() => setConfirm(false)} className="flex-1 rounded-md border border-border bg-white py-2 text-[13px] font-medium text-ink-secondary">취소</button>
        <button onClick={handleReactivate} disabled={isPending} className="flex-1 rounded-md bg-primary py-2 text-[13px] font-medium text-white disabled:opacity-40">
          {isPending ? "처리 중..." : "활성화"}
        </button>
      </div>
    </div>
  );
}
