"use client";

import { useState } from "react";
import { QuickPetForm } from "./quick-form";

export function NewPetClient({ fullForm }: { fullForm: React.ReactNode }) {
  const [mode, setMode] = useState<"quick" | "full">("quick");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-bold text-ink">펫 등록</h1>
        <button
          onClick={() => setMode(mode === "quick" ? "full" : "quick")}
          className="text-[13px] font-medium text-primary hover:underline"
        >
          {mode === "quick" ? "상세 등록" : "빠른 등록"}
        </button>
      </div>
      <div className="mt-6">
        {mode === "quick" ? <QuickPetForm /> : fullForm}
      </div>
    </div>
  );
}
