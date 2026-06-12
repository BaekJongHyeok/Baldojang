"use client";

import { useState } from "react";
import { QuickPetForm } from "./quick-form";

export function NewPetClient({ fullForm }: { fullForm: React.ReactNode }) {
  const [mode, setMode] = useState<"quick" | "full">("quick");

  return (
    <div>
      <h1 className="text-[20px] font-bold text-ink">펫 등록</h1>
      <div className="mt-6">
        {mode === "quick" ? (
          <div className="mx-auto max-w-md">
            <QuickPetForm />
            <button
              onClick={() => setMode("full")}
              className="mt-3 w-full py-2 text-center text-[13px] text-ink-caption transition-colors hover:text-primary"
            >
              사진, 주의사항, 생일까지 한 번에 입력하려면 <span className="font-medium text-primary">상세 등록 &rarr;</span>
            </button>
          </div>
        ) : (
          <div>
            <button
              onClick={() => setMode("quick")}
              className="mb-4 text-[13px] text-ink-caption hover:text-primary"
            >
              &larr; 빠른 등록
            </button>
            {fullForm}
          </div>
        )}
      </div>
    </div>
  );
}
