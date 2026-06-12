import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PetListClient } from "./pet-list";
import { getPetPhotoUrls } from "@/lib/storage";
import { getPassStatus } from "@/lib/utils";
import { todayKST, kstHourMin } from "@/lib/calendar-utils";

export default async function PetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase
    .from("staff")
    .select("shop_id")
    .eq("id", user.id)
    .single();
  if (!staff) redirect("/dashboard");

  // 샵의 전체 펫 로드 (활성+비활성 모두, 클라이언트에서 필터)
  const { data: pets } = await supabase
    .from("pets")
    .select("id, name, breed, size, photo_url, caution_tags, is_active, customer_id, customers(name, phone)")
    .eq("shop_id", staff.shop_id)
    .order("created_at", { ascending: false });

  // 마지막 방문일 조회
  const petIds = (pets ?? []).map((p) => p.id);
  let lastVisitMap: Record<string, string> = {};
  if (petIds.length > 0) {
    const { data: visits } = await supabase
      .from("visits")
      .select("pet_id, visited_at")
      .in("pet_id", petIds)
      .order("visited_at", { ascending: false });
    if (visits) {
      for (const v of visits) {
        if (!lastVisitMap[v.pet_id]) lastVisitMap[v.pet_id] = v.visited_at;
      }
    }
  }

  // signed URL 일괄 생성
  const photoPaths = (pets ?? [])
    .map((p) => p.photo_url)
    .filter((u): u is string => !!u);
  const photoUrlMap = await getPetPhotoUrls(photoPaths);

  const allPets = (pets ?? []).map((p) => ({
    ...p,
    photoSignedUrl: p.photo_url ? (photoUrlMap[p.photo_url] ?? null) : null,
    lastVisit: lastVisitMap[p.id] ?? null,
  }));

  // 보호자 목록 (중복 제거 + 펫 이름/선불권 합산)
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, phone, created_at")
    .eq("shop_id", staff.shop_id)
    .order("created_at", { ascending: false });

  const { data: passes } = await supabase
    .from("passes")
    .select("customer_id, type, balance, remaining, expires_at")
    .eq("shop_id", staff.shop_id);

  // 보호자별 펫 이름 목록
  const customerPetsMap: Record<string, string[]> = {};
  for (const p of pets ?? []) {
    if (!p.is_active) continue;
    if (!customerPetsMap[p.customer_id]) customerPetsMap[p.customer_id] = [];
    customerPetsMap[p.customer_id].push(p.name);
  }

  // 보호자별 선불권: "패스 보유 여부" + "active 잔액 합산" 분리
  const customersWithPasses = new Set<string>();
  const customerPassMap: Record<string, { amount: number; count: number }> = {};
  for (const p of passes ?? []) {
    customersWithPasses.add(p.customer_id);
    const status = getPassStatus(p);
    if (status !== "active") continue;
    if (!customerPassMap[p.customer_id]) customerPassMap[p.customer_id] = { amount: 0, count: 0 };
    if (p.type === "amount") customerPassMap[p.customer_id].amount += p.balance ?? 0;
    else customerPassMap[p.customer_id].count += p.remaining ?? 0;
  }

  const allCustomers = (customers ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    createdAt: c.created_at,
    petNames: customerPetsMap[c.id] ?? [],
    // null = 패스 없음, { amount: 0, count: 0 } = 패스 있으나 잔액 0
    passBalance: customersWithPasses.has(c.id)
      ? (customerPassMap[c.id] ?? { amount: 0, count: 0 })
      : null,
  }));

  // 오늘 예약 펫 (confirmed, 현재 시각 이후만, KST 기준)
  const now = new Date().toISOString();
  const todayStr = todayKST();
  const todayEndIso = new Date(todayStr + "T23:59:59+09:00").toISOString();
  const { data: todayRes } = await supabase
    .from("reservations")
    .select("id, starts_at, pet_id, pets(id, name, photo_url)")
    .eq("shop_id", staff.shop_id)
    .eq("status", "confirmed")
    .gte("starts_at", now)
    .lte("starts_at", todayEndIso)
    .order("starts_at", { ascending: true });

  const todayPets = (todayRes ?? []).map((r) => {
    const pet = Array.isArray(r.pets) ? r.pets[0] : r.pets;
    const { hours, minutes } = kstHourMin(r.starts_at);
    const time = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    return {
      petId: pet?.id ?? r.pet_id,
      name: pet?.name ?? "",
      photoSignedUrl: pet?.photo_url ? (photoUrlMap[pet.photo_url] ?? null) : null,
      time,
    };
  });

  return <PetListClient pets={allPets} customers={allCustomers} todayPets={todayPets} />;
}
