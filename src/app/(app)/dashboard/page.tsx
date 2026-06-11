import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { todayKST, formatTimestampKST } from "@/lib/calendar-utils";

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase.from("staff").select("shop_id").eq("id", user.id).single();
  if (!staff) redirect("/login");

  const today = todayKST();
  const todayStart = new Date(today + "T00:00:00+09:00").toISOString();
  const todayEnd = new Date(today + "T23:59:59+09:00").toISOString();

  const { data: todayRes } = await supabase
    .from("reservations")
    .select("id, starts_at, ends_at, status, pets(name, photo_url), services(name)")
    .eq("shop_id", staff.shop_id)
    .gte("starts_at", todayStart)
    .lte("starts_at", todayEnd)
    .order("starts_at");

  const reservations = todayRes ?? [];
  const active = reservations.filter((r) => r.status !== "cancelled");
  const totalCount = active.length;
  const completedCount = active.filter((r) => r.status === "completed").length;

  const { data: todayPayments } = await supabase
    .from("payments").select("amount").eq("shop_id", staff.shop_id)
    .gte("paid_at", todayStart).lte("paid_at", todayEnd);
  const todayRevenue = (todayPayments ?? []).reduce((s, p) => s + p.amount, 0);

  const { data: shopCfg } = await supabase.from("shops").select("default_cycle_weeks").eq("id", staff.shop_id).single();
  const defCycle = shopCfg?.default_cycle_weeks ?? 5;
  const cutoff = new Date(Date.now() - (defCycle - 1) * 7 * 86400000).toISOString();
  const { data: oldVisits } = await supabase.from("visits").select("pet_id").eq("shop_id", staff.shop_id).lte("visited_at", cutoff);
  const oldPetIds = new Set((oldVisits ?? []).map((v) => v.pet_id));
  const nowISO = new Date().toISOString();
  const { data: futureRes } = await supabase.from("reservations").select("pet_id").eq("shop_id", staff.shop_id).eq("status", "confirmed").gte("starts_at", nowISO);
  const futurePetIds = new Set((futureRes ?? []).map((r) => r.pet_id));
  const retentionCount = [...oldPetIds].filter((id) => !futurePetIds.has(id)).length;

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
        <KPI label="오늘 예약" value={String(totalCount)} suffix="건" />
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
          <div className="overflow-x-auto">
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
                  return (
                    <tr key={r.id} className="border-b border-border-light last:border-b-0 hover:bg-border-light/50 transition-colors">
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-ink-secondary">
                        {formatTimestampKST(r.starts_at, "HH:mm")}–{formatTimestampKST(r.ends_at, "HH:mm")}
                      </td>
                      <td className="px-4 py-2.5">
                        <Link href={`/pets/${(r as Record<string, unknown>).pet_id ?? ""}`} className="font-medium text-ink hover:text-primary">
                          {pet?.name ?? "?"}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-ink-secondary">{svc?.name ?? ""}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex rounded-sm px-1.5 py-0.5 text-[11px] font-medium ${statusClass(r.status)}`}>
                          {statusLabel(r.status)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link href={`/calendar?date=${today}`} className="text-[12px] font-medium text-primary hover:underline">보기</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
              <p className="text-[14px] text-ink-caption">현재 재방문 추천 대상이 없습니다</p>
            )}
          </div>
        </div>

        {/* 매출 요약 */}
        <div className="rounded-lg border border-border bg-white">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-[14px] font-semibold text-ink">매출</h2>
            <Link href="/reports" className="text-[12px] font-medium text-primary hover:underline">리포트</Link>
          </div>
          <div className="px-4 py-4">
            <p className="text-[24px] font-bold text-ink tabular-nums">₩{todayRevenue.toLocaleString()}</p>
            <p className="text-[12px] text-ink-caption">오늘 매출</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, suffix, href, highlight }: { label: string; value: string; suffix?: string; href?: string; highlight?: boolean }) {
  const inner = (
    <div className={`bg-white px-4 py-3 ${highlight ? "text-primary" : ""}`}>
      <p className="text-[12px] text-ink-caption">{label}</p>
      <p className={`mt-0.5 text-[20px] font-bold tabular-nums ${highlight ? "text-primary" : "text-ink"}`}>
        {value}{suffix && <span className="text-[14px] font-medium text-ink-caption ml-0.5">{suffix}</span>}
      </p>
    </div>
  );
  if (href) return <Link href={href} className="hover:bg-border-light/50 transition-colors">{inner}</Link>;
  return inner;
}
