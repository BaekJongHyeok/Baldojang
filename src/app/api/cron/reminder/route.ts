import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendNotification, buildPayload } from "@/lib/alimtalk";

// Vercel Cron: 매일 KST 기준 리마인드 시각에 실행
// vercel.json에서 cron schedule 설정

export async function GET(request: Request) {
  // Vercel Cron 인증
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

  // 익일 날짜 (KST)
  const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const tomorrow = new Date(nowKST);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  const tomorrowStart = `${tomorrowStr}T00:00:00+09:00`;
  const tomorrowEnd = `${tomorrowStr}T23:59:59+09:00`;

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
    });

    if (result.skipped) skipped++;
    else if (result.error) failed++;
    else sent++;
  }

  return NextResponse.json({
    date: tomorrowStr,
    total: reservations?.length ?? 0,
    sent,
    skipped,
    failed,
  });
}
