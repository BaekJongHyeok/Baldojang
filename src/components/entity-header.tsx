/**
 * 공용 엔티티 헤더 카드: 아바타 + 이름 + 연필 아이콘 / 구분선 / 라벨-값 행들
 * 펫 차트, 보호자 상세에서 동일하게 사용.
 */
export function EntityHeader({
  avatar,
  name,
  subtitle,
  badge,
  editAction,
  rows,
}: {
  avatar: React.ReactNode;
  name: string;
  subtitle?: string;
  badge?: React.ReactNode;
  editAction: React.ReactNode;
  rows?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-white p-4">
      {/* 히어로 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-border-light text-[18px] font-bold text-ink-caption overflow-hidden">
            {avatar}
          </div>
          <div className="min-w-0">
            <h1 className="text-[20px] font-bold text-ink">{name}</h1>
            {subtitle && <p className="text-[13px] text-ink-caption">{subtitle}</p>}
            {badge}
          </div>
        </div>
        {editAction}
      </div>
      {/* 라벨-값 행 */}
      {rows && (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3 text-[14px]">
          {rows}
        </div>
      )}
    </div>
  );
}

/** 라벨-값 한 행 */
export function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-caption">{label}</span>
      <span className="text-ink">{children}</span>
    </div>
  );
}

/** 연필 아이콘 버튼 (Link 또는 button) */
export function PencilIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

export const EDIT_ICON_CLASS = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-caption transition-colors hover:bg-border-light hover:text-ink";
