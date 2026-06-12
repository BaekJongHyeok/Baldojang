"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { formatPhone } from "@/lib/utils";
import { markContactedAction } from "@/lib/retention-actions";
import { Spinner } from "@/components/spinner";

type Item = {
  id: string; name: string; breed: string | null; photoUrl: string | null;
  customerName: string; customerPhone: string; lastVisitDate: string;
  serviceName: string; elapsedWeeks: number; cycleWeeks: number;
  cycleSource: string;
  status: "approaching" | "recommended" | "overdue";
};

const STATUS_CONFIG = {
  overdue: { label: "지남", bg: "bg-danger-light", border: "border-danger", badge: "bg-danger-light text-danger", dot: "bg-danger" },
  recommended: { label: "권장", bg: "bg-warning-light", border: "border-warning", badge: "bg-warning-light text-warning", dot: "bg-warning" },
  approaching: { label: "다가옴", bg: "bg-border-light", border: "border-border", badge: "bg-border-light text-ink-secondary", dot: "bg-ink-caption" },
};

export function RetentionClient({ items }: { items: Item[] }) {
  const [isPending, startTransition] = useTransition();

  function handleContacted(petId: string) {
    const fd = new FormData();
    fd.set("pet_id", petId);
    startTransition(async () => {
      const result = await markContactedAction(fd);
      if (result?.error) toast.error(result.error);
      else toast.success("연락 완료로 처리했습니다.");
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
      <p className="mt-1 text-xs text-ink-caption">
        연락할 때가 된 보호자 {items.length}명
      </p>

      {items.length === 0 && (
        <p className="mt-12 text-center text-sm text-ink-caption">현재 재방문 추천 대상이 없습니다</p>
      )}

      {(["overdue", "recommended", "approaching"] as const).map((status) => {
        const group = groups[status];
        if (group.length === 0) return null;
        const cfg = STATUS_CONFIG[status];
        return (
          <div key={status} className="mt-5">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
              <p className="text-sm font-bold text-ink-secondary">{cfg.label} ({group.length})</p>
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {group.map((item) => (
                <div key={item.id} className={`rounded-lg border ${cfg.border} ${cfg.bg} p-4`}>
                  <div className="flex items-start gap-3">
                    {/* 아바타 */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-border-light text-sm font-bold text-ink-caption overflow-hidden">
                      {item.photoUrl
                        ? <img src={item.photoUrl} alt="" className="h-full w-full object-cover" />
                        : (item.breed ?? item.name).charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/pets/${item.id}`} className="text-sm font-semibold text-ink hover:underline">{item.name}</Link>
                        <span className={`rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${cfg.badge}`}>{item.elapsedWeeks}주 경과</span>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-secondary">
                        {item.serviceName} · {new Date(item.lastVisitDate).toLocaleDateString("ko-KR")}
                        {item.breed && ` · ${item.breed}`}
                      </p>
                      <p className="text-[10px] text-ink-disabled">주기 {item.cycleWeeks}주 · {item.cycleSource} 설정</p>
                      <p className="text-xs text-ink-caption">
                        보호자 {item.customerName}
                      </p>
                    </div>
                  </div>
                  {/* 액션 */}
                  <div className="mt-3 flex gap-2">
                    <a href={`tel:${item.customerPhone}`}
                      className="flex-1 rounded-md border border-border bg-white py-2 text-center text-xs font-medium text-ink-secondary hover:bg-bg">
                      전화 {formatPhone(item.customerPhone)}
                    </a>
                    <Link href={`/calendar?book=${item.id}`}
                      className="flex-1 rounded-md bg-primary py-2 text-center text-xs font-medium text-white hover:bg-primary-hover">
                      예약 잡기
                    </Link>
                    <button onClick={() => handleContacted(item.id)} disabled={isPending}
                      className="shrink-0 rounded-md border border-border bg-white px-3 py-2 text-xs font-medium text-ink-secondary hover:bg-bg disabled:opacity-50">
                      {isPending ? <Spinner className="h-3 w-3" /> : "연락함"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
