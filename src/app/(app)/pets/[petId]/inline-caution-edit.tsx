"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

const DEFAULT_TAGS = ["입질", "분리불안", "심장질환", "슬개골", "피부질환", "노령견", "임신/수유"];

async function updateCautionAction(petId: string, tags: string[], memo: string) {
  const { updatePetCautionAction } = await import("@/lib/pet-actions");
  const fd = new FormData();
  fd.set("pet_id", petId);
  fd.set("caution_tags", tags.join(","));
  fd.set("caution_memo", memo);
  return updatePetCautionAction(fd);
}

export function InlineCautionEdit({
  petId,
  cautionTags: initTags,
  cautionMemo: initMemo,
}: {
  petId: string;
  cautionTags: string[];
  cautionMemo: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [tags, setTags] = useState(initTags);
  const [memo, setMemo] = useState(initMemo ?? "");
  const [customTag, setCustomTag] = useState("");
  const [isPending, startTransition] = useTransition();

  const [displayTags, setDisplayTags] = useState(initTags);
  const [displayMemo, setDisplayMemo] = useState(initMemo);

  function toggleTag(tag: string) {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  function addCustomTag() {
    const t = customTag.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setCustomTag("");
  }

  function cancel() {
    setTags(displayTags);
    setMemo(displayMemo ?? "");
    setEditing(false);
  }

  function save() {
    startTransition(async () => {
      const result = await updateCautionAction(petId, tags, memo);
      if (result?.error) { toast.error(result.error); return; }
      setDisplayTags(tags);
      setDisplayMemo(memo.trim() || null);
      setEditing(false);
      toast.success("주의사항이 수정됐어요.");
    });
  }

  const hasCaution = displayTags.length > 0 || displayMemo;

  if (editing) {
    return (
      <div className="rounded-lg border border-danger/20 bg-danger-light p-4">
        <p className="text-[13px] font-semibold text-danger">주의사항 수정</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {DEFAULT_TAGS.map((tag) => (
            <button key={tag} type="button" onClick={() => toggleTag(tag)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${tags.includes(tag) ? "bg-white/80 text-danger ring-1 ring-danger/30" : "bg-white/50 text-danger/60"}`}>
              {tag}
            </button>
          ))}
          {tags.filter((t) => !DEFAULT_TAGS.includes(t)).map((tag) => (
            <button key={tag} type="button" onClick={() => toggleTag(tag)}
              className="rounded-lg bg-white/80 px-2.5 py-1 text-xs font-medium text-danger ring-1 ring-danger/30">
              {tag} ✕
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-1.5">
          <input type="text" value={customTag} onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
            className="min-w-0 flex-1 rounded-md border border-danger/20 bg-white px-3 py-1.5 text-xs text-ink outline-none focus:border-danger/40"
            placeholder="직접 입력" />
          <button type="button" onClick={addCustomTag} className="shrink-0 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-danger/80">추가</button>
        </div>
        <textarea rows={2} value={memo} onChange={(e) => setMemo(e.target.value)}
          className="mt-2 w-full rounded-md border border-danger/20 bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-danger/40"
          placeholder="주의사항 메모 (선택)" />
        <div className="mt-2 flex gap-2">
          <button onClick={cancel} className="flex-1 rounded-md bg-white py-1.5 text-[12px] font-medium text-ink-secondary">취소</button>
          <button onClick={save} disabled={isPending} className="flex-1 rounded-md bg-danger py-1.5 text-[12px] font-medium text-white disabled:opacity-50">
            {isPending ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    );
  }

  if (hasCaution) {
    return (
      <div className="rounded-lg border border-danger/20 bg-danger-light p-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-danger">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            주의사항
          </p>
          <button onClick={() => setEditing(true)} className="text-[12px] font-medium text-danger/70 hover:underline">수정</button>
        </div>
        {displayTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {displayTags.map((tag) => (
              <span key={tag} className="rounded-sm bg-white/70 px-2 py-0.5 text-[12px] font-medium text-danger">{tag}</span>
            ))}
          </div>
        )}
        {displayMemo && (
          <div className="mt-2 border-t border-danger/10 pt-2">
            <p className="text-[11px] font-medium text-danger/60">메모</p>
            <p className="mt-0.5 text-[13px] text-danger/80">{displayMemo}</p>
          </div>
        )}
      </div>
    );
  }

  // 주의사항 없음
  return (
    <button
      onClick={() => setEditing(true)}
      className="flex w-full items-center justify-between rounded-lg border border-border bg-white px-4 py-3 text-left transition-colors hover:bg-bg"
    >
      <span className="text-[13px] text-ink-caption">주의사항 없음</span>
      <span className="text-[12px] font-medium text-primary">+ 추가</span>
    </button>
  );
}
