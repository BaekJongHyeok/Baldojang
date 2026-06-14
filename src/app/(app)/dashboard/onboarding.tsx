"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const DISMISSED_KEY = "baldojang_onboarding_dismissed";

export function OnboardingChecklist({
  shopName,
  needsHours,
  needsService,
}: {
  shopName: string;
  needsHours: boolean;
  needsService: boolean;
}) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "true");
  }, []);

  const doneCount = (needsHours ? 0 : 1) + (needsService ? 0 : 1);
  const totalSteps = 2;
  const allDone = doneCount === totalSteps;

  // 모든 필수 항목 완료 → 자동 숨김
  if (allDone) return null;
  if (dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  }

  return (
    <div className="relative mb-6 overflow-hidden rounded-xl bg-gradient-to-br from-[#3182F6] to-[#1B64DA] p-[1px] shadow-modal">
      <div className="rounded-[11px] bg-gradient-to-br from-white via-white to-primary-light">
        {/* 배경 장식 */}
        <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-primary/5" />
        <div className="pointer-events-none absolute -right-2 bottom-4 h-20 w-20 rounded-full bg-primary/[0.03]" />

        {/* 헤더 */}
        <div className="relative px-5 pt-5 pb-4 sm:px-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[20px] font-bold text-ink">
                환영해요! <span className="inline-block">🐾</span>
              </p>
              <p className="mt-1 text-[14px] text-ink-secondary">
                <span className="font-semibold text-primary">{shopName}</span>님, 예약을 받기 위한 설정을 시작해볼까요?
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="닫기"
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-disabled transition-colors hover:bg-border-light hover:text-ink-caption"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* 프로그레스 바 */}
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-border-light">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${(doneCount / totalSteps) * 100}%` }}
              />
            </div>
            <span className="shrink-0 text-[12px] font-semibold tabular-nums text-primary">
              {doneCount}/{totalSteps}
            </span>
          </div>
        </div>

        {/* 체크리스트 */}
        <div className="px-5 pb-2 sm:px-6">
          <div className="flex flex-col gap-2.5">
            <ChecklistItem
              step={1}
              done={!needsHours}
              icon={<ClockIcon />}
              title="영업시간 설정"
              desc="캘린더에 영업시간이 표시돼요"
              href="/settings/shop"
              linkLabel="설정하러 가기"
            />
            <ChecklistItem
              step={2}
              done={!needsService}
              icon={<ScissorsIcon />}
              title="시술·가격 등록"
              desc="예약을 잡으려면 시술이 1개 이상 필요해요"
              href="/settings/services"
              linkLabel="등록하러 가기"
            />
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end px-5 py-3 sm:px-6">
          <button type="button" onClick={dismiss} className="text-[11px] text-ink-disabled transition-colors hover:text-ink-caption">
            나중에 할게요
          </button>
        </div>
      </div>
    </div>
  );
}

function ChecklistItem({
  step,
  done,
  icon,
  title,
  desc,
  href,
  linkLabel,
}: {
  step: number;
  done: boolean;
  icon: React.ReactNode;
  title: string;
  desc: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className={`group flex items-center gap-3.5 rounded-lg border p-3.5 transition-all ${
      done
        ? "border-success/20 bg-success-light/50"
        : "border-border bg-white shadow-sm hover:border-primary/30 hover:shadow-md"
    }`}>
      {/* 스텝 뱃지 */}
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
        done
          ? "bg-success text-white"
          : "bg-primary-light text-primary"
      }`}>
        {done ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
        ) : (
          icon
        )}
      </div>

      {/* 텍스트 */}
      <div className="min-w-0 flex-1">
        <p className={`text-[14px] font-semibold ${done ? "text-success" : "text-ink"}`}>
          {done ? `${title}` : `${title}`}
        </p>
        <p className={`mt-0.5 text-[12px] ${done ? "text-success/70" : "text-ink-caption"}`}>{desc}</p>
      </div>

      {/* 액션 */}
      {done ? (
        <span className="shrink-0 text-[12px] font-medium text-success">완료</span>
      ) : (
        <Link
          href={href}
          className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-[12px] font-semibold text-white shadow-sm transition-all hover:bg-primary-hover hover:shadow-md active:scale-[0.97]"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

/* ── Icons ── */
function ClockIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function ScissorsIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l1.536.887M7.848 8.25a3 3 0 11-5.196-3 3 3 0 015.196 3zm1.536.887a2.165 2.165 0 011.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 01-5.196 3 3 3 0 015.196-3zm1.536-.887a2.165 2.165 0 001.083-1.838c.005-.352.054-.695.14-1.025m-1.223 2.863l2.077-1.199m0-3.328a4.323 4.323 0 012.068-1.379l5.325-1.628a4.5 4.5 0 012.48-.044l.803.215-7.794 4.5m-2.882-1.664A4.331 4.331 0 0010.607 12m3.736 0l7.794 4.5-.802.215a4.5 4.5 0 01-2.48-.043l-5.326-1.629a4.324 4.324 0 01-2.068-1.379M14.343 12l-2.882 1.664" /></svg>;
}
