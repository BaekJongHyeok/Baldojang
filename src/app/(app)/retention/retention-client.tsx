"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { formatPhone } from "@/lib/utils";
import { markContactedAction } from "@/lib/retention-actions";
import { PhoneButton } from "@/components/phone-button";
import { Spinner } from "@/components/spinner";

type Item = {
  id: string; name: string; breed: string | null; photoUrl: string | null;
  customerName: string; customerPhone: string; lastVisitDate: string;
  serviceName: string; elapsedWeeks: number; cycleWeeks: number;
  cycleSource: string;
  status: "approaching" | "recommended" | "overdue";
};

const STATUS_CONFIG = {
  overdue: { label: "지남", dot: "bg-danger", badge: "bg-danger-light text-danger", bar: "border-l-danger" },
  recommended: { label: "권장", dot: "bg-warning", badge: "bg-warning-light text-warning", bar: "border-l-warning" },
  approaching: { label: "다가옴", dot: "bg-ink-caption", badge: "bg-border-light text-ink-secondary", bar: "border-l-border" },
};

export function RetentionClient({ items, defaultCycleWeeks }: { items: Item[]; defaultCycleWeeks: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleContacted(petId: string) {
    const fd = new FormData();
    fd.set("pet_id", petId);
    startTransition(async () => {
      const result = await markContactedAction(fd);
      if (result?.error) toast.error(result.error);
      else toast.success("연락 완료로 처리했어요.");
    });
  }

  const groups = {
    overdue: items.filter((i) => i.status === "overdue"),
    recommended: items.filter((i) => i.status === "recommended"),
    approaching: items.filter((i) => i.status === "approaching"),
  };

  return (
    <div>
      <h1 className="text-[20px] font-bold text-ink">재방문 추천</h1>
      <p className="mt-1 text-[13px] text-ink-caption">
        {items.length > 0 ? `연락할 때가 된 보호자 ${items.length}명` : "재방문 시기가 된 펫을 알려드려요"}
      </p>

      {/* 빈 상태 */}
      {items.length === 0 && (
        <div className="mt-6 rounded-lg border border-border bg-white">
          <div className="flex flex-col items-center py-16 px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-light">
              <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="mt-3 text-[14px] font-medium text-ink">모든 손님이 재방문 주기 안에 있어요</p>
            <p className="mt-1 text-[12px] text-ink-caption">마지막 방문 후 기본 {defaultCycleWeeks}주가 지나면 여기에 표시돼요</p>
          </div>
        </div>
      )}

      {/* 그룹별 섹션 */}
      {(["overdue", "recommended", "approaching"] as const).map((status) => {
        const group = groups[status];
        if (group.length === 0) return null;
        const cfg = STATUS_CONFIG[status];
        return (
          <div key={status} className="mt-5">
            <div className="flex items-center gap-2 mb-2">
              <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
              <h2 className="text-[13px] font-bold text-ink-secondary">{cfg.label} ({group.length})</h2>
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-white">
              {/* 데스크톱 테이블 */}
              <div className="hidden lg:block">
                <table className="w-full text-left text-[14px]">
                  <thead>
                    <tr className="border-b border-border bg-border-light text-[12px] font-medium text-ink-caption">
                      <th className="w-[3px] p-0" />
                      <th className="px-4 py-2.5">펫</th>
                      <th className="px-4 py-2.5">마지막 시술</th>
                      <th className="px-4 py-2.5">경과</th>
                      <th className="px-4 py-2.5">보호자</th>
                      <th className="px-4 py-2.5 text-right">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.map((item) => (
                      <tr key={item.id} onClick={() => router.push(`/pets/${item.id}`)}
                        className="cursor-pointer border-b border-border-light last:border-b-0 hover:bg-bg transition-colors">
                        <td className={`w-[3px] p-0 border-l-[3px] ${cfg.bar}`} />
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-border-light text-[12px] font-bold text-ink-caption overflow-hidden">
                              {item.photoUrl ? <img src={item.photoUrl} alt="" className="h-full w-full object-cover" /> : item.name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-medium text-ink">{item.name}</span>
                              {item.breed && <span className="ml-1 text-[12px] text-ink-caption">{item.breed}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-ink-secondary">
                          {item.serviceName} · {new Date(item.lastVisitDate).toLocaleDateString("ko-KR")}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`rounded-sm px-1.5 py-0.5 text-[11px] font-medium ${cfg.badge}`}>{item.elapsedWeeks}주</span>
                          <span className="ml-1 text-[10px] text-ink-disabled">주기 {item.cycleWeeks}주</span>
                        </td>
                        <td className="px-4 py-2.5 text-ink-secondary">{item.customerName}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <PhoneButton phone={item.customerPhone}
                              className="rounded-md border border-border px-2.5 py-1.5 text-[12px] font-medium text-ink-secondary hover:bg-bg">
                              전화
                            </PhoneButton>
                            <Link href={`/calendar?book=${item.id}`}
                              className="rounded-md bg-primary px-2.5 py-1.5 text-[12px] font-medium text-white hover:bg-primary-hover">
                              예약
                            </Link>
                            <button onClick={() => handleContacted(item.id)} disabled={isPending}
                              className="rounded-md border border-border px-2.5 py-1.5 text-[12px] font-medium text-ink-caption hover:bg-bg disabled:opacity-50">
                              {isPending ? <Spinner className="h-3 w-3" /> : "연락함"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 모바일 리스트 */}
              <div className="lg:hidden">
                {group.map((item) => (
                  <div key={item.id} className={`border-b border-border-light last:border-b-0 border-l-[3px] ${cfg.bar}`}>
                    <Link href={`/pets/${item.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-bg">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-border-light text-[14px] font-bold text-ink-caption overflow-hidden">
                        {item.photoUrl ? <img src={item.photoUrl} alt="" className="h-full w-full object-cover" /> : item.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-semibold text-ink">{item.name}</span>
                          <span className={`rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${cfg.badge}`}>{item.elapsedWeeks}주 경과</span>
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-ink-caption">
                          {item.serviceName} · {new Date(item.lastVisitDate).toLocaleDateString("ko-KR")} · {item.customerName}
                        </p>
                      </div>
                    </Link>
                    <div className="flex gap-1.5 px-4 pb-3">
                      <PhoneButton phone={item.customerPhone}
                        className="flex-1 rounded-md border border-border py-2 text-center text-[12px] font-medium text-ink-secondary hover:bg-bg">
                        전화 {formatPhone(item.customerPhone)}
                      </PhoneButton>
                      <Link href={`/calendar?book=${item.id}`}
                        className="flex-1 rounded-md bg-primary py-2 text-center text-[12px] font-medium text-white hover:bg-primary-hover">
                        예약 잡기
                      </Link>
                      <button onClick={() => handleContacted(item.id)} disabled={isPending}
                        className="shrink-0 rounded-md border border-border px-3 py-2 text-[12px] font-medium text-ink-caption hover:bg-bg disabled:opacity-50">
                        {isPending ? <Spinner className="h-3 w-3" /> : "연락함"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
