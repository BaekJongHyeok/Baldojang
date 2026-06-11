import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { todayKST, formatTimestampKST } from "@/lib/calendar-utils";

function statusBadge(s: string) {
  switch (s) {
    case "confirmed": return "bg-blue-100 text-blue-700";
    case "completed": return "bg-stone-100 text-stone-600";
    case "no_show": return "bg-red-100 text-red-700";
    case "cancelled": return "bg-stone-100 text-stone-400";
    default: return "bg-stone-100";
  }
}
function statusLabel(s: string) {
  switch (s) { case "confirmed": return "확정"; case "completed": return "완료"; case "no_show": return "노쇼"; case "cancelled": return "취소"; default: return s; }
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase
    .from("staff")
    .select("shop_id")
    .eq("id", user.id)
    .single();
  if (!staff) redirect("/login");

  const today = todayKST();
  const todayStart = new Date(today + "T00:00:00+09:00").toISOString();
  const todayEnd = new Date(today + "T23:59:59+09:00").toISOString();

  // 오늘 예약
  const { data: todayRes } = await supabase
    .from("reservations")
    .select("id, starts_at, ends_at, status, pets(name), services(name)")
    .eq("shop_id", staff.shop_id)
    .gte("starts_at", todayStart)
    .lte("starts_at", todayEnd)
    .order("starts_at");

  const reservations = todayRes ?? [];
  const totalCount = reservations.filter((r) => r.status !== "cancelled").length;
  const completedCount = reservations.filter((r) => r.status === "completed").length;

  // 오늘 매출
  const { data: todayPayments } = await supabase
    .from("payments")
    .select("amount")
    .eq("shop_id", staff.shop_id)
    .gte("paid_at", todayStart)
    .lte("paid_at", todayEnd);

  const todayRevenue = (todayPayments ?? []).reduce((sum, p) => sum + p.amount, 0);

  // 재방문 대상 수 (간이 계산: 마지막 visit + default_cycle_weeks 경과한 활성 펫)
  const { data: shopCfg } = await supabase.from("shops").select("default_cycle_weeks").eq("id", staff.shop_id).single();
  const defCycle = shopCfg?.default_cycle_weeks ?? 5;
  const cutoff = new Date(Date.now() - (defCycle - 1) * 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: oldVisits } = await supabase
    .from("visits")
    .select("pet_id")
    .eq("shop_id", staff.shop_id)
    .lte("visited_at", cutoff);
  const oldPetIds = new Set((oldVisits ?? []).map((v) => v.pet_id));
  // 미래 예약 있는 펫 제외
  const nowISO = new Date().toISOString();
  const { data: futureRes } = await supabase.from("reservations").select("pet_id").eq("shop_id", staff.shop_id).eq("status", "confirmed").gte("starts_at", nowISO);
  const futurePetIds = new Set((futureRes ?? []).map((r) => r.pet_id));
  const retentionCount = [...oldPetIds].filter((id) => !futurePetIds.has(id)).length;

  // 다음 예약 (현재 시각 이후 첫 confirmed)
  const now = nowISO;
  const nextReservation = reservations.find(
    (r) => r.status === "confirmed" && r.starts_at > now,
  );

  return (
    <div>
      <h1 className="text-xl font-bold text-stone-900">
        {new Date(today + "T00:00:00Z").toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })}
      </h1>

      {/* 요약 카드 */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-stone-900">{totalCount}</p>
          <p className="text-[11px] text-stone-500">오늘 예약</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-stone-900">{completedCount}</p>
          <p className="text-[11px] text-stone-500">완료</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-stone-900">₩{todayRevenue.toLocaleString()}</p>
          <p className="text-[11px] text-stone-500">오늘 매출</p>
        </div>
        {retentionCount > 0 && (
          <Link href="/retention" className="rounded-2xl bg-amber-50 p-4 shadow-sm text-center transition hover:bg-amber-100">
            <p className="text-2xl font-bold text-amber-700">{retentionCount}</p>
            <p className="text-[11px] text-amber-600">재방문 대상</p>
          </Link>
        )}
      </div>

      {/* 다음 예약 하이라이트 */}
      {nextReservation && (() => {
        const pet = Array.isArray(nextReservation.pets) ? nextReservation.pets[0] : nextReservation.pets;
        const svc = Array.isArray(nextReservation.services) ? nextReservation.services[0] : nextReservation.services;
        return (
          <Link href="/calendar" className="mt-4 block rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 transition hover:bg-blue-100">
            <p className="text-[11px] font-medium text-blue-600">다음 예약</p>
            <p className="mt-1 text-sm font-bold text-blue-900">{pet?.name} · {svc?.name}</p>
            <p className="text-xs text-blue-700">
              {formatTimestampKST(nextReservation.starts_at, "HH:mm")} – {formatTimestampKST(nextReservation.ends_at, "HH:mm")}
            </p>
          </Link>
        );
      })()}

      {/* 오늘의 예약 리스트 */}
      <div className="mt-6">
        <p className="text-sm font-bold text-stone-700">오늘의 예약</p>
        {reservations.length === 0 ? (
          <p className="mt-4 text-center text-sm text-stone-400">오늘 예약이 없습니다</p>
        ) : (
          <div className="mt-3 flex flex-col gap-1.5">
            {reservations.filter((r) => r.status !== "cancelled").map((r) => {
              const pet = Array.isArray(r.pets) ? r.pets[0] : r.pets;
              const svc = Array.isArray(r.services) ? r.services[0] : r.services;
              return (
                <Link
                  key={r.id}
                  href={`/calendar?date=${today}`}
                  className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm transition hover:bg-stone-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-900">
                      {formatTimestampKST(r.starts_at, "HH:mm")} {pet?.name}
                    </p>
                    <p className="text-xs text-stone-500">{svc?.name}</p>
                  </div>
                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium ${statusBadge(r.status)}`}>
                    {statusLabel(r.status)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
