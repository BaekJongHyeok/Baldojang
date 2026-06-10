import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getShopCalendarConfig, getReservations } from "@/lib/calendar-data";
import { dateToDayKey, todayKST } from "@/lib/calendar-utils";
import { CalendarClient } from "./calendar-client";
import { startOfWeek, addDays, subWeeks, addWeeks, format } from "date-fns";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const result = await getShopCalendarConfig();
  if (!result) redirect("/dashboard");
  const { config, shopId } = result;

  const today = todayKST();
  const dateStr = params.date ?? today;

  // 3주 범위 (전주 월요일 ~ 다음주 일요일)
  const baseDate = new Date(dateStr + "T00:00:00Z");
  const currentWeekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const rangeStart = subWeeks(currentWeekStart, 1);
  const rangeEnd = addWeeks(currentWeekStart, 2); // 다음주 월요일 00:00 = 이번주+다음주 끝

  // UTC ISO로 변환 (KST 00:00 = UTC 전날 15:00)
  const fromISO = new Date(
    Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), rangeStart.getUTCDate()) - 9 * 60 * 60 * 1000
  ).toISOString();
  const toISO = new Date(
    Date.UTC(rangeEnd.getUTCFullYear(), rangeEnd.getUTCMonth(), rangeEnd.getUTCDate()) - 9 * 60 * 60 * 1000
  ).toISOString();

  const reservations = await getReservations(shopId, fromISO, toISO);

  // 펫 목록 (예약 폼용)
  const supabase = await createClient();
  const { data: pets } = await supabase
    .from("pets")
    .select("id, name, breed, size, caution_tags, customer_id, customers(name, phone)")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .order("name");

  // 시술 목록 (예약 폼용)
  const { data: services } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price, sort_order")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .order("sort_order");

  // 21일 날짜 정보
  const allDays = Array.from({ length: 21 }, (_, i) => {
    const d = addDays(rangeStart, i);
    const ds = format(d, "yyyy-MM-dd");
    const dayKey = dateToDayKey(ds);
    const hours = config.openHours[dayKey] ?? null;
    return { date: ds, dayKey, hours };
  });

  const formPets = (pets ?? []).map((p) => {
    const c = Array.isArray(p.customers) ? p.customers[0] : p.customers;
    return {
      id: p.id,
      name: p.name,
      breed: p.breed,
      size: p.size as string | null,
      caution_tags: p.caution_tags,
      customer: c ? { name: c.name, phone: c.phone } : null,
    };
  });

  const formServices = (services ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    duration_minutes: s.duration_minutes,
    price: s.price as Record<string, number>,
  }));

  return (
    <CalendarClient
      reservations={reservations}
      allDays={allDays}
      config={config}
      initialDate={dateStr}
      today={today}
      pets={formPets}
      services={formServices}
    />
  );
}
