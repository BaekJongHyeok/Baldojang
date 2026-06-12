"use client";

import { useState, useTransition } from "react";
import { signOutAction } from "@/lib/auth-actions";
import { Dialog } from "@/components/ui/dialog";

export function LogoutButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await signOutAction();
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} className="max-w-sm">
        <p className="text-[14px] font-medium text-ink">로그아웃할까요?</p>
        <div className="mt-4 flex gap-2">
          <button onClick={() => setOpen(false)} className="flex-1 rounded-md border border-border py-2 text-[13px] font-medium text-ink-secondary">돌아가기</button>
          <button onClick={handleLogout} disabled={isPending}
            className="flex-1 rounded-md bg-primary py-2 text-[13px] font-medium text-white disabled:opacity-50">
            {isPending ? "로그아웃 중..." : "로그아웃"}
          </button>
        </div>
      </Dialog>
    </>
  );
}
