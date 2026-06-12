import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { todayKST, formatTimestampKST } from "@/lib/calendar-utils";
import { getAuthContext } from "@/lib/auth-cache";
import { PhoneButton } from "@/components/phone-button";
import { startOfWeek, startOfMonth, format } from "date-fns";

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

  const [todayResResult, todayPayResult, weekPayResult, monthPayResult, oldVisitsResult, futureResResult] = await Promise.all([
    supabase
      .from("reservations")
      .select("id, starts_at, ends_at, status, pets(name, photo_url, customers(phone)), services(name)")
      .eq("shop_id", shopId)
      .gte("starts_at", todayStart)
      .lte("starts_at", todayEnd)
      .order("starts_at"),
    supabase.from("payments").select("amount").eq("shop_id", shopId)
      .gte("paid_at", todayStart).lte("paid_at", todayEnd),
    supabase.from("payments").select("amount").eq("shop_id", shopId)
      .gte("paid_at", weekStart).lte("paid_at", todayEnd),
    supabase.from("payments").select("amount").eq("shop_id", shopId)
      .gte("paid_at", monthStart).lte("paid_at", todayEnd),
    supabase.from("visits").select("pet_id").eq("shop_id", shopId).lte("visited_at", cutoff),
    supabase.from("reservations").select("pet_id").eq("shop_id", shopId).eq("status", "confirmed").gte("starts_at", nowISO),
  ]);

  const reservations = todayResResult.data ?? [];
  const active = reservations.filter((r) => r.status !== "cancelled");
  const totalCount = active.length;
  const completedCount = active.filter((r) => r.status === "completed").length;
  const noshowCount = active.filter((r) => r.status === "no_show").length;
  const todayRevenue = (todayPayResult.data ?? []).reduce((s, p) => s + p.amount, 0);
  const weekRevenue = (weekPayResult.data ?? []).reduce((s, p) => s + p.amount, 0);
  const monthRevenue = (monthPayResult.data ?? []).reduce((s, p) => s + p.amount, 0);

  const oldPetIds = new Set((oldVisitsResult.data ?? []).map((v) => v.pet_id));
  const futurePetIds = new Set((futureResResult.data ?? []).map((r) => r.pet_id));
  const retentionCount = [...oldPetIds].filter((id) => !futurePetIds.has(id)).length;

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
        <KPI label="오늘 예약" value={String(totalCount)} suffix="건" sub={noshowCount > 0 ? `노쇼 ${noshowCount}` : undefined} />
        <KPI label="완료" value={String(completedCount)} suffix="건" />
        <KPI label="오늘 매출" value={`₩${todayRevenue.toLocaleString()}`} />
        <KPI label="재방문 대상" value={String(retentionCount)} suffix="명" href={retentionCount > 0 ? "/retention" : undefined} highlight={retentionCount > 0} />
      </div>

      {/* 오늘 예약 테이블 */}
      <div className="mt-5 rounded-lg border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[14px] font-semibold text-ink">오늘 예약</h2>
          <Link href={`/calendar?date=${today}`} className="text-[12px] font-medium text-primary hover:underline">캘린더 보기</Link>
        </div>

        {active.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-[14px] text-ink-caption">오늘 예약이 없습니다</p>
            <Link href="/calendar?new=1" className="mt-2 inline-block text-[13px] font-medium text-primary hover:underline">예약 등록하기</Link>
          </div>
        ) : (
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
                  {active.map((r) => {
                    const pet = Array.isArray(r.pets) ? r.pets[0] : r.pets;
                    const svc = Array.isArray(r.services) ? r.services[0] : r.services;
                    const customer = pet?.customers ? (Array.isArray(pet.customers) ? pet.customers[0] : pet.customers) : null;
                    const vId = visitMap[r.id];
                    return (
                      <tr key={r.id} className="border-b border-border-light last:border-b-0 hover:bg-border-light/50 transition-colors">
                        <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-ink-secondary">
                          {formatTimestampKST(r.starts_at, "HH:mm")}–{formatTimestampKST(r.ends_at, "HH:mm")}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-ink">{pet?.name ?? "?"}</span>
                            {customer?.phone && (
                              <PhoneButton phone={customer.phone} className="flex h-6 w-6 items-center justify-center rounded-full text-ink-caption hover:bg-bg hover:text-ink">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                              </PhoneButton>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-ink-secondary">{svc?.name ?? ""}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex rounded-sm px-1.5 py-0.5 text-[11px] font-medium ${statusClass(r.status)}`}>
                            {statusLabel(r.status)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {r.status === "confirmed" && (
                            <Link href={`/calendar?date=${today}`} className="rounded-md bg-primary px-2.5 py-1 text-[12px] font-medium text-white hover:bg-primary-hover">완료</Link>
                          )}
                          {r.status === "completed" && vId && (
                            <Link href={`/visits/${vId}/card`} className="text-[12px] font-medium text-primary hover:underline">카드 보기</Link>
                          )}
                          {r.status === "completed" && !vId && (
                            <Link href={`/calendar?date=${today}`} className="text-[12px] font-medium text-primary hover:underline">카드 만들기</Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* 모바일 리스트 */}
            <div className="lg:hidden">
              {active.map((r) => {
                const pet = Array.isArray(r.pets) ? r.pets[0] : r.pets;
                const svc = Array.isArray(r.services) ? r.services[0] : r.services;
                const customer = pet?.customers ? (Array.isArray(pet.customers) ? pet.customers[0] : pet.customers) : null;
                const vId = visitMap[r.id];
                return (
                  <div key={r.id} className="border-b border-border-light last:border-b-0">
                    <Link
                      href={`/calendar?date=${today}`}
                      className="flex items-center justify-between px-4 py-3 transition-colors active:bg-border-light/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] tabular-nums text-ink-caption">{formatTimestampKST(r.starts_at, "HH:mm")}</span>
                          <span className="truncate text-[14px] font-semibold text-ink">{pet?.name ?? "?"}</span>
                        </div>
                        <p className="mt-0.5 text-[12px] text-ink-caption">{svc?.name ?? ""}</p>
                      </div>
                      <div className="ml-2 flex shrink-0 items-center gap-2">
                        <span className={`rounded-sm px-1.5 py-0.5 text-[11px] font-medium ${statusClass(r.status)}`}>
                          {statusLabel(r.status)}
                        </span>
                      </div>
                    </Link>
                    {/* 모바일 액션 행 */}
                    {(r.status === "confirmed" || (r.status === "completed")) && (
                      <div className="flex items-center gap-2 px-4 pb-2.5">
                        {customer?.phone && (
                          <PhoneButton phone={customer.phone} className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[12px] font-medium text-ink-caption hover:bg-bg">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                            전화
                          </PhoneButton>
                        )}
                        {r.status === "confirmed" && (
                          <Link href={`/calendar?date=${today}`} className="rounded-md bg-primary px-2.5 py-1 text-[12px] font-medium text-white hover:bg-primary-hover">완료</Link>
                        )}
                        {r.status === "completed" && vId && (
                          <Link href={`/visits/${vId}/card`} className="text-[12px] font-medium text-primary hover:underline">카드 보기</Link>
                        )}
                        {r.status === "completed" && !vId && (
                          <Link href={`/calendar?date=${today}`} className="text-[12px] font-medium text-primary hover:underline">카드 만들기</Link>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 하단 보조 패널 */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* 재방문 */}
        <div className="rounded-lg border border-border bg-white">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-[14px] font-semibold text-ink">재방문 추천</h2>
            <Link href="/retention" className="text-[12px] font-medium text-primary hover:underline">전체 보기</Link>
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
            <Link href="/reports" className="text-[12px] font-medium text-primary hover:underline">리포트</Link>
          </div>
          <div className="px-4 py-4">
            <dl className="flex flex-col gap-2 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-ink-caption">이번 주</dt>
                <dd className="font-semibold text-ink tabular-nums">₩{weekRevenue.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-caption">이번 달</dt>
                <dd className="font-semibold text-ink tabular-nums">₩{monthRevenue.toLocaleString()}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, suffix, sub, href, highlight }: { label: string; value: string; suffix?: string; sub?: string; href?: string; highlight?: boolean }) {
  const inner = (
    <div className={`bg-white px-4 py-3 ${highlight ? "text-primary" : ""}`}>
      <p className="text-[12px] text-ink-caption">{label}</p>
      <p className={`mt-0.5 text-[20px] font-bold tabular-nums ${highlight ? "text-primary" : "text-ink"}`}>
        {value}{suffix && <span className="text-[14px] font-medium text-ink-caption ml-0.5">{suffix}</span>}
      </p>
      {sub && <p className="text-[11px] text-danger">{sub}</p>}
    </div>
  );
  if (href) return <Link href={href} className="hover:bg-border-light/50 transition-colors">{inner}</Link>;
  return inner;
}
