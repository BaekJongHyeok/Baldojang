"use client";

import { useState } from "react";

const SIZE_MAP = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-8 w-8 text-[12px]",
  lg: "h-10 w-10 text-[14px]",
  xl: "h-12 w-12 text-[18px]",
};

/**
 * 펫 아바타 — 사진 있으면 원형 이미지 (로드 실패 시 이름 폴백), 없으면 이름 첫 글자.
 * photoUrl은 반드시 접근 가능한 URL(signed URL 등)이어야 함 — 스토리지 경로 금지.
 */
export function PetAvatar({ name, photoUrl, size = "md" }: { name: string; photoUrl?: string | null; size?: "sm" | "md" | "lg" | "xl" }) {
  const [errored, setErrored] = useState(false);
  const sizeClass = SIZE_MAP[size];
  // 스토리지 경로(http로 시작하지 않는)는 이미지로 사용 불가 → 폴백
  const isValidUrl = photoUrl && (photoUrl.startsWith("http://") || photoUrl.startsWith("https://") || photoUrl.startsWith("data:"));
  const showImage = isValidUrl && !errored;

  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full bg-border-light font-bold text-ink-caption overflow-hidden ${sizeClass}`}>
      {showImage ? (
        <img src={photoUrl!} alt="" className="h-full w-full object-cover" onError={() => setErrored(true)} />
      ) : (
        name.charAt(0)
      )}
    </div>
  );
}
