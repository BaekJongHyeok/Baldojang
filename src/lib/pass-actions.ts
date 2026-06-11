"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getStaffInfo() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: staff } = await supabase
    .from("staff")
    .select("shop_id")
    .eq("id", user.id)
    .single();
  if (!staff) return null;
  return { userId: user.id, shopId: staff.shop_id };
}

export async function createPassAction(formData: FormData) {
  const supabase = await createClient();
  const info = await getStaffInfo();
  if (!info) return { error: "인증이 필요합니다." };

  const customerId = String(formData.get("customer_id"));
  const type = String(formData.get("type")) as "amount" | "count";
  const name = String(formData.get("name"));
  const validityMonths = Number(formData.get("validity_months")) || 0;

  const expiresAt = validityMonths > 0
    ? new Date(Date.now() + validityMonths * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : null;

  const chargeAmount = Number(formData.get("charge_amount")) || 0;
  const bonusAmount = Number(formData.get("bonus_amount")) || 0;
  const totalCount = Number(formData.get("total_count")) || 0;

  const { data: pass, error: passErr } = await supabase
    .from("passes")
    .insert({
      shop_id: info.shopId,
      customer_id: customerId,
      type,
      name,
      total_amount: type === "amount" ? chargeAmount : null,
      balance: type === "amount" ? chargeAmount + bonusAmount : null,
      total_count: type === "count" ? totalCount : null,
      remaining: type === "count" ? totalCount : null,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (passErr || !pass) return { error: passErr?.message ?? "선불권 생성 실패" };

  // 충전 로그
  const delta = type === "amount"
    ? chargeAmount + bonusAmount
    : totalCount;

  await supabase.from("pass_logs").insert({
    pass_id: pass.id,
    delta,
    memo: "발행",
    created_by: info.userId,
  });

  // 판매 대금 결제 기록
  const paymentMethod = formData.get("payment_method");
  const paymentAmount = Number(formData.get("payment_amount")) || 0;
  if (paymentMethod && paymentAmount > 0) {
    await supabase.from("payments").insert({
      shop_id: info.shopId,
      visit_id: null as unknown as string, // nullable after 0004 migration
      method: String(paymentMethod) as "cash" | "card" | "transfer",
      amount: paymentAmount,
    });
  }

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/reports");
  return { success: true };
}

export async function getCustomerPasses(customerId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("passes")
    .select("id, type, name, total_amount, balance, total_count, remaining, expires_at, created_at")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
