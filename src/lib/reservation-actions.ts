"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getStaff() {
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

  // slot_minutes 조회
  const { data: shop } = await supabase
    .from("shops")
    .select("slot_minutes")
    .eq("id", staff.shop_id)
    .single();

  return { shopId: staff.shop_id, slotMinutes: shop?.slot_minutes ?? 30 };
}

export async function createReservationAction(formData: FormData) {
  const supabase = await createClient();
  const info = await getStaff();
  if (!info) return { error: "인증이 필요합니다." };

  const petId = String(formData.get("pet_id"));
  const serviceId = String(formData.get("service_id"));
  const startsAt = String(formData.get("starts_at"));
  const endsAt = String(formData.get("ends_at"));
  const memo = formData.get("memo") ? String(formData.get("memo")) : null;
  const priceQuoted = formData.get("price_quoted")
    ? Number(formData.get("price_quoted"))
    : null;

  const { error } = await supabase.from("reservations").insert({
    shop_id: info.shopId,
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

  if (newStatus === "no_show") {
    // 노쇼: 슬롯 축소 (starts_at + 1슬롯 또는 현재 시각 올림 중 큰 값)
    const info = await getStaff();
    if (!info) return { error: "인증이 필요합니다." };

    const { data: reservation } = await supabase
      .from("reservations")
      .select("starts_at, ends_at")
      .eq("id", reservationId)
      .single();

    if (reservation) {
      const now = new Date();
      const startsAt = new Date(reservation.starts_at);
      const oneSlotEnd = new Date(
        startsAt.getTime() + info.slotMinutes * 60 * 1000,
      );
      const nowCeiled = new Date(
        Math.ceil(now.getTime() / (info.slotMinutes * 60 * 1000)) *
          (info.slotMinutes * 60 * 1000),
      );
      // 새 ends_at = max(starts_at + 1슬롯, 현재시각 올림), 원래 ends_at보다 작을 때만 축소
      const newEnd = new Date(
        Math.max(oneSlotEnd.getTime(), nowCeiled.getTime()),
      );
      const originalEnd = new Date(reservation.ends_at);

      const shrunkEnd =
        newEnd < originalEnd ? newEnd.toISOString() : reservation.ends_at;

      const { error } = await supabase
        .from("reservations")
        .update({ status: "no_show", ends_at: shrunkEnd })
        .eq("id", reservationId);

      if (error) return { error: error.message };

      revalidatePath("/calendar");
      return { success: true };
    }
  }

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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "인증이 필요합니다." };

  const { data: staff } = await supabase
    .from("staff")
    .select("shop_id")
    .eq("id", user.id)
    .single();
  if (!staff) return { error: "스태프 정보를 찾을 수 없습니다." };

  const reservationId = String(formData.get("reservation_id"));
  const actualEndsAt = formData.get("actual_ends_at")
    ? String(formData.get("actual_ends_at"))
    : null;
  const styleMemo = formData.get("style_memo")
    ? String(formData.get("style_memo"))
    : null;
  const behaviorMemo = formData.get("behavior_memo")
    ? String(formData.get("behavior_memo"))
    : null;
  const paymentAmount = formData.get("payment_amount")
    ? Number(formData.get("payment_amount"))
    : null;
  const paymentMethod = formData.get("payment_method")
    ? String(formData.get("payment_method"))
    : null;
  const skipPayment = formData.get("skip_payment") === "true";

  // 예약 정보 조회
  const { data: reservation, error: fetchErr } = await supabase
    .from("reservations")
    .select("pet_id, service_id, starts_at, ends_at, price_quoted")
    .eq("id", reservationId)
    .single();

  if (fetchErr || !reservation) {
    return { error: fetchErr?.message ?? "예약을 찾을 수 없습니다." };
  }

  const priceFinal = paymentAmount ?? reservation.price_quoted;

  // visits 행을 먼저 생성
  const { data: visit, error: visitErr } = await supabase
    .from("visits")
    .insert({
      shop_id: staff.shop_id,
      pet_id: reservation.pet_id,
      reservation_id: reservationId,
      service_id: reservation.service_id,
      visited_at: reservation.starts_at,
      price_final: priceFinal,
      style_memo: styleMemo,
      behavior_memo: behaviorMemo,
    })
    .select("id")
    .single();

  if (visitErr || !visit) {
    return { error: `방문 기록 생성 실패: ${visitErr?.message}` };
  }

  // 결제 기록 생성
  if (!skipPayment && priceFinal != null) {
    const passId = formData.get("pass_id") ? String(formData.get("pass_id")) : null;
    const passType = formData.get("pass_type") ? String(formData.get("pass_type")) : null;
    const passAmount = formData.get("pass_amount") ? Number(formData.get("pass_amount")) : 0;
    const extraMethod = formData.get("extra_method") ? String(formData.get("extra_method")) : null;
    const extraAmount = formData.get("extra_amount") ? Number(formData.get("extra_amount")) : 0;

    if (passId && passType) {
      // 선불권 차감 (원자적 RPC)
      if (passType === "amount" && passAmount > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: deductErr } = await (supabase.rpc as any)("deduct_pass_amount", {
          p_pass_id: passId,
          p_amount: passAmount,
          p_visit_id: visit.id,
          p_staff_id: user.id,
        });
        if (deductErr) return { error: `선불권 차감 실패: ${(deductErr as { message: string }).message}` };
      } else if (passType === "count") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: deductErr } = await (supabase.rpc as any)("deduct_pass_count", {
          p_pass_id: passId,
          p_visit_id: visit.id,
          p_staff_id: user.id,
        });
        if (deductErr) return { error: `횟수권 차감 실패: ${(deductErr as { message: string }).message}` };
      }

      // 선불권 결제 기록
      await supabase.from("payments").insert({
        shop_id: staff.shop_id,
        visit_id: visit.id,
        method: "pass" as const,
        amount: passType === "count" ? 0 : passAmount,
        pass_id: passId,
      });

      // 부족분 추가 결제
      if (extraMethod && extraAmount > 0) {
        await supabase.from("payments").insert({
          shop_id: staff.shop_id,
          visit_id: visit.id,
          method: extraMethod as "cash" | "card" | "transfer",
          amount: extraAmount,
        });
      }
    } else if (paymentMethod) {
      // 일반 결제
      const { error: payErr } = await supabase.from("payments").insert({
        shop_id: staff.shop_id,
        visit_id: visit.id,
        method: paymentMethod as "cash" | "card" | "transfer",
        amount: priceFinal,
      });
      if (payErr) return { error: `결제 기록 생성 실패: ${payErr.message}` };
    }
  }

  // 명시적 종료 시각으로 ends_at 업데이트
  const newEndsAt = actualEndsAt ?? reservation.ends_at;

  const { error: statusErr } = await supabase
    .from("reservations")
    .update({ status: "completed", ends_at: newEndsAt })
    .eq("id", reservationId);

  if (statusErr) {
    return { error: `상태 변경 실패: ${statusErr.message}` };
  }

  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath(`/pets/${reservation.pet_id}`);
  return { success: true };
}
