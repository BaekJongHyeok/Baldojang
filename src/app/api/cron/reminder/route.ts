import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendNotification, buildPayload } from "@/lib/alimtalk";
import { formatInTimeZone } from "date-fns-tz";
import { addDays } from "date-fns";

// Vercel Cron: 매일 09:00 UTC (= 18:00 KST) 실행
// Hobby 플랜: 지정 시간대 내 임의 시각(±최대 59분) 실행 — 리마인드 용도엔 무방
// Pro 전환 시 정각 보장
//
// [베타 안전성] ALIMTALK_UI_ENABLED(features.ts)와 무관하게 동작합니다.
// UI가 꺼져 있어도 이 cron은 실행되며, ALIMTALK_TEST_MODE 기본값(true)에 의해
// 실발송 없이 skipped 레코드만 축적합니다. 카카오 채널 승인 후 TEST_MODE=false로
// 전환하면 실발송이 시작됩니다.

const KST = "Asia/Seoul";

export async function GET(request: Request) {
  // Vercel Cron 표준 인증: Authorization: Bearer ${CRON_SECRET}
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // service role 키로 RLS 우회 (cron은 사용자 세션 없음)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not set" }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  // KST 기준 익일 날짜 (date-fns-tz로 정확한 시간대 변환)
  const now = new Date();
  const todayKST = formatInTimeZone(now, KST, "yyyy-MM-dd");
  const tomorrowKST = formatInTimeZone(addDays(new Date(todayKST + "T00:00:00+09:00"), 1), KST, "yyyy-MM-dd");
  // 익일 KST 0시~24시 범위 (timestamptz로 정확한 경계)
  const tomorrowStart = `${tomorrowKST}T00:00:00+09:00`;
  const tomorrowEnd = `${tomorrowKST}T23:59:59+09:00`;

  // 알림 활성화된 샵의 익일 confirmed 예약 조회
  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("id, shop_id, starts_at, status, pets(name, customer_id, customers(phone)), services(name), shops!inner(name, notification_enabled)")
    .eq("status", "confirmed")
    .gte("starts_at", tomorrowStart)
    .lte("starts_at", tomorrowEnd)
    .eq("shops.notification_enabled", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const r of reservations ?? []) {
    const pet = Array.isArray(r.pets) ? r.pets[0] : r.pets;
    const service = Array.isArray(r.services) ? r.services[0] : r.services;
    const shop = Array.isArray(r.shops) ? r.shops[0] : r.shops;
    const customer = pet?.customers
      ? (Array.isArray(pet.customers) ? pet.customers[0] : pet.customers)
      : null;

    if (!customer?.phone || !pet || !shop) { skipped++; continue; }

    const payload = await buildPayload(shop.name, pet.name, r.starts_at, service?.name ?? "시술");
    const result = await sendNotification({
      reservationId: r.id,
      shopId: r.shop_id,
      customerId: pet.customer_id,
      type: "reminder",
      recipientPhone: customer.phone,
      payload,
      supabaseClient: supabase,
    });

    if (result.skipped) skipped++;
    else if (result.error) failed++;
    else sent++;
  }

  return NextResponse.json({
    todayKST,
    tomorrowTarget: tomorrowKST,
    total: reservations?.length ?? 0,
    sent,
    skipped,
    failed,
  });
}
