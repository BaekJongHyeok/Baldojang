"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const DISMISSED_KEY = "baldojang_onboarding_dismissed";

export function OnboardingChecklist({
  needsHours,
  needsService,
}: {
  needsHours: boolean;
  needsService: boolean;
}) {
  const [dismissed, setDismissed] = useState(true); // 기본 숨김 → mount 후 확인

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "true");
  }, []);

  // 모든 필수 항목 완료 → 자동 숨김
  if (!needsHours && !needsService) return null;
  if (dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  }

  const allDone = !needsHours && !needsService;

  return (
    <div className="mb-5 rounded-lg border border-primary/20 bg-white shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-[16px] font-bold text-ink">시작 가이드</h2>
          <p className="mt-0.5 text-[12px] text-ink-caption">예약을 받으려면 아래 설정을 완료해주세요</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="닫기"
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-caption transition-colors hover:bg-border-light hover:text-ink"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* 체크리스트 */}
      <div className="divide-y divide-border">
        <ChecklistItem
          done={!needsHours}
          title="영업시간을 설정해주세요"
          desc="캘린더에 영업시간이 표시돼요"
          href="/settings/shop"
          linkLabel="설정하러 가기"
        />
        <ChecklistItem
          done={!needsService}
          title="시술과 가격을 등록해주세요"
          desc="예약을 잡으려면 시술이 1개 이상 필요해요"
          href="/settings/services"
          linkLabel="등록하러 가기"
        />
        {allDone && (
          <ChecklistItem
            done={false}
            title="첫 예약을 잡아보세요"
            desc="캘린더에서 바로 예약을 등록할 수 있어요"
            href="/calendar?new=1"
            linkLabel="예약 화면으로"
            optional
          />
        )}
      </div>

      {/* 푸터 */}
      <div className="px-5 py-3 text-center">
        <button type="button" onClick={dismiss} className="text-[12px] text-ink-caption hover:text-ink transition-colors">
          나중에 할게요
        </button>
      </div>
    </div>
  );
}

function ChecklistItem({
  done,
  title,
  desc,
  href,
  linkLabel,
  optional,
}: {
  done: boolean;
  title: string;
  desc: string;
  href: string;
  linkLabel: string;
  optional?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      {/* 체크 아이콘 */}
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${done ? "bg-success-light" : "border-2 border-border"}`}>
        {done && (
          <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
        )}
      </div>

      {/* 텍스트 */}
      <div className="min-w-0 flex-1">
        <p className={`text-[14px] font-medium ${done ? "text-ink-caption line-through" : "text-ink"}`}>
          {title}
          {optional && <span className="ml-1.5 text-[11px] font-normal text-ink-disabled">(선택)</span>}
        </p>
        <p className="mt-0.5 text-[12px] text-ink-caption">{desc}</p>
      </div>

      {/* 바로가기 */}
      {!done && (
        <Link
          href={href}
          className="shrink-0 rounded-md border border-primary px-3 py-1.5 text-[12px] font-medium text-primary transition-colors hover:bg-primary hover:text-white"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
