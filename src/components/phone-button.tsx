"use client";

import { toast } from "sonner";

/**
 * 전화 버튼: 터치 디바이스 → tel: 링크, 데스크톱 → 번호 복사 + 토스트.
 * pointer: coarse 미디어쿼리로 분기 (matchMedia).
 */
export function PhoneButton({
  phone,
  children,
  className,
}: {
  phone: string;
  children: React.ReactNode;
  className?: string;
}) {
  function handleClick(e: React.MouseEvent) {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (isTouch) return; // tel: 링크 기본 동작
    e.preventDefault();
    navigator.clipboard.writeText(phone).then(() => {
      toast.success("전화번호가 복사됐어요");
    });
  }

  return (
    <a href={`tel:${phone}`} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
