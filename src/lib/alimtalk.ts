"use server";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

// ── 템플릿 변수 구조 ──
// 카카오 알림톡 사전 승인 템플릿에 들어갈 변수
// 승인 신청 시 이 구조에 맞춰 문안 작성
type AlimtalkPayload = {
  shopName: string;
  petName: string;
  dateTime: string; // "6월 14일 (토) 10:00"
  serviceName: string;
};

// ── 메시지 문안 (카카오 템플릿 승인 후 1:1 매칭) ──
const TEMPLATES = {
  confirm: (v: AlimtalkPayload) =>
    `[${v.shopName}] 예약 확인\n\n` +
    `${v.petName} 보호자님, 예약이 확정되었습니다.\n\n` +
    `일시: ${v.dateTime}\n` +
    `시술: ${v.serviceName}\n\n` +
    `변경/취소는 매장으로 연락해주세요.`,

  reminder: (v: AlimtalkPayload) =>
    `[${v.shopName}] 내일 예약 안내\n\n` +
    `${v.petName} 보호자님, 내일 예약이 있습니다.\n\n` +
    `일시: ${v.dateTime}\n` +
    `시술: ${v.serviceName}\n\n` +
    `변경/취소는 매장으로 연락해주세요.`,
} as const;

type NotificationType = keyof typeof TEMPLATES;

const isTestMode = () => process.env.ALIMTALK_TEST_MODE !== "false";

// ── Solapi 발송 (테스트 모드: 로그+DB 기록만) ──
async function sendViaSolapi(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  if (isTestMode()) {
    console.log(`[AlimTalk TEST] to=${phone}\n${message}`);
    return { success: true };
  }

  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  if (!apiKey || !apiSecret) return { success: false, error: "Solapi credentials not configured" };

  try {
    // Solapi REST API v4
    const timestamp = Date.now().toString();
    const { createHmac, randomBytes } = await import("crypto");
    const salt = randomBytes(16).toString("hex");
    const signature = createHmac("sha256", apiSecret)
      .update(timestamp + salt)
      .digest("hex");

    const res = await fetch("https://api.solapi.com/messages/v4/send-many/detail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `HMAC-SHA256 apiKey=${apiKey}, date=${timestamp}, salt=${salt}, signature=${signature}`,
      },
      body: JSON.stringify({
        messages: [{ to: phone, from: process.env.SOLAPI_SENDER_PHONE ?? "", text: message, type: "ATA" }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `Solapi ${res.status}: ${body}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ── 알림 발송 (멱등성 보장) ──
export async function sendNotification({
  reservationId,
  shopId,
  customerId,
  type,
  recipientPhone,
  payload,
}: {
  reservationId: string;
  shopId: string;
  customerId?: string | null;
  type: NotificationType;
  recipientPhone: string;
  payload: AlimtalkPayload;
}) {
  const supabase = await createClient();

  // type, recipient_phone, payload 컬럼은 migration 0012에서 추가 — generated types 미반영
  // RPC를 쓰거나 타입 단언으로 우회

  // 멱등성 체크: 이미 발송된 동일 reservation+type이면 스킵
  const { data: existing } = await supabase
    .from("notifications")
    .select("id")
    .eq("reservation_id", reservationId)
    .eq("type" as string, type)
    .maybeSingle();

  if (existing) return { skipped: true, reason: "duplicate" };

  const message = TEMPLATES[type](payload);
  const testMode = isTestMode();

  // DB에 pending 기록
  const { data: notification, error: insertErr } = await supabase
    .from("notifications")
    .insert({
      shop_id: shopId,
      customer_id: customerId ?? null,
      reservation_id: reservationId,
      type,
      recipient_phone: recipientPhone,
      payload: payload as unknown as Json,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertErr) {
    // unique constraint 위반 = 동시 요청 중복
    if (insertErr.code === "23505") return { skipped: true, reason: "duplicate" };
    return { error: insertErr.message };
  }

  if (testMode) {
    // 테스트 모드: skipped로 기록
    await supabase.from("notifications").update({
      status: "skipped",
      payload: { ...payload, _message: message } as unknown as Json,
      sent_at: new Date().toISOString(),
    }).eq("id", notification!.id);
    return { sent: false, testMode: true };
  }

  // 실발송
  const result = await sendViaSolapi(recipientPhone, message);
  await supabase.from("notifications").update({
    status: result.success ? "sent" : "failed",
    sent_at: result.success ? new Date().toISOString() : null,
    error_msg: result.error ?? null,
  }).eq("id", notification!.id);

  return { sent: result.success, error: result.error };
}

// ── 게이트에서 걸러진 알림을 skipped로 기록 (사유 포함) ──
export async function recordSkipped({
  reservationId, shopId, type, reason,
}: {
  reservationId: string; shopId: string; type: NotificationType; reason: string;
}) {
  const supabase = await createClient();
  await supabase.from("notifications").insert({
    shop_id: shopId,
    reservation_id: reservationId,
    type,
    status: "skipped",
    error_msg: reason,
  });
}

// ── 예약 데이터로 payload 생성 ──
export async function buildPayload(shopName: string, petName: string, startsAt: string, serviceName: string): Promise<AlimtalkPayload> {
  const d = new Date(startsAt);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const month = kst.getUTCMonth() + 1;
  const day = kst.getUTCDate();
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const dow = weekdays[kst.getUTCDay()];
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const mm = String(kst.getUTCMinutes()).padStart(2, "0");
  return { shopName, petName, dateTime: `${month}월 ${day}일 (${dow}) ${hh}:${mm}`, serviceName };
}
