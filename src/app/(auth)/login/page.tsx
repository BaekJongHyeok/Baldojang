"use client";

import { useTransition, useState } from "react";
import { Spinner } from "@/components/spinner";
import { signInAction } from "@/lib/auth-actions";
import Link from "next/link";

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await signInAction(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-white p-8">
        <div className="mb-8 flex items-center gap-2.5">
          <img src="/logo-mark.svg" alt="" width={48} height={48} />
          <div>
            <h1 className="text-[22px] font-bold leading-tight text-ink">발도장</h1>
            <p className="text-sm text-ink-caption">로그인하고 시작하세요</p>
          </div>
        </div>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-secondary">이메일</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-md border border-border px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="example@email.com"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-secondary">비밀번호</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-md border border-border px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 flex items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-medium text-white transition hover:bg-primary-hover disabled:opacity-50"
          >
            {isPending && <Spinner />}
            로그인
          </button>

          {error && (
            <p className="text-center text-sm text-danger">{error}</p>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-ink-caption">
          아직 계정이 없으신가요?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
