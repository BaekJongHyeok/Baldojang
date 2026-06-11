"use client";

import { useEffect } from "react";

/* ── Dialog (centered modal) ── */

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export function Dialog({
  open,
  onClose,
  title,
  children,
  className = "",
}: DialogProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/25 transition-opacity duration-150"
        onClick={onClose}
      />
      <div
        className={`relative w-full max-w-md rounded-card bg-surface-card p-6 shadow-float ${className}`}
      >
        {title && (
          <h2 className="mb-4 text-[18px] font-semibold text-ink">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}

/* ── BottomSheet (mobile-first, dialog on desktop) ── */

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: BottomSheetProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center lg:p-4">
      <div className="absolute inset-0 bg-ink/25" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-[20px] bg-surface-card shadow-float lg:rounded-card">
        {/* drag handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 lg:hidden">
          <div className="h-1 w-8 rounded-full bg-warm-300" />
        </div>
        {title && (
          <h2 className="px-5 pt-3 pb-2 text-[18px] font-semibold text-ink">
            {title}
          </h2>
        )}
        <div className="px-5 pb-8 lg:pb-6">{children}</div>
      </div>
    </div>
  );
}
