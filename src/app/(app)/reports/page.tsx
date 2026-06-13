import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { todayKST } from "@/lib/calendar-utils";
import { getAuthContext } from "@/lib/auth-cache";
import { subMonths, format } from "date-fns";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const shopId = ctx.staff.shopId;

  const today = todayKST();
  const twelveMonthsAgo = format(subMonths(new Date(today + "T00:00:00Z"), 12), "yyyy-MM-dd");
  const fromISO = new Date(twelveMonthsAgo + "T00:00:00+09:00").toISOString();
  const toISO = new Date(today + "T23:59:59+09:00").toISOString();

  const supabase = await createClient();

  // 병렬: 결제, 예약, 펫등록, 선불권 차감, 미사용 잔액
  const [paymentsResult, reservationsResult, petsResult, passLogsResult, activePassesResult] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, method, paid_at, visit_id, pass_id, visits(services(name), pets(name)), passes(name, customers(name))")
      .eq("shop_id", shopId)
      .gte("paid_at", fromISO)
      .lte("paid_at", toISO)
      .order("paid_at"),
    supabase
      .from("reservations")
      .select("starts_at, status")
      .eq("shop_id", shopId)
      .gte("starts_at", fromISO)
      .lte("starts_at", toISO),
    supabase
      .from("pets")
      .select("created_at")
      .eq("shop_id", shopId)
      .gte("created_at", fromISO)
      .lte("created_at", toISO),
    supabase
      .from("pass_logs")
      .select("delta, created_at, passes!inner(type, shop_id)")
      .eq("passes.shop_id", shopId)
      .gte("created_at", fromISO)
      .lte("created_at", toISO),
    supabase
      .from("passes")
      .select("balance, type")
      .eq("shop_id", shopId),
  ]);

  const payments = paymentsResult.data ?? [];
  const reservations = reservationsResult.data ?? [];
  const pets = petsResult.data ?? [];
  const passLogs = passLogsResult.data ?? [];
  const activePasses = activePassesResult.data ?? [];

  const rows = payments.map((p) => {
    const visitId = (p as Record<string, unknown>).visit_id as string | null;
    const visit = Array.isArray(p.visits) ? p.visits[0] : p.visits;
    const svc = visit?.services
      ? Array.isArray(visit.services) ? visit.services[0] : visit.services
      : null;
    const pet = visit?.pets
      ? Array.isArray(visit.pets) ? visit.pets[0] : visit.pets
      : null;
    const pass = Array.isArray(p.passes) ? p.passes[0] : p.passes;
    const passCustomer = pass?.customers
      ? Array.isArray(pass.customers) ? pass.customers[0] : pass.customers
      : null;
    const hasVisit = !!visitId;
    return {
      amount: p.amount,
      method: p.method as string,
      paid_at: p.paid_at,
      serviceName: hasVisit ? (svc?.name ?? "기타") : "선불권 판매",
      petName: hasVisit ? (pet?.name ?? "") : (passCustomer?.name ?? "-"),
      hasVisit,
    };
  });

  const unusedBalance = (activePasses ?? []).reduce((s, p) => s + (p.balance ?? 0), 0);

  return (
    <ReportsClient
      payments={rows}
      reservations={(reservations ?? []).map((r) => ({
        starts_at: r.starts_at,
        status: r.status as string,
      }))}
      newPetsCount={(pets ?? []).length}
      passLogs={(passLogs ?? []).map((l) => {
        const lPass = Array.isArray(l.passes) ? l.passes[0] : l.passes;
        return {
          delta: l.delta,
          created_at: l.created_at,
          passType: (lPass?.type as string) ?? "amount",
        };
      })}
      unusedPassBalance={unusedBalance}
      today={today}
    />
  );
}
