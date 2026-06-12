/** 펫 아바타 — 사진 있으면 원형 이미지, 없으면 이름 첫 글자 */
export function PetAvatar({ name, photoUrl, size = "md" }: { name: string; photoUrl?: string | null; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "h-7 w-7 text-[11px]" : size === "md" ? "h-8 w-8 text-[12px]" : "h-10 w-10 text-[14px]";
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full bg-border-light font-bold text-ink-caption overflow-hidden ${sizeClass}`}>
      {photoUrl ? <img src={photoUrl} alt="" className="h-full w-full object-cover" /> : name.charAt(0)}
    </div>
  );
}
