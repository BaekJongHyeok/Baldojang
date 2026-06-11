import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { todayKST } from "@/lib/calendar-utils";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, eachDayOfInterval } from "date-fns";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; range?: string }>;
}) {
  const params = await searchParams;
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
  const range = params.range ?? "week";

  let from: string, to: string;
  const baseDate = new Date(today + "T00:00:00Z");

  if (params.from && params.to) {
    from = params.from;
    to = params.to;
  } else if (range === "today") {
    from = today;
    to = today;
  } else if (range === "month") {
    from = format(startOfMonth(baseDate), "yyyy-MM-dd");
    to = format(endOfMonth(baseDate), "yyyy-MM-dd");
  } else {
    from = format(startOfWeek(baseDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
    to = format(endOfWeek(baseDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
  }

  const fromISO = new Date(from + "T00:00:00+09:00").toISOString();
  const toISO = new Date(to + "T23:59:59+09:00").toISOString();

  // 결제 데이터 조회
  const { data: payments } = await supabase
    .from("payments")
    .select("amount, method, paid_at, visits(services(name))")
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
    };
  });

  // 집계
  const totalRevenue = rows.reduce((s, r) => s + r.amount, 0);
  const avgPerVisit = rows.length > 0 ? Math.round(totalRevenue / rows.length) : 0;

  // 시술별
  const byService: Record<string, { count: number; revenue: number }> = {};
  for (const r of rows) {
    if (!byService[r.serviceName]) byService[r.serviceName] = { count: 0, revenue: 0 };
    byService[r.serviceName].count++;
    byService[r.serviceName].revenue += r.amount;
  }
  const serviceStats = Object.entries(byService)
    .map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.revenue - a.revenue);

  // 수단별
  const byMethod: Record<string, number> = {};
  for (const r of rows) {
    byMethod[r.method] = (byMethod[r.method] ?? 0) + r.amount;
  }
  const methodLabels: Record<string, string> = { card: "카드", cash: "현금", transfer: "계좌이체", pass: "선불권" };

  // 일별 추이
  const days = eachDayOfInterval({
    start: new Date(from + "T00:00:00Z"),
    end: new Date(to + "T00:00:00Z"),
  });
  const dailyMap: Record<string, number> = {};
  for (const r of rows) {
    const d = new Date(r.paid_at);
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    const dateKey = format(kst, "yyyy-MM-dd");
    dailyMap[dateKey] = (dailyMap[dateKey] ?? 0) + r.amount;
  }
  const dailyData = days.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    return { date: key, label: format(d, "M/d"), amount: dailyMap[key] ?? 0 };
  });
  const maxDaily = Math.max(1, ...dailyData.map((d) => d.amount));

  return (
    <ReportsClient
      range={range}
      from={from}
      to={to}
      totalRevenue={totalRevenue}
      totalCount={rows.length}
      avgPerVisit={avgPerVisit}
      serviceStats={serviceStats}
      methodStats={Object.entries(byMethod).map(([method, amount]) => ({
        method,
        label: methodLabels[method] ?? method,
        amount,
      }))}
      dailyData={dailyData}
      maxDaily={maxDaily}
    />
  );
}
