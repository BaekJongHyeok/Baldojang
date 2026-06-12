import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-[24px] font-bold text-ink">이용약관</h1>
      <p className="mt-4 text-[14px] text-ink-caption">준비 중입니다.</p>
      <Link href="/settings" className="mt-6 inline-block text-[14px] text-primary hover:underline">
        설정으로 돌아가기
      </Link>
    </div>
  );
}
