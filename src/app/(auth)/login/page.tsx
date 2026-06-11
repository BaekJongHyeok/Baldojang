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
    <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-stone-900">발도장</h1>
        <p className="mb-8 text-sm text-stone-500">로그인하고 시작하세요</p>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700">이메일</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
              placeholder="example@email.com"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700">비밀번호</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm outline-none transition focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-stone-900 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:opacity-50"
          >
            {isPending && <Spinner />}
            로그인
          </button>

          {error && (
            <p className="text-center text-sm text-red-500">{error}</p>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-stone-500">
          아직 계정이 없으신가요?{" "}
          <Link href="/signup" className="font-medium text-stone-900 hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
