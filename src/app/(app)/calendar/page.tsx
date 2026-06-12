import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getReservations } from "@/lib/calendar-data";
import { dateToDayKey, todayKST } from "@/lib/calendar-utils";
import { getAuthContext } from "@/lib/auth-cache";
import { CalendarClient } from "./calendar-client";
import { startOfWeek, addDays, subWeeks, addWeeks, format } from "date-fns";
import type { Json } from "@/types/database";

type DayHours = { open: string; close: string };
type OpenHours = Record<string, DayHours>;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const [params, ctx] = await Promise.all([searchParams, getAuthContext()]);
  if (!ctx?.shop) redirect("/dashboard");
  const shopId = ctx.staff.shopId;

  const raw = ctx.shop.openHours as Json;
  const openHours: OpenHours = typeof raw === "object" && raw !== null && !Array.isArray(raw) ? (raw as OpenHours) : {};
  const config = { openHours, slotMinutes: ctx.shop.slotMinutes };

  const today = todayKST();
  const dateStr = params.date ?? today;

  const baseDate = new Date(dateStr + "T00:00:00Z");
  const currentWeekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const rangeStart = subWeeks(currentWeekStart, 1);
  const rangeEnd = addWeeks(currentWeekStart, 2);

  const fromISO = new Date(
    Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), rangeStart.getUTCDate()) - 9 * 60 * 60 * 1000
  ).toISOString();
  const toISO = new Date(
    Date.UTC(rangeEnd.getUTCFullYear(), rangeEnd.getUTCMonth(), rangeEnd.getUTCDate()) - 9 * 60 * 60 * 1000
  ).toISOString();

  const supabase = await createClient();

  // 병렬: 예약, 펫, 시술, 선불권
  const [reservations, petsResult, servicesResult, passesResult] = await Promise.all([
    getReservations(shopId, fromISO, toISO),
    supabase
      .from("pets")
      .select("id, name, breed, size, caution_tags, customer_id, customers(id, name, phone)")
      .eq("shop_id", shopId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("services")
      .select("id, name, duration_minutes, price, sort_order")
      .eq("shop_id", shopId)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("passes")
      .select("id, type, name, balance, remaining, expires_at, customer_id")
      .eq("shop_id", shopId)
      .or("expires_at.is.null,expires_at.gte." + new Date().toISOString().slice(0, 10)),
  ]);

  const allDays = Array.from({ length: 21 }, (_, i) => {
    const d = addDays(rangeStart, i);
    const ds = format(d, "yyyy-MM-dd");
    const dayKey = dateToDayKey(ds);
    const hours = openHours[dayKey] ?? null;
    return { date: ds, dayKey, hours };
  });

  const formPets = (petsResult.data ?? []).map((p) => {
    const c = Array.isArray(p.customers) ? p.customers[0] : p.customers;
    return {
      id: p.id, name: p.name, breed: p.breed,
      size: p.size as string | null, caution_tags: p.caution_tags,
      customer: c ? { id: c.id, name: c.name, phone: c.phone } : null,
    };
  });

  const formServices = (servicesResult.data ?? []).map((s) => ({
    id: s.id, name: s.name, duration_minutes: s.duration_minutes,
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
      passes={(passesResult.data ?? []).map((p) => ({
        id: p.id, type: p.type as string, name: p.name,
        balance: p.balance, remaining: p.remaining,
        expires_at: p.expires_at, customerId: p.customer_id,
      }))}
    />
  );
}
