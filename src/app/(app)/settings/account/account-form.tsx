"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateStaffNameAction } from "@/lib/settings-actions";
import { updatePasswordAction } from "@/lib/auth-actions";

export function AccountForm({ email, staffName }: { email: string; staffName: string }) {
  const [name, setName] = useState(staffName);
  const [namePending, startNameTransition] = useTransition();

  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwPending, startPwTransition] = useTransition();

  function handleNameSubmit() {
    if (!name.trim()) { toast.error("이름을 입력해주세요."); return; }
    if (name.trim() === staffName) return;
    const fd = new FormData();
    fd.set("name", name.trim());
    startNameTransition(async () => {
      const result = await updateStaffNameAction(fd);
      if (result?.error) toast.error(result.error);
      else toast.success("이름이 변경됐어요.");
    });
  }

  function handlePasswordSubmit() {
    if (pw.length < 6) { toast.error("비밀번호는 6자 이상이어야 해요."); return; }
    if (pw !== pwConfirm) { toast.error("비밀번호가 일치하지 않습니다."); return; }
    const fd = new FormData();
    fd.set("password", pw);
    fd.set("confirm_password", pwConfirm);
    startPwTransition(async () => {
      const result = await updatePasswordAction(fd);
      if (result?.error) toast.error(result.error);
      else { toast.success("비밀번호가 변경됐어요."); setPw(""); setPwConfirm(""); }
    });
  }

  return (
    <div className="mt-6 space-y-6">
      {/* ── 이메일 ── */}
      <div className="rounded-lg border border-border bg-white p-5">
        <label className="block text-[12px] font-medium text-ink-caption">로그인 이메일</label>
        <p className="mt-1 text-[14px] text-ink">{email}</p>
      </div>

      {/* ── 원장 이름 ── */}
      <div className="rounded-lg border border-border bg-white p-5">
        <label htmlFor="staff-name" className="block text-[12px] font-medium text-ink-caption">원장 이름</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="staff-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-border px-3 py-2 text-[14px] text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleNameSubmit}
            disabled={namePending || name.trim() === staffName}
            className="shrink-0 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-40"
          >
            {namePending ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      {/* ── 비밀번호 변경 ── */}
      <div className="rounded-lg border border-border bg-white p-5">
        <h2 className="text-[14px] font-semibold text-ink">비밀번호 변경</h2>
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="new-pw" className="block text-[12px] font-medium text-ink-caption">새 비밀번호</label>
            <input
              id="new-pw"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="6자 이상"
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-[14px] text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="confirm-pw" className="block text-[12px] font-medium text-ink-caption">비밀번호 확인</label>
            <input
              id="confirm-pw"
              type="password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-[14px] text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={handlePasswordSubmit}
            disabled={pwPending || pw.length < 6}
            className="rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-40"
          >
            {pwPending ? "변경 중..." : "비밀번호 변경"}
          </button>
        </div>
      </div>
    </div>
  );
}
