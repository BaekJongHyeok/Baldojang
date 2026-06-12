"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { formatPhone } from "@/lib/utils";
import { updateCustomerAction } from "@/lib/customer-actions";

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
    <div className="rounded-lg border border-border bg-white p-5">
      <div className="flex items-start justify-between">
        <h1 className="text-[20px] font-bold text-ink">{displayName}</h1>
        <button
          onClick={() => setEditing(true)}
          className="shrink-0 text-[12px] font-medium text-primary hover:underline"
        >
          수정
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-ink-caption">전화번호</span>
          <a href={`tel:${displayPhone}`} className="font-medium text-ink hover:underline tabular-nums">{formatPhone(displayPhone)}</a>
        </div>
        {source && (
          <div className="flex justify-between">
            <span className="text-ink-caption">유입 경로</span>
            <span className="text-ink">{source}</span>
          </div>
        )}
        {displayMemo && (
          <div className="flex justify-between">
            <span className="text-ink-caption">메모</span>
            <span className="text-ink">{displayMemo}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-ink-caption">등록일</span>
          <span className="text-ink">{new Date(createdAt).toLocaleDateString("ko-KR")}</span>
        </div>
      </div>
    </div>
  );
}
