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

  if (!reservationId || !serviceId || !startsAt || !endsAt) {
    return { error: "필수 항목이 누락되었습니다." };
  }

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
    | "confirmed"
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

  if (error) {
    if (error.code === "23P01") return { error: "해당 시간에 이미 다른 예약이 있어 되돌릴 수 없어요." };
    return { error: error.message };
  }

  revalidatePath("/calendar");
  return { success: true };
}

export async function deleteReservationAction(formData: FormData) {
  const supabase = await createClient();
  const reservationId = String(formData.get("reservation_id"));

  const { data: reservation } = await supabase
    .from("reservations")
    .select("status")
    .eq("id", reservationId)
    .single();

  if (!reservation) return { error: "예약을 찾을 수 없어요." };

  // 연결된 visit이 있으면 삭제 불가 (결제·방문 기록 정합성)
  const { count } = await supabase.from("visits").select("id", { count: "exact", head: true }).eq("reservation_id", reservationId);
  if (count && count > 0) return { error: "방문 기록이 있는 예약은 삭제할 수 없어요." };

  const { error } = await supabase
    .from("reservations")
    .delete()
    .eq("id", reservationId);

  if (error) return { error: error.message };

  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function revertCompletionAction(formData: FormData) {
  const supabase = await createClient();
  const reservationId = String(formData.get("reservation_id"));

  // 1. 예약 확인
  const { data: reservation } = await supabase
    .from("reservations")
    .select("status")
    .eq("id", reservationId)
    .single();
  if (!reservation) return { error: "예약을 찾을 수 없어요." };
  if (reservation.status !== "completed") return { error: "완료 상태의 예약만 되돌릴 수 있어요." };

  // 2. 연결된 visit 조회
  const { data: visit } = await supabase
    .from("visits")
    .select("id, before_photos, after_photos")
    .eq("reservation_id", reservationId)
    .single();

  if (visit) {
    // 3. 선불권 차감 복원: pass_logs에서 해당 visit의 차감 기록 조회 후 잔액 복원
    const { data: passLogs } = await supabase
      .from("pass_logs")
      .select("id, pass_id, delta")
      .eq("visit_id", visit.id);

    // 선불권 잔액/횟수 복원
    for (const log of passLogs ?? []) {
      const restoreAmount = Math.abs(log.delta);
      if (restoreAmount <= 0) continue;
      const { data: pass } = await supabase.from("passes").select("type, balance, remaining").eq("id", log.pass_id).single();
      if (pass) {
        if (pass.type === "amount") {
          await supabase.from("passes").update({ balance: (pass.balance ?? 0) + restoreAmount }).eq("id", log.pass_id);
        } else {
          // 횟수권: remaining +1 (회차), balance += delta 금액 (원)
          await supabase.from("passes").update({
            remaining: (pass.remaining ?? 0) + 1,
            balance: (pass.balance ?? 0) + restoreAmount,
          }).eq("id", log.pass_id);
        }
      }
    }
    // pass_logs 삭제
    if (passLogs && passLogs.length > 0) {
      await supabase.from("pass_logs").delete().in("id", passLogs.map((l) => l.id));
    }

    // 4. payments 삭제
    await supabase.from("payments").delete().eq("visit_id", visit.id);

    // 5. 사진 스토리지 정리
    const allPhotos = [...(visit.before_photos ?? []), ...(visit.after_photos ?? [])];
    if (allPhotos.length > 0) {
      await supabase.storage.from("visit-photos").remove(allPhotos);
    }

    // 6. visit 삭제
    await supabase.from("visits").delete().eq("id", visit.id);
  }

  // 7. 예약 상태 confirmed로 복귀
  const { error } = await supabase
    .from("reservations")
    .update({ status: "confirmed" })
    .eq("id", reservationId);

  if (error) {
    if (error.code === "23P01") return { error: "해당 시간에 이미 다른 예약이 있어 되돌릴 수 없어요." };
    return { error: error.message };
  }

  revalidatePath("/calendar");
  revalidatePath("/dashboard");
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
  // skip_payment 경로 제거됨 — 완료 시 항상 결제 기록 동반

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
      actual_ends_at: actualEndsAt,
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
  {
    const passId = String(formData.get("pass_id") ?? "");
    const passType = String(formData.get("pass_type") ?? "");
    const passAmount = Number(formData.get("pass_amount") ?? 0);
    const extraMethod = String(formData.get("extra_method") ?? "");
    const extraAmount = Number(formData.get("extra_amount") ?? 0);

    if (passId && passType) {
      // 선불권 차감 (원자적 RPC)
      let deductedAmount = passAmount;
      if (passType === "amount") {
        if (passAmount <= 0) return { error: "차감 금액이 0입니다." };
        const { error: deductErr } = await supabase.rpc("deduct_pass_amount", {
          p_pass_id: passId,
          p_amount: passAmount,
          p_visit_id: visit.id,
        });
        if (deductErr) return { error: `선불권 차감 실패: ${deductErr.message}` };
      } else if (passType === "count") {
        const { data: unitPrice, error: deductErr } = await supabase.rpc("deduct_pass_count", {
          p_pass_id: passId,
          p_visit_id: visit.id,
        });
        if (deductErr) return { error: `횟수권 차감 실패: ${deductErr.message}` };
        deductedAmount = unitPrice ?? 0;
      }

      // 선불권 결제 기록
      const { error: passPayErr } = await supabase.from("payments").insert({
        shop_id: staff.shop_id,
        visit_id: visit.id,
        method: "pass" as const,
        amount: deductedAmount,
        pass_id: passId,
      });
      if (passPayErr) return { error: `선불권 결제 기록 실패: ${passPayErr.message}` };

      // 부족분 추가 결제
      if (extraMethod && extraAmount > 0) {
        const { error: extraPayErr } = await supabase.from("payments").insert({
          shop_id: staff.shop_id,
          visit_id: visit.id,
          method: extraMethod as "cash" | "card" | "transfer",
          amount: extraAmount,
        });
        if (extraPayErr) return { error: `추가 결제 기록 실패: ${extraPayErr.message}` };
      }
    } else if (paymentMethod && priceFinal != null) {
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

  // reservation의 starts_at/ends_at은 "예약된 시간" — 완료 처리에서 수정하지 않음
  const { error: statusErr } = await supabase
    .from("reservations")
    .update({ status: "completed" })
    .eq("id", reservationId);

  if (statusErr) {
    return { error: `상태 변경 실패: ${statusErr.message}` };
  }

  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath(`/pets/${reservation.pet_id}`);
  return { success: true, visitId: visit.id };
}
