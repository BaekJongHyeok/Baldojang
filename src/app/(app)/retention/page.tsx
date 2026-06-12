import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-cache";
import { RetentionClient } from "./retention-client";

export default async function RetentionPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const shopId = ctx.staff.shopId;
  const defaultCycle = ctx.shop?.defaultCycleWeeks ?? 5;

  const supabase = await createClient();
  const now = new Date().toISOString();
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // 병렬: 펫, 방문, 미래 예약, 연락 기록
  const [petsResult, visitsResult, futureResResult, contactsResult] = await Promise.all([
    supabase
      .from("pets")
      .select("id, name, breed, size, photo_url, cycle_weeks, customer_id, customers(name, phone)")
      .eq("shop_id", shopId)
      .eq("is_active", true),
    supabase
      .from("visits")
      .select("pet_id, visited_at, services(name, recommend_cycle_weeks)")
      .eq("shop_id", shopId)
      .order("visited_at", { ascending: false }),
    supabase
      .from("reservations")
      .select("pet_id")
      .eq("shop_id", shopId)
      .eq("status", "confirmed")
      .gte("starts_at", now),
    supabase
      .from("retention_contacts")
      .select("pet_id, contacted_at")
      .gte("contacted_at", twoWeeksAgo),
  ]);

  const pets = petsResult.data ?? [];
  const visits = visitsResult.data ?? [];
  const futureSet = new Set((futureResResult.data ?? []).map((r) => r.pet_id));
  const contactedSet = new Set((contactsResult.data ?? []).map((c: { pet_id: string }) => c.pet_id));

  // pet별 마지막 visit 매핑 (주기 우선순위: 펫별 → 시술별 → 샵 기본)
  const petCycleMap: Record<string, number | null> = {};
  for (const p of pets) petCycleMap[p.id] = p.cycle_weeks;

  const lastVisitMap: Record<string, { visited_at: string; serviceName: string; cycleWeeks: number; cycleSource: string }> = {};
  for (const v of visits) {
    if (lastVisitMap[v.pet_id]) continue;
    const svc = Array.isArray(v.services) ? v.services[0] : v.services;
    const petCycle = petCycleMap[v.pet_id];
    let cycleWeeks: number;
    let cycleSource: string;
    if (petCycle != null) { cycleWeeks = petCycle; cycleSource = "펫"; }
    else if (svc?.recommend_cycle_weeks) { cycleWeeks = svc.recommend_cycle_weeks; cycleSource = "시술"; }
    else { cycleWeeks = defaultCycle; cycleSource = "기본"; }
    lastVisitMap[v.pet_id] = {
      visited_at: v.visited_at,
      serviceName: svc?.name ?? "",
      cycleWeeks,
      cycleSource,
    };
  }

  // 추천 목록 구성
  const nowMs = Date.now();
  const items = pets
    .filter((p) => !futureSet.has(p.id) && !contactedSet.has(p.id) && lastVisitMap[p.id])
    .map((p) => {
      const lv = lastVisitMap[p.id];
      const visitDate = new Date(lv.visited_at);
      const elapsedWeeks = Math.floor((nowMs - visitDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const recommendDate = new Date(visitDate.getTime() + lv.cycleWeeks * 7 * 24 * 60 * 60 * 1000);
      const daysUntil = Math.floor((recommendDate.getTime() - nowMs) / (24 * 60 * 60 * 1000));

      let status: "approaching" | "recommended" | "overdue";
      if (daysUntil > 7) return null;
      if (daysUntil >= 0) status = "approaching";
      else if (daysUntil >= -14) status = "recommended";
      else status = "overdue";

      const customer = Array.isArray(p.customers) ? p.customers[0] : p.customers;
      return {
        id: p.id, name: p.name, breed: p.breed, photoUrl: p.photo_url,
        customerName: customer?.name ?? "", customerPhone: customer?.phone ?? "",
        lastVisitDate: lv.visited_at, serviceName: lv.serviceName,
        elapsedWeeks, cycleWeeks: lv.cycleWeeks, cycleSource: lv.cycleSource, status,
      };
    })
    .filter(Boolean) as {
      id: string; name: string; breed: string | null; photoUrl: string | null;
      customerName: string; customerPhone: string; lastVisitDate: string;
      serviceName: string; elapsedWeeks: number; cycleWeeks: number;
      cycleSource: string; status: "approaching" | "recommended" | "overdue";
    }[];

  const order = { overdue: 0, recommended: 1, approaching: 2 };
  items.sort((a, b) => order[a.status] - order[b.status] || b.elapsedWeeks - a.elapsedWeeks);

  return <RetentionClient items={items} />;
}
