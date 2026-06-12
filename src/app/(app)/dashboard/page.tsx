import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { todayKST } from "@/lib/calendar-utils";
import { getAuthContext } from "@/lib/auth-cache";
import { TodayTable } from "./today-table";
import { startOfWeek, startOfMonth, format } from "date-fns";

export default async function DashboardPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const shopId = ctx.staff.shopId;

  const today = todayKST();
  const todayStart = new Date(today + "T00:00:00+09:00").toISOString();
  const todayEnd = new Date(today + "T23:59:59+09:00").toISOString();

  // 이번 주/월 시작
  const todayDate = new Date(today + "T00:00:00Z");
  const weekStart = new Date(format(startOfWeek(todayDate, { weekStartsOn: 1 }), "yyyy-MM-dd") + "T00:00:00+09:00").toISOString();
  const monthStart = new Date(format(startOfMonth(todayDate), "yyyy-MM-dd") + "T00:00:00+09:00").toISOString();

  const supabase = await createClient();
  const defCycle = ctx.shop?.defaultCycleWeeks ?? 5;
  const cutoff = new Date(Date.now() - (defCycle - 1) * 7 * 86400000).toISOString();
  const nowISO = new Date().toISOString();

  const weekEndISO = new Date(today + "T23:59:59+09:00").toISOString();
  const week7End = new Date(Date.now() + 7 * 86400000).toISOString();

  const [todayResResult, todayPayResult, weekPayResult, monthPayResult, oldVisitsResult, futureResResult, weekResResult] = await Promise.all([
    supabase
      .from("reservations")
      .select("id, starts_at, ends_at, status, price_quoted, pet_id, pets(name, photo_url, customer_id, customers(id, phone)), services(name, duration_minutes)")
      .eq("shop_id", shopId)
      .gte("starts_at", todayStart)
      .lte("starts_at", todayEnd)
      .order("starts_at"),
    supabase.from("payments").select("amount, visit_id").eq("shop_id", shopId)
      .gte("paid_at", todayStart).lte("paid_at", todayEnd),
    supabase.from("payments").select("amount, visit_id").eq("shop_id", shopId)
      .gte("paid_at", weekStart).lte("paid_at", weekEndISO),
    supabase.from("payments").select("amount, visit_id").eq("shop_id", shopId)
      .gte("paid_at", monthStart).lte("paid_at", weekEndISO),
    supabase.from("visits").select("pet_id").eq("shop_id", shopId).lte("visited_at", cutoff),
    supabase.from("reservations").select("pet_id").eq("shop_id", shopId).eq("status", "confirmed").gte("starts_at", nowISO),
    // 이번 주 예약 (오늘~7일)
    supabase.from("reservations").select("id", { count: "exact", head: true }).eq("shop_id", shopId).eq("status", "confirmed").gte("starts_at", nowISO).lte("starts_at", week7End),
  ]);

  const reservations = todayResResult.data ?? [];
  const active = reservations.filter((r) => r.status !== "cancelled");
  const totalCount = active.length;
  const completedCount = active.filter((r) => r.status === "completed").length;
  const noshowCount = active.filter((r) => r.status === "no_show").length;

  // 시술 매출 vs 선불권 판매 분리 (hasVisit = visit_id 존재 여부)
  function splitRevenue(payments: { amount: number; visit_id: string | null }[]) {
    let service = 0, pass = 0;
    for (const p of payments) { if (p.visit_id) service += p.amount; else pass += p.amount; }
    return { service, pass };
  }
  const todayRev = splitRevenue((todayPayResult.data ?? []) as { amount: number; visit_id: string | null }[]);
  const weekRev = splitRevenue((weekPayResult.data ?? []) as { amount: number; visit_id: string | null }[]);
  const monthRev = splitRevenue((monthPayResult.data ?? []) as { amount: number; visit_id: string | null }[]);

  const oldPetIds = new Set((oldVisitsResult.data ?? []).map((v) => v.pet_id));
  const futurePetIds = new Set((futureResResult.data ?? []).map((r) => r.pet_id));
  const retentionCount = [...oldPetIds].filter((id) => !futurePetIds.has(id)).length;
  const weekBookingCount = weekResResult.count ?? 0;

  // 완료 예약의 visit ID (카드 링크용)
  const completedResIds = active.filter((r) => r.status === "completed").map((r) => r.id);
  let visitMap: Record<string, string> = {};
  if (completedResIds.length > 0) {
    const { data: visits } = await supabase
      .from("visits")
      .select("id, reservation_id")
      .in("reservation_id", completedResIds);
    for (const v of visits ?? []) {
      if (v.reservation_id) visitMap[v.reservation_id] = v.id;
    }
  }

  // 완료 다이얼로그용: confirmed 예약의 보호자별 선불권
  const confirmedCustomerIds = [...new Set(
    active.filter((r) => r.status === "confirmed").map((r) => {
      const pet = Array.isArray(r.pets) ? r.pets[0] : r.pets;
      const c = pet?.customers ? (Array.isArray(pet.customers) ? pet.customers[0] : pet.customers) : null;
      return c?.id;
    }).filter(Boolean) as string[]
  )];
  let passesMap: Record<string, { id: string; type: string; name: string; balance: number | null; remaining: number | null; expires_at: string | null; disabled_at: string | null }[]> = {};
  if (confirmedCustomerIds.length > 0) {
    const { data: allPasses } = await supabase
      .from("passes")
      .select("id, type, name, balance, remaining, expires_at, disabled_at, customer_id")
      .in("customer_id", confirmedCustomerIds);
    for (const p of allPasses ?? []) {
      if (!passesMap[p.customer_id]) passesMap[p.customer_id] = [];
      passesMap[p.customer_id].push(p);
    }
  }

  // 오늘 예약 데이터를 클라이언트 컴포넌트용으로 직렬화
  const todayItems = active.map((r) => {
    const pet = Array.isArray(r.pets) ? r.pets[0] : r.pets;
    const svc = Array.isArray(r.services) ? r.services[0] : r.services;
    const customer = pet?.customers ? (Array.isArray(pet.customers) ? pet.customers[0] : pet.customers) : null;
    return {
      id: r.id,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      status: r.status as string,
      priceQuoted: r.price_quoted as number | null,
      petName: pet?.name ?? "?",
      serviceName: svc?.name ?? "",
      serviceDuration: svc?.duration_minutes ?? 60,
      customerPhone: customer?.phone ?? null,
      customerId: customer?.id ?? null,
      visitId: visitMap[r.id] ?? null,
      passes: customer?.id ? (passesMap[customer.id] ?? []) : [],
    };
  });

  const slotMinutes = ctx.shop?.slotMinutes ?? 30;
  const dateLabel = new Date(today + "T00:00:00Z").toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" });

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-ink">대시보드</h1>
          <p className="text-[12px] text-ink-caption">{dateLabel}</p>
        </div>
        <Link href="/calendar?new=1" className="hidden rounded-md bg-primary px-3 py-2 text-[13px] font-medium text-white hover:bg-primary-hover lg:block">
          + 예약 등록
        </Link>
      </div>

      {/* KPI 스트립 */}
      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        <KPI label="오늘 예약" value={String(totalCount)} suffix="건" sub={noshowCount > 0 ? `노쇼 ${noshowCount}` : undefined} subDanger />
        <KPI label="완료" value={String(completedCount)} suffix="건" />
        <KPI label="오늘 매출" value={`₩${todayRev.service.toLocaleString()}`} sub={todayRev.pass > 0 ? `+ 선불권 ₩${todayRev.pass.toLocaleString()}` : undefined} />
        <KPI label="이번 주 예약" value={String(weekBookingCount)} suffix="건" />
      </div>

      {/* 오늘 예약 테이블 */}
      <div className="mt-5 rounded-lg border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[14px] font-semibold text-ink">오늘 예약</h2>
          <Link href={`/calendar?date=${today}`} aria-label="캘린더 보기" className="flex h-8 w-8 items-center justify-center rounded-full text-ink-caption transition-colors hover:bg-border-light hover:text-ink">
            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
          </Link>
        </div>
        <TodayTable items={todayItems} slotMinutes={slotMinutes} today={today} />
      </div>

      {/* 하단 보조 패널 */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* 재방문 */}
        <div className="rounded-lg border border-border bg-white">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-[14px] font-semibold text-ink">재방문 추천</h2>
            <Link href="/retention" aria-label="재방문 추천" className="flex h-8 w-8 items-center justify-center rounded-full text-ink-caption transition-colors hover:bg-border-light hover:text-ink">
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </Link>
          </div>
          <div className="px-4 py-4">
            {retentionCount > 0 ? (
              <p className="text-[14px] text-ink-secondary">
                연락이 필요한 보호자 <span className="font-semibold text-ink">{retentionCount}명</span>
              </p>
            ) : (
              <div className="flex flex-col items-center py-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-border-light">
                  <svg className="h-5 w-5 text-ink-disabled" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="mt-2 text-[13px] text-ink-caption">지금은 연락할 대상이 없어요</p>
              </div>
            )}
          </div>
        </div>

        {/* 매출 */}
        <div className="rounded-lg border border-border bg-white">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-[14px] font-semibold text-ink">매출</h2>
            <Link href="/reports" aria-label="매출 리포트" className="flex h-8 w-8 items-center justify-center rounded-full text-ink-caption transition-colors hover:bg-border-light hover:text-ink">
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
            </Link>
          </div>
          <div className="px-4 py-4">
            <dl className="flex flex-col gap-2 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-ink-caption">이번 주</dt>
                <dd className="font-semibold text-ink tabular-nums">₩{weekRev.service.toLocaleString()}</dd>
              </div>
              {weekRev.pass > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-disabled text-[12px]">+ 선불권</dt>
                  <dd className="text-[12px] text-ink-caption tabular-nums">₩{weekRev.pass.toLocaleString()}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-caption">이번 달</dt>
                <dd className="font-semibold text-ink tabular-nums">₩{monthRev.service.toLocaleString()}</dd>
              </div>
              {monthRev.pass > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-disabled text-[12px]">+ 선불권</dt>
                  <dd className="text-[12px] text-ink-caption tabular-nums">₩{monthRev.pass.toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, suffix, sub, subDanger, href }: { label: string; value: string; suffix?: string; sub?: string; subDanger?: boolean; href?: string }) {
  const inner = (
    <div className="overflow-hidden bg-white px-4 py-3">
      <p className="truncate text-[12px] text-ink-caption">{label}</p>
      <p className="mt-0.5 truncate text-[20px] font-bold tabular-nums text-ink">
        {value}{suffix && <span className="text-[14px] font-medium text-ink-caption ml-0.5">{suffix}</span>}
      </p>
      {sub && <p className={`truncate text-[11px] ${subDanger ? "text-danger" : "text-ink-caption"}`}>{sub}</p>}
    </div>
  );
  if (href) return <Link href={href} className="hover:bg-border-light/50 transition-colors">{inner}</Link>;
  return inner;
}
