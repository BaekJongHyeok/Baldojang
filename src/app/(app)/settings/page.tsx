import Link from "next/link";
import { signOutAction } from "@/lib/auth-actions";
import pkg from "../../../../package.json";

/** 이메일 주소를 채워주세요 */
const SUPPORT_EMAIL = "contact.baldojang@gmail.com";

export default function SettingsPage() {
  return (
    <div className="pb-8">
      <h1 className="text-[20px] font-bold text-ink">설정</h1>

      {/* ── 샵 운영 ── */}
      <Section title="샵 운영" className="mt-6">
        <SettingsLink href="/settings/shop" icon={<ShopIcon />} label="샵 정보" desc="상호, 전화번호, 주소, 영업시간" />
        <SettingsLink href="/settings/services" icon={<ScissorsIcon />} label="시술 메뉴" desc="시술 항목, 가격, 소요시간, 재방문 주기" />
        <SettingsRow icon={<BellIcon />} label="알림톡 설정" desc="준비 중" disabled />
      </Section>

      {/* ── 계정 ── */}
      <Section title="계정">
        <SettingsLink href="/settings/account" icon={<UserIcon />} label="계정 정보" desc="이메일, 원장 이름, 비밀번호 변경" />
        <form action={signOutAction}>
          <button type="submit" className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-bg">
            <span className="flex h-5 w-5 items-center justify-center text-ink-caption"><LogoutIcon /></span>
            <span className="text-[14px] font-medium text-danger">로그아웃</span>
          </button>
        </form>
      </Section>

      {/* ── 구독 ── */}
      <Section title="구독">
        <div className="px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center text-ink-caption"><PlanIcon /></span>
            <span className="text-[14px] font-semibold text-ink">무료 베타 이용 중</span>
          </div>
          <p className="mt-1 pl-8 text-[12px] text-ink-caption">정식 출시 후 요금제가 안내될 예정입니다.</p>
        </div>
      </Section>

      {/* ── 지원 ── */}
      <Section title="지원">
        {SUPPORT_EMAIL ? (
          <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-bg">
            <div className="flex items-center gap-3">
              <span className="flex h-5 w-5 items-center justify-center text-ink-caption"><MailIcon /></span>
              <span className="text-[14px] font-medium text-ink">문의하기</span>
            </div>
            <ChevronRight />
          </a>
        ) : (
          <SettingsRow icon={<MailIcon />} label="문의하기" desc="준비 중" disabled />
        )}
        <SettingsLink href="/terms" icon={<DocIcon />} label="이용약관" />
        <SettingsLink href="/privacy" icon={<ShieldIcon />} label="개인정보처리방침" />
      </Section>

      {/* ── 앱 정보 ── */}
      <div className="mt-8 text-center">
        <p className="text-[13px] font-semibold text-ink-caption">발도장</p>
        <p className="mt-0.5 text-[12px] text-ink-disabled">반려동물 미용실 관리 서비스</p>
        <p className="mt-0.5 text-[11px] text-ink-disabled tabular-nums">v{pkg.version}</p>
      </div>
    </div>
  );
}

/* ── Layout helpers ── */

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className ?? "mt-6"}>
      <h2 className="mb-1.5 px-1 text-[12px] font-semibold uppercase text-ink-caption">{title}</h2>
      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-white">
        {children}
      </div>
    </div>
  );
}

function SettingsLink({ href, icon, label, desc }: { href: string; icon: React.ReactNode; label: string; desc?: string }) {
  return (
    <Link href={href} className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-bg">
      <div className="flex items-center gap-3">
        <span className="flex h-5 w-5 items-center justify-center text-ink-caption">{icon}</span>
        <div>
          <p className="text-[14px] font-medium text-ink">{label}</p>
          {desc && <p className="text-[12px] text-ink-caption">{desc}</p>}
        </div>
      </div>
      <ChevronRight />
    </Link>
  );
}

function SettingsRow({ icon, label, desc, disabled }: { icon: React.ReactNode; label: string; desc?: string; disabled?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3.5 ${disabled ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-5 w-5 items-center justify-center text-ink-caption">{icon}</span>
        <div>
          <p className="text-[14px] font-medium text-ink-disabled">{label}</p>
          {desc && <p className="text-[12px] text-ink-disabled">{desc}</p>}
        </div>
      </div>
    </div>
  );
}

/* ── Icons ── */

function ChevronRight() {
  return <svg className="h-4 w-4 text-ink-disabled" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;
}
function ShopIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72l1.189-1.19A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72M6.75 18h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .414.336.75.75.75z" /></svg>;
}
function ScissorsIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l1.536.887M7.848 8.25a3 3 0 11-5.196-3 3 3 0 015.196 3zm1.536.887a2.165 2.165 0 011.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 01-5.196 3 3 3 0 015.196-3zm1.536-.887a2.165 2.165 0 001.083-1.838c.005-.352.054-.695.14-1.025m-1.223 2.863l2.077-1.199m0-3.328a4.323 4.323 0 012.068-1.379l5.325-1.628a4.5 4.5 0 012.48-.044l.803.215-7.794 4.5m-2.882-1.664A4.331 4.331 0 0010.607 12m3.736 0l7.794 4.5-.802.215a4.5 4.5 0 01-2.48-.043l-5.326-1.629a4.324 4.324 0 01-2.068-1.379M14.343 12l-2.882 1.664" /></svg>;
}

function BellIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>;
}
function UserIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>;
}
function LogoutIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>;
}
function PlanIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>;
}
function MailIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>;
}
function DocIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
}
function ShieldIcon() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>;
}
