import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export type DayHours = { open: string; close: string };
export type OpenHours = Record<string, DayHours>;

export type CalendarReservation = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: "confirmed" | "completed" | "no_show" | "cancelled";
  memo: string | null;
  price_quoted: number | null;
  pet: { id: string; name: string; photo_url: string | null; caution_tags: string[] };
  service: { name: string; duration_minutes: number };
  customer: { id: string; name: string; phone: string } | null;
  /** 완료 시 기록된 실제 종료 시각 (visit.actual_ends_at). 미완료이거나 과거 데이터면 null. */
  visit_ends_at: string | null;
};

export type ShopCalendarConfig = {
  openHours: OpenHours;
  slotMinutes: number;
};

/** 샵 캘린더 설정 (영업시간, 슬롯) 조회 */
export async function getShopCalendarConfig(): Promise<{
  config: ShopCalendarConfig;
  shopId: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: staff } = await supabase
    .from("staff")
    .select("shop_id")
    .eq("id", user.id)
    .single();
  if (!staff) return null;

  const { data: shop } = await supabase
    .from("shops")
    .select("open_hours, slot_minutes")
    .eq("id", staff.shop_id)
    .single();
  if (!shop) return null;

  const raw = shop.open_hours as Json;
  const openHours: OpenHours =
    typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? (raw as OpenHours)
      : {};

  return {
    config: { openHours, slotMinutes: shop.slot_minutes },
    shopId: staff.shop_id,
  };
}

/** 기간 내 예약 조회 (조인 포함) */
export async function getReservations(
  shopId: string,
  from: string, // ISO datetime
  to: string,
): Promise<CalendarReservation[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("reservations")
    .select(
      "id, starts_at, ends_at, status, memo, price_quoted, pets(id, name, photo_url, caution_tags, customers(id, name, phone)), services(name, duration_minutes), visits(actual_ends_at)",
    )
    .eq("shop_id", shopId)
    .gte("starts_at", from)
    .lt("starts_at", to)
    .order("starts_at", { ascending: true });

  if (!data) return [];

  // pet photo signed URL 일괄 생성
  const photoPaths = [...new Set(data.map((r) => {
    const pet = Array.isArray(r.pets) ? r.pets[0] : r.pets;
    return pet?.photo_url;
  }).filter(Boolean) as string[])];
  let photoUrlMap: Record<string, string> = {};
  if (photoPaths.length > 0) {
    const { data: signed } = await supabase.storage.from("pet-photos").createSignedUrls(photoPaths, 3600);
    if (signed) for (const s of signed) { if (s.signedUrl && s.path) photoUrlMap[s.path] = s.signedUrl; }
  }

  return data.map((r) => {
    const pet = Array.isArray(r.pets) ? r.pets[0] : r.pets;
    const service = Array.isArray(r.services) ? r.services[0] : r.services;
    const customer = pet?.customers
      ? Array.isArray(pet.customers)
        ? pet.customers[0]
        : pet.customers
      : null;
    const visit = Array.isArray(r.visits) ? r.visits[0] : r.visits;
    return {
      id: r.id,
      starts_at: r.starts_at,
      ends_at: r.ends_at,
      price_quoted: r.price_quoted,
      status: r.status,
      memo: r.memo,
      pet: { id: pet?.id ?? "", name: pet?.name ?? "", photo_url: pet?.photo_url ? (photoUrlMap[pet.photo_url] ?? null) : null, caution_tags: pet?.caution_tags ?? [] },
      service: { name: service?.name ?? "", duration_minutes: service?.duration_minutes ?? 60 },
      customer,
      visit_ends_at: visit?.actual_ends_at ?? null,
    };
  });
}
