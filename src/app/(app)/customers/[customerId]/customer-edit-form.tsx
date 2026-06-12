"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { formatPhone } from "@/lib/utils";
import { updateCustomerAction } from "@/lib/customer-actions";
import { EntityHeader, InfoRow, PencilIcon, EDIT_ICON_CLASS } from "@/components/entity-header";

export function CustomerEditForm({
  customerId,
  name: initName,
  phone: initPhone,
  memo: initMemo,
  source,
  createdAt,
}: {
  customerId: string;
  name: string;
  phone: string;
  memo: string | null;
  source: string | null;
  createdAt: string;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initName);
  const [phone, setPhone] = useState(formatPhone(initPhone));
  const [memo, setMemo] = useState(initMemo ?? "");
  const [isPending, startTransition] = useTransition();

  // Displayed (committed) values
  const [displayName, setDisplayName] = useState(initName);
  const [displayPhone, setDisplayPhone] = useState(initPhone);
  const [displayMemo, setDisplayMemo] = useState(initMemo);

  function cancel() {
    setName(displayName);
    setPhone(formatPhone(displayPhone));
    setMemo(displayMemo ?? "");
    setEditing(false);
  }

  function save() {
    const fd = new FormData();
    fd.set("customer_id", customerId);
    fd.set("name", name);
    fd.set("phone", phone);
    fd.set("memo", memo);
    startTransition(async () => {
      const result = await updateCustomerAction(fd);
      if (result?.error) { toast.error(result.error); return; }
      toast.success("보호자 정보가 수정되었습니다.");
      const cleanPhone = phone.replace(/[^0-9]/g, "");
      setDisplayName(name.trim());
      setDisplayPhone(cleanPhone);
      setDisplayMemo(memo.trim() || null);
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <div className="rounded-lg border border-border bg-white p-5">
        <p className="text-[13px] font-semibold text-ink-caption">보호자 정보 수정</p>
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-ink-caption">이름</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-border px-3 py-2 text-[14px] text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-ink-caption">전화번호</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              className="rounded-md border border-border px-3 py-2 text-[14px] text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-ink-caption">메모</span>
            <textarea
              rows={2}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="rounded-md border border-border px-3 py-2 text-[14px] text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              placeholder="메모 (선택)"
            />
          </label>
          <div className="flex gap-2">
            <button onClick={cancel} className="flex-1 rounded-md border border-border py-2 text-[13px] font-medium text-ink-secondary hover:bg-bg">취소</button>
            <button onClick={save} disabled={isPending} className="flex-1 rounded-md bg-primary py-2 text-[13px] font-medium text-white hover:bg-primary-hover disabled:opacity-50">
              {isPending ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <EntityHeader
      avatar={displayName.charAt(0)}
      name={displayName}
      editAction={
        <button onClick={() => setEditing(true)} aria-label="보호자 정보 수정" className={EDIT_ICON_CLASS}>
          <PencilIcon />
        </button>
      }
      rows={
        <>
          <InfoRow label="전화번호"><span className="tabular-nums">{formatPhone(displayPhone)}</span></InfoRow>
          {source && <InfoRow label="유입 경로">{source}</InfoRow>}
          {displayMemo && <InfoRow label="메모">{displayMemo}</InfoRow>}
          <InfoRow label="등록일">{new Date(createdAt).toLocaleDateString("ko-KR")}</InfoRow>
        </>
      }
    />
  );
}
