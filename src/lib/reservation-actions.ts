"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getShopId() {
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
  return staff?.shop_id ?? null;
}

export async function createReservationAction(formData: FormData) {
  const supabase = await createClient();
  const shopId = await getShopId();
  if (!shopId) return { error: "인증이 필요합니다." };

  const petId = String(formData.get("pet_id"));
  const serviceId = String(formData.get("service_id"));
  const startsAt = String(formData.get("starts_at"));
  const endsAt = String(formData.get("ends_at"));
  const memo = formData.get("memo") ? String(formData.get("memo")) : null;
  const priceQuoted = formData.get("price_quoted")
    ? Number(formData.get("price_quoted"))
    : null;

  const { error } = await supabase.from("reservations").insert({
    shop_id: shopId,
    pet_id: petId,
    service_id: serviceId,
    starts_at: startsAt,
    ends_at: endsAt,
    memo,
    price_quoted: priceQuoted,
  });

  if (error) {
    if (error.code === "23P01") {
      return { error: "이 시간에 이미 예약이 있습니다." };
    }
    return { error: error.message };
  }

  revalidatePath("/calendar");
  return { success: true };
}

export async function updateReservationAction(formData: FormData) {
  const supabase = await createClient();
  const reservationId = String(formData.get("reservation_id"));
  const serviceId = String(formData.get("service_id"));
  const startsAt = String(formData.get("starts_at"));
  const endsAt = String(formData.get("ends_at"));
  const memo = formData.get("memo") ? String(formData.get("memo")) : null;
  const priceQuoted = formData.get("price_quoted")
    ? Number(formData.get("price_quoted"))
    : null;

  const { error } = await supabase
    .from("reservations")
    .update({
      service_id: serviceId,
      starts_at: startsAt,
      ends_at: endsAt,
      memo,
      price_quoted: priceQuoted,
    })
    .eq("id", reservationId);

  if (error) {
    if (error.code === "23P01") {
      return { error: "이 시간에 이미 예약이 있습니다." };
    }
    return { error: error.message };
  }

  revalidatePath("/calendar");
  return { success: true };
}

export async function changeReservationStatusAction(formData: FormData) {
  const supabase = await createClient();
  const reservationId = String(formData.get("reservation_id"));
  const newStatus = String(formData.get("status")) as
    | "completed"
    | "no_show"
    | "cancelled";

  const { error } = await supabase
    .from("reservations")
    .update({ status: newStatus })
    .eq("id", reservationId);

  if (error) return { error: error.message };

  revalidatePath("/calendar");
  return { success: true };
}

export async function completeWithVisitAction(formData: FormData) {
  const supabase = await createClient();
  const shopId = await getShopId();
  if (!shopId) return { error: "인증이 필요합니다." };

  const reservationId = String(formData.get("reservation_id"));
  const styleMemo = formData.get("style_memo")
    ? String(formData.get("style_memo"))
    : null;
  const behaviorMemo = formData.get("behavior_memo")
    ? String(formData.get("behavior_memo"))
    : null;

  // 예약 정보 조회
  const { data: reservation } = await supabase
    .from("reservations")
    .select("pet_id, service_id, starts_at, price_quoted")
    .eq("id", reservationId)
    .single();

  if (!reservation) return { error: "예약을 찾을 수 없습니다." };

  // 상태를 completed로 변경
  const { error: statusErr } = await supabase
    .from("reservations")
    .update({ status: "completed" })
    .eq("id", reservationId);

  if (statusErr) return { error: statusErr.message };

  // visits 행 생성
  const { error: visitErr } = await supabase.from("visits").insert({
    shop_id: shopId,
    pet_id: reservation.pet_id,
    reservation_id: reservationId,
    service_id: reservation.service_id,
    visited_at: reservation.starts_at,
    price_final: reservation.price_quoted,
    style_memo: styleMemo,
    behavior_memo: behaviorMemo,
  });

  if (visitErr) return { error: visitErr.message };

  revalidatePath("/calendar");
  revalidatePath(`/pets/${reservation.pet_id}`);
  return { success: true };
}
