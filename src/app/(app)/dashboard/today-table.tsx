"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatTimestampKST } from "@/lib/calendar-utils";
import { PhoneButton } from "@/components/phone-button";
import { CompleteDialog, type PassOption } from "@/app/(app)/calendar/complete-dialog";
import { completeWithVisitAction } from "@/lib/reservation-actions";


type TodayItem = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  priceQuoted: number | null;
  petName: string;
  serviceName: string;
  serviceDuration: number;
  servicePrice: Record<string, number> | null;
  petSize: string | null;
  customerPhone: string | null;
  customerId: string | null;
  visitId: string | null;
  passes: PassOption[];
};

function statusLabel(s: string) {
  switch (s) { case "confirmed": return "확정"; case "completed": return "완료"; case "no_show": return "노쇼"; case "cancelled": return "취소"; default: return s; }
}
function statusClass(s: string) {
  switch (s) {
    case "confirmed": return "bg-primary-light text-primary";
    case "completed": return "bg-success-light text-success";
    case "no_show": return "bg-danger-light text-danger";
    case "cancelled": return "bg-border-light text-ink-disabled line-through";
    default: return "bg-border-light text-ink-caption";
  }
}

export function TodayTable({ items, slotMinutes, today }: { items: TodayItem[]; slotMinutes: number; today: string }) {
  const router = useRouter();
  const [completeItem, setCompleteItem] = useState<TodayItem | null>(null);

  const handleComplete = useCallback(async (fd: FormData): Promise<{ error?: string; success?: boolean; visitId?: string }> => {
    const result = await completeWithVisitAction(fd);
    if (result?.error) return result;
    router.refresh();
    return { success: true, visitId: result.visitId };
  }, [router]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center px-4 py-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-border-light">
          <svg className="h-5 w-5 text-ink-disabled" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
        </div>
        <p className="mt-2 text-[14px] text-ink-caption">오늘 예약이 없어요</p>
        <Link href="/calendar?new=1" className="mt-3 rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-white hover:bg-primary-hover">첫 예약 등록하기</Link>
      </div>
    );
  }

  return (
    <>
      {/* 데스크톱 테이블 */}
      <div className="hidden lg:block">
        <table className="w-full text-left text-[14px]">
          <thead>
            <tr className="border-b border-border-light bg-border-light text-[12px] font-medium text-ink-caption">
              <th className="px-4 py-2">시간</th>
              <th className="px-4 py-2">펫</th>
              <th className="px-4 py-2">시술</th>
              <th className="px-4 py-2">상태</th>
              <th className="px-4 py-2 text-right">액션</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-b border-border-light last:border-b-0 hover:bg-border-light/50 transition-colors">
                <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-ink-secondary">
                  {formatTimestampKST(r.startsAt, "HH:mm")}–{formatTimestampKST(r.endsAt, "HH:mm")}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-ink">{r.petName}</span>
                    {r.customerPhone && (
                      <PhoneButton phone={r.customerPhone} className="flex h-6 w-6 items-center justify-center rounded-full text-ink-caption hover:bg-bg hover:text-ink">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                      </PhoneButton>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-ink-secondary">{r.serviceName}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex rounded-sm px-1.5 py-0.5 text-[11px] font-medium ${statusClass(r.status)}`}>
                    {statusLabel(r.status)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  {r.status === "confirmed" && (
                    <button onClick={() => setCompleteItem(r)} className="rounded-md bg-primary px-2.5 py-1 text-[12px] font-medium text-white hover:bg-primary-hover">완료</button>
                  )}
                  {r.status === "completed" && r.visitId && (
                    <Link href={`/visits/${r.visitId}/card`} className="text-[12px] font-medium text-primary hover:underline">완료 카드</Link>
                  )}
                  {r.status === "completed" && !r.visitId && (
                    <Link href={`/calendar?date=${today}`} className="text-[12px] font-medium text-primary hover:underline">완료 카드 만들기</Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 모바일 리스트 */}
      <div className="lg:hidden">
        {items.map((r) => (
          <div key={r.id} className="border-b border-border-light last:border-b-0">
            <Link href={`/calendar?date=${today}`} className="flex items-center justify-between px-4 py-3 transition-colors active:bg-border-light/50">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] tabular-nums text-ink-caption">{formatTimestampKST(r.startsAt, "HH:mm")}</span>
                  <span className="truncate text-[14px] font-semibold text-ink">{r.petName}</span>
                </div>
                <p className="mt-0.5 text-[12px] text-ink-caption">{r.serviceName}</p>
              </div>
              <span className={`ml-2 shrink-0 rounded-sm px-1.5 py-0.5 text-[11px] font-medium ${statusClass(r.status)}`}>
                {statusLabel(r.status)}
              </span>
            </Link>
            {(r.status === "confirmed" || r.status === "completed") && (
              <div className="flex items-center gap-2 px-4 pb-2.5">
                {r.customerPhone && (
                  <PhoneButton phone={r.customerPhone} className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[12px] font-medium text-ink-caption hover:bg-bg">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                    전화
                  </PhoneButton>
                )}
                {r.status === "confirmed" && (
                  <button onClick={() => setCompleteItem(r)} className="rounded-md bg-primary px-2.5 py-1 text-[12px] font-medium text-white hover:bg-primary-hover">완료</button>
                )}
                {r.status === "completed" && r.visitId && (
                  <Link href={`/visits/${r.visitId}/card`} className="text-[12px] font-medium text-primary hover:underline">완료 카드</Link>
                )}
                {r.status === "completed" && !r.visitId && (
                  <Link href={`/calendar?date=${today}`} className="text-[12px] font-medium text-primary hover:underline">완료 카드 만들기</Link>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 완료 다이얼로그 */}
      {completeItem && (
        <CompleteDialog
          reservationId={completeItem.id}
          petName={completeItem.petName}
          startsAt={completeItem.startsAt}
          endsAt={completeItem.endsAt}
          slotMinutes={slotMinutes}
          priceQuoted={completeItem.priceQuoted}
          servicePrice={completeItem.servicePrice}
          petSize={completeItem.petSize}
          passes={completeItem.passes}
          onClose={() => setCompleteItem(null)}
          onSubmit={handleComplete}
        />
      )}
    </>
  );
}
