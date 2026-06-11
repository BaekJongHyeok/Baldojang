"use client";

import { useEffect } from "react";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export function Dialog({ open, onClose, title, children, className = "" }: DialogProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={`relative w-full max-w-md rounded-lg border border-border bg-white p-5 shadow-modal ${className}`}>
        {title && <h2 className="mb-4 text-[16px] font-semibold text-ink">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center lg:p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-lg border-t border-border bg-white shadow-modal lg:rounded-lg lg:border">
        <div className="flex justify-center pt-2 pb-1 lg:hidden">
          <div className="h-1 w-8 rounded-full bg-border" />
        </div>
        {title && <h2 className="px-4 pt-2 pb-1 text-[16px] font-semibold text-ink">{title}</h2>}
        <div className="px-4 pb-6 lg:pb-5">{children}</div>
      </div>
    </div>
  );
}
