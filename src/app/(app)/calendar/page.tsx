import { redirect } from "next/navigation";
import {
  getShopCalendarConfig,
  getReservations,
  dateToDayKey,
} from "@/lib/calendar-data";
import { CalendarClient } from "./calendar-client";
import {
  startOfWeek,
  endOfWeek,
  format,
  addDays,
} from "date-fns";

function toKSTDateStr(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const result = await getShopCalendarConfig();
  if (!result) redirect("/dashboard");
  const { config, shopId } = result;

  // 기준 날짜 (KST)
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const todayStr = toKSTDateStr(kstNow);
  const dateStr = params.date ?? todayStr;

  // 주간 범위 (월요일 시작)
  const baseDate = new Date(dateStr + "T00:00:00+09:00");
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 });

  const fromISO = new Date(weekStart.getTime() - 9 * 60 * 60 * 1000).toISOString();
  const toISO = new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000 - 9 * 60 * 60 * 1000).toISOString();

  const reservations = await getReservations(shopId, fromISO, toISO);

  // 주간 날짜 목록 + 요일별 영업시간
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const ds = toKSTDateStr(d);
    const dayKey = dateToDayKey(ds);
    const hours = config.openHours[dayKey] ?? null;
    return { date: ds, dayKey, hours };
  });

  return (
    <CalendarClient
      reservations={reservations}
      weekDays={weekDays}
      config={config}
      currentDate={dateStr}
      today={todayStr}
    />
  );
}
