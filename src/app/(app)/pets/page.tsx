import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PetListClient } from "./pet-list";
import { getPetPhotoUrls } from "@/lib/storage";
import { getPassStatus } from "@/lib/utils";
import { todayKST, kstHourMin } from "@/lib/calendar-utils";
import { getAuthContext } from "@/lib/auth-cache";

export default async function PetsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const shopId = ctx.staff.shopId;

  const supabase = await createClient();

  // 1차 병렬: 펫, 보호자, 선불권, 오늘 예약
  const now = new Date().toISOString();
  const todayStr = todayKST();
  const todayEndIso = new Date(todayStr + "T23:59:59+09:00").toISOString();

  const [petsResult, customersResult, passesResult, todayResResult] = await Promise.all([
    supabase
      .from("pets")
      .select("id, name, breed, size, photo_url, caution_tags, is_active, customer_id, customers(name, phone)")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false }),
    supabase
      .from("customers")
      .select("id, name, phone, created_at")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false }),
    supabase
      .from("passes")
      .select("customer_id, type, balance, remaining, expires_at")
      .eq("shop_id", shopId),
    supabase
      .from("reservations")
      .select("id, starts_at, pet_id, pets(id, name, photo_url)")
      .eq("shop_id", shopId)
      .eq("status", "confirmed")
      .gte("starts_at", now)
      .lte("starts_at", todayEndIso)
      .order("starts_at", { ascending: true }),
  ]);

  const pets = petsResult.data ?? [];
  const petIds = pets.map((p) => p.id);

  // 2차 병렬: 방문 이력 + signed URL (펫 데이터에 의존)
  const photoPaths = pets.map((p) => p.photo_url).filter((u): u is string => !!u);
  const [visitsResult, photoUrlMap] = await Promise.all([
    petIds.length > 0
      ? supabase.from("visits").select("pet_id, visited_at").in("pet_id", petIds).order("visited_at", { ascending: false })
      : Promise.resolve({ data: [] as { pet_id: string; visited_at: string }[] }),
    getPetPhotoUrls(photoPaths),
  ]);

  const lastVisitMap: Record<string, string> = {};
  for (const v of visitsResult.data ?? []) {
    if (!lastVisitMap[v.pet_id]) lastVisitMap[v.pet_id] = v.visited_at;
  }

  const allPets = pets.map((p) => ({
    ...p,
    photoSignedUrl: p.photo_url ? (photoUrlMap[p.photo_url] ?? null) : null,
    lastVisit: lastVisitMap[p.id] ?? null,
  }));

  // 보호자별 펫 이름
  const customerPetsMap: Record<string, string[]> = {};
  for (const p of pets) {
    if (!p.is_active) continue;
    if (!customerPetsMap[p.customer_id]) customerPetsMap[p.customer_id] = [];
    customerPetsMap[p.customer_id].push(p.name);
  }

  // 보호자별 선불권
  const passes = passesResult.data ?? [];
  const customersWithPasses = new Set<string>();
  const customerPassMap: Record<string, { amount: number; count: number }> = {};
  for (const p of passes) {
    customersWithPasses.add(p.customer_id);
    const status = getPassStatus(p);
    if (status !== "active") continue;
    if (!customerPassMap[p.customer_id]) customerPassMap[p.customer_id] = { amount: 0, count: 0 };
    if (p.type === "amount") customerPassMap[p.customer_id].amount += p.balance ?? 0;
    else customerPassMap[p.customer_id].count += p.remaining ?? 0;
  }

  const allCustomers = (customersResult.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    createdAt: c.created_at,
    petNames: customerPetsMap[c.id] ?? [],
    passBalance: customersWithPasses.has(c.id)
      ? (customerPassMap[c.id] ?? { amount: 0, count: 0 })
      : null,
  }));

  // 오늘 예약 칩
  const todayPets = (todayResResult.data ?? []).map((r) => {
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

  return <PetListClient pets={allPets} customers={allCustomers} todayPets={todayPets} initialTab={sp.tab === "customer" ? "customer" : "pet"} />;
}
