import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RetentionClient } from "./retention-client";

export default async function RetentionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase
    .from("staff")
    .select("shop_id")
    .eq("id", user.id)
    .single();
  if (!staff) redirect("/dashboard");

  // 샵 기본 주기
  const defaultCycle = 5; // 0005 마이그레이션 후 shops.default_cycle_weeks에서 조회

  // 활성 펫 + 마지막 visit + 시술 + 보호자
  const { data: pets } = await supabase
    .from("pets")
    .select("id, name, breed, size, photo_url, customer_id, customers(name, phone)")
    .eq("shop_id", staff.shop_id)
    .eq("is_active", true);

  // 마지막 완료 visit (pet별)
  const { data: visits } = await supabase
    .from("visits")
    .select("pet_id, visited_at, services(name, recommend_cycle_weeks)")
    .eq("shop_id", staff.shop_id)
    .order("visited_at", { ascending: false });

  // 미래 confirmed 예약
  const now = new Date().toISOString();
  const { data: futureRes } = await supabase
    .from("reservations")
    .select("pet_id")
    .eq("shop_id", staff.shop_id)
    .eq("status", "confirmed")
    .gte("starts_at", now);

  const futureSet = new Set((futureRes ?? []).map((r) => r.pet_id));

  // 최근 연락 기록 (2주 이내)
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  // retention_contacts (0005 마이그레이션 후 사용 가능)
  let contacts: { pet_id: string }[] = [];
  try {
    const { data } = await (supabase as any).from("retention_contacts").select("pet_id, contacted_at").gte("contacted_at", twoWeeksAgo);
    contacts = data ?? [];
  } catch { /* 테이블 미생성 시 무시 */ }

  const contactedSet = new Set((contacts ?? []).map((c) => c.pet_id));

  // pet별 마지막 visit 매핑
  const lastVisitMap: Record<string, { visited_at: string; serviceName: string; cycleWeeks: number }> = {};
  for (const v of visits ?? []) {
    if (lastVisitMap[v.pet_id]) continue;
    const svc = Array.isArray(v.services) ? v.services[0] : v.services;
    lastVisitMap[v.pet_id] = {
      visited_at: v.visited_at,
      serviceName: svc?.name ?? "",
      cycleWeeks: svc?.recommend_cycle_weeks ?? defaultCycle,
    };
  }

  // 추천 목록 구성
  const nowMs = Date.now();
  const items = (pets ?? [])
    .filter((p) => !futureSet.has(p.id) && !contactedSet.has(p.id) && lastVisitMap[p.id])
    .map((p) => {
      const lv = lastVisitMap[p.id];
      const visitDate = new Date(lv.visited_at);
      const elapsedWeeks = Math.floor((nowMs - visitDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const recommendDate = new Date(visitDate.getTime() + lv.cycleWeeks * 7 * 24 * 60 * 60 * 1000);
      const daysUntil = Math.floor((recommendDate.getTime() - nowMs) / (24 * 60 * 60 * 1000));

      let status: "approaching" | "recommended" | "overdue";
      if (daysUntil > 7) return null; // 아직 멀음
      if (daysUntil >= 0) status = "approaching";
      else if (daysUntil >= -14) status = "recommended";
      else status = "overdue";

      const customer = Array.isArray(p.customers) ? p.customers[0] : p.customers;
      return {
        id: p.id,
        name: p.name,
        breed: p.breed,
        photoUrl: p.photo_url,
        customerName: customer?.name ?? "",
        customerPhone: customer?.phone ?? "",
        lastVisitDate: lv.visited_at,
        serviceName: lv.serviceName,
        elapsedWeeks,
        cycleWeeks: lv.cycleWeeks,
        status,
      };
    })
    .filter(Boolean) as {
      id: string; name: string; breed: string | null; photoUrl: string | null;
      customerName: string; customerPhone: string; lastVisitDate: string;
      serviceName: string; elapsedWeeks: number; cycleWeeks: number;
      status: "approaching" | "recommended" | "overdue";
    }[];

  // 정렬: overdue → recommended → approaching
  const order = { overdue: 0, recommended: 1, approaching: 2 };
  items.sort((a, b) => order[a.status] - order[b.status] || b.elapsedWeeks - a.elapsedWeeks);

  return <RetentionClient items={items} />;
}
