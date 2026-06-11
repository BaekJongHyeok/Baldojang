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

  const { data: payments } = await supabase
    .from("payments")
    .select("amount, method, paid_at, visit_id, visits(services(name))")
    .eq("shop_id", staff.shop_id)
    .gte("paid_at", fromISO)
    .lte("paid_at", toISO)
    .order("paid_at");

  const rows = (payments ?? []).map((p) => {
    const visit = Array.isArray(p.visits) ? p.visits[0] : p.visits;
    const svc = visit?.services
      ? Array.isArray(visit.services) ? visit.services[0] : visit.services
      : null;
    return {
      amount: p.amount,
      method: p.method as string,
      paid_at: p.paid_at,
      serviceName: svc?.name ?? "기타",
      hasVisit: !!(p as Record<string, unknown>).visit_id,
    };
  });

  return <ReportsClient payments={rows} today={today} />;
}
