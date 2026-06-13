"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateNotificationSettingsAction } from "@/lib/settings-actions";

export function NotificationForm({ enabled, reminderHour }: { enabled: boolean; reminderHour: number }) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [hour, setHour] = useState(reminderHour);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const fd = new FormData();
    fd.set("notification_enabled", String(isEnabled));
    fd.set("reminder_hour", String(hour));
    startTransition(async () => {
      const result = await updateNotificationSettingsAction(fd);
      if (result?.error) toast.error(result.error);
      else toast.success("알림 설정이 저장됐어요.");
    });
  }

  return (
    <div className="mt-6 space-y-6">
      {/* 발송 on/off */}
      <div className="rounded-lg border border-border bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[14px] font-medium text-ink">알림톡 발송</p>
            <p className="mt-0.5 text-[12px] text-ink-caption">예약 확인·리마인드 알림을 보호자에게 전송합니다</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isEnabled}
            onClick={() => setIsEnabled(!isEnabled)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${isEnabled ? "bg-primary" : "bg-border"}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isEnabled ? "translate-x-5" : ""}`} />
          </button>
        </div>
      </div>

      {/* 리마인드 시각 */}
      <div className="rounded-lg border border-border bg-white p-5">
        <label className="block text-[14px] font-medium text-ink">리마인드 발송 시간대</label>
        <p className="mt-0.5 text-[12px] text-ink-caption">예약 전날 이 시간대에 안내 메시지가 발송됩니다</p>
        <select
          value={hour}
          onChange={(e) => setHour(Number(e.target.value))}
          className="mt-3 rounded-md border border-border px-3 py-2 text-[14px] outline-none focus:border-primary"
        >
          {Array.from({ length: 15 }, (_, i) => i + 8).map((h) => (
            <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
          ))}
        </select>
      </div>

      {/* 테스트 모드 안내 */}
      <div className="rounded-lg border border-warning/30 bg-warning-light p-4">
        <p className="text-[13px] font-medium text-warning">테스트 모드</p>
        <p className="mt-0.5 text-[12px] text-warning/80">카카오 채널 승인 전이므로 실제 발송 없이 발송 내용만 기록됩니다.</p>
      </div>

      <button
        onClick={handleSave}
        disabled={isPending}
        className="w-full rounded-md bg-primary py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {isPending ? "저장 중..." : "저장"}
      </button>
    </div>
  );
}
