import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { todayKST } from "@/lib/calendar-utils";
import { subMonths, format } from "date-fns";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase
    .from("staff")
    .select("shop_id")
    .eq("id", user.id)
    .single();
  if (!staff) redirect("/dashboard");

  const today = todayKST();
  const twelveMonthsAgo = format(subMonths(new Date(today + "T00:00:00Z"), 12), "yyyy-MM-dd");
  const fromISO = new Date(twelveMonthsAgo + "T00:00:00+09:00").toISOString();
  const toISO = new Date(today + "T23:59:59+09:00").toISOString();

  // 결제 데이터 (CSV용 펫 이름 포함)
  const { data: payments } = await supabase
    .from("payments")
    .select("amount, method, paid_at, visit_id, visits(services(name), pets(name))")
    .eq("shop_id", staff.shop_id)
    .gte("paid_at", fromISO)
    .lte("paid_at", toISO)
    .order("paid_at");

  const rows = (payments ?? []).map((p) => {
    const visit = Array.isArray(p.visits) ? p.visits[0] : p.visits;
    const svc = visit?.services
      ? Array.isArray(visit.services) ? visit.services[0] : visit.services
      : null;
    const pet = visit?.pets
      ? Array.isArray(visit.pets) ? visit.pets[0] : visit.pets
      : null;
    return {
      amount: p.amount,
      method: p.method as string,
      paid_at: p.paid_at,
      serviceName: svc?.name ?? "기타",
      petName: pet?.name ?? "",
      hasVisit: !!(p as Record<string, unknown>).visit_id,
    };
  });

  // 예약 통계 (12개월)
  const { data: reservations } = await supabase
    .from("reservations")
    .select("starts_at, status")
    .eq("shop_id", staff.shop_id)
    .gte("starts_at", fromISO)
    .lte("starts_at", toISO);

  // 펫 등록 수
  const { data: pets } = await supabase
    .from("pets")
    .select("created_at")
    .eq("shop_id", staff.shop_id)
    .gte("created_at", fromISO)
    .lte("created_at", toISO);

  // 선불권 차감 (pass_logs delta < 0)
  const { data: passLogs } = await supabase
    .from("pass_logs")
    .select("delta, created_at")
    .lt("delta", 0)
    .gte("created_at", fromISO)
    .lte("created_at", toISO);

  // 현재 미사용 잔액 총계
  const { data: activePasses } = await supabase
    .from("passes")
    .select("balance, type")
    .eq("shop_id", staff.shop_id)
    .eq("type", "amount");

  const unusedBalance = (activePasses ?? []).reduce((s, p) => s + (p.balance ?? 0), 0);

  return (
    <ReportsClient
      payments={rows}
      reservations={(reservations ?? []).map((r) => ({
        starts_at: r.starts_at,
        status: r.status as string,
      }))}
      newPetsCount={(pets ?? []).length}
      passDeductions={(passLogs ?? []).map((l) => ({
        delta: l.delta,
        created_at: l.created_at,
      }))}
      unusedPassBalance={unusedBalance}
      today={today}
    />
  );
}
