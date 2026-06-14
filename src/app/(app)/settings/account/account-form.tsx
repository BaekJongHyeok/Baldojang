"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateStaffNameAction } from "@/lib/settings-actions";
import { updatePasswordAction, deleteAccountAction } from "@/lib/auth-actions";

export function AccountForm({ email, staffName, shopName }: { email: string; staffName: string; shopName: string }) {
  const [name, setName] = useState(staffName);
  const [namePending, startNameTransition] = useTransition();

  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwPending, startPwTransition] = useTransition();

  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

      {/* ── 회원 탈퇴 ── */}
      <div className="rounded-lg border border-danger/30 bg-white p-5">
        <h2 className="text-[14px] font-semibold text-danger">회원 탈퇴</h2>
        <p className="mt-1 text-[12px] text-ink-caption">
          탈퇴 시 모든 데이터가 영구 삭제되며 복구할 수 없습니다.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="mt-3 rounded-md border border-danger px-4 py-2 text-[13px] font-medium text-danger transition-colors hover:bg-danger hover:text-white"
        >
          회원 탈퇴
        </button>
      </div>

      {showDeleteModal && (
        <DeleteAccountModal shopName={shopName} onClose={() => setShowDeleteModal(false)} />
      )}
    </div>
  );
}

function DeleteAccountModal({ shopName, onClose }: { shopName: string; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canSubmit = password.length >= 6 && confirmName.trim() === shopName.trim();

  function handleDelete() {
    if (!canSubmit) return;
    setError(null);
    const fd = new FormData();
    fd.set("password", password);
    fd.set("confirm_shop_name", confirmName.trim());
    startTransition(async () => {
      const result = await deleteAccountAction(fd);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4" onClick={onClose}>
      <div className={`w-full max-w-md rounded-lg bg-white shadow-modal ${isPending ? "pointer-events-none" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-danger-light">
            <svg className="h-5 w-5 text-danger" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
          </div>
          <h2 className="mt-3 text-[18px] font-bold text-ink">정말 탈퇴하시겠어요?</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">
            탈퇴 시 <span className="font-semibold text-danger">{shopName}</span>의 모든 데이터(고객, 반려견, 예약, 매출 기록)가 <span className="font-semibold text-danger">영구 삭제</span>되며 복구할 수 없습니다.
          </p>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* 비밀번호 재확인 */}
          <div>
            <label htmlFor="delete-pw" className="block text-[12px] font-medium text-ink-caption">비밀번호 확인</label>
            <input
              id="delete-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="현재 비밀번호를 입력해주세요"
              className="mt-1 w-full rounded-md border border-border px-3 py-2.5 text-[14px] text-ink outline-none focus:border-danger focus:ring-1 focus:ring-danger"
            />
          </div>

          {/* 샵 이름 타이핑 확인 */}
          <div>
            <label htmlFor="delete-confirm" className="block text-[12px] font-medium text-ink-caption">
              확인을 위해 <span className="font-semibold text-ink">{shopName}</span>을 입력해주세요
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={shopName}
              className="mt-1 w-full rounded-md border border-border px-3 py-2.5 text-[14px] text-ink outline-none focus:border-danger focus:ring-1 focus:ring-danger"
            />
          </div>

          {error && (
            <p className="text-center text-[13px] text-danger">{error}</p>
          )}
        </div>

        <div className="flex gap-2 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-border py-2.5 text-[13px] font-medium text-ink-secondary transition-colors hover:bg-bg"
          >
            돌아가기
          </button>
          <button
            onClick={handleDelete}
            disabled={!canSubmit || isPending}
            className="flex-1 rounded-md bg-danger py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-danger/90 disabled:opacity-40"
          >
            {isPending ? "삭제 중..." : "영구 삭제"}
          </button>
        </div>
      </div>
    </div>
  );
}
