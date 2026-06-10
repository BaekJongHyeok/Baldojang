"use client";

import Link from "next/link";
import { formatPhone } from "@/lib/utils";
import { formatTimestampKST } from "@/lib/calendar-utils";
import type { CalendarReservation } from "@/lib/calendar-data";

function statusLabel(status: string) {
  switch (status) {
    case "confirmed": return "확정";
    case "completed": return "완료";
    case "no_show": return "노쇼";
    case "cancelled": return "취소";
    default: return status;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "confirmed": return "bg-blue-100 text-blue-700";
    case "completed": return "bg-stone-100 text-stone-600";
    case "no_show": return "bg-red-100 text-red-700";
    case "cancelled": return "bg-stone-100 text-stone-400";
    default: return "bg-stone-100 text-stone-600";
  }
}

export function ReservationDetail({
  reservation: r,
  onClose,
}: {
  reservation: CalendarReservation;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-4 lg:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-lg lg:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 핸들 (모바일) */}
        <div className="mb-3 flex justify-center lg:hidden">
          <div className="h-1 w-8 rounded-full bg-stone-200" />
        </div>

        {/* 헤더 */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              href={`/pets/${r.pet.id}`}
              className="text-lg font-bold text-stone-900 hover:underline"
            >
              {r.pet.name}
            </Link>
            <p className="text-sm text-stone-500">{r.service.name}</p>
          </div>
          <span className={`rounded-lg px-2 py-1 text-xs font-medium ${statusBadge(r.status)}`}>
            {statusLabel(r.status)}
          </span>
        </div>

        {/* 시간 */}
        <div className="mt-4 flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-500">날짜</span>
            <span className="text-stone-900">
              {formatTimestampKST(r.starts_at, "M월 d일 (EEEE)")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">시간</span>
            <span className="text-stone-900">
              {formatTimestampKST(r.starts_at, "HH:mm")} – {formatTimestampKST(r.ends_at, "HH:mm")}
            </span>
          </div>
          {r.customer && (
            <div className="flex justify-between">
              <span className="text-stone-500">보호자</span>
              <a
                href={`tel:${r.customer.phone}`}
                className="text-stone-900 hover:underline"
              >
                {r.customer.name} · {formatPhone(r.customer.phone)}
              </a>
            </div>
          )}
          {r.memo && (
            <div className="flex justify-between">
              <span className="text-stone-500">메모</span>
              <span className="text-stone-900">{r.memo}</span>
            </div>
          )}
        </div>

        {/* 액션 */}
        <div className="mt-5 flex gap-2">
          <Link
            href={`/pets/${r.pet.id}`}
            className="flex-1 rounded-xl border border-stone-200 py-2.5 text-center text-sm font-medium text-stone-700 transition hover:bg-stone-50"
          >
            펫 차트
          </Link>
          <button
            disabled
            className="flex-1 rounded-xl bg-stone-200 py-2.5 text-sm font-medium text-stone-400 cursor-not-allowed"
          >
            수정 (준비 중)
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-2 w-full rounded-xl py-2 text-sm text-stone-500 hover:bg-stone-50"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
