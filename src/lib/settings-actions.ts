"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Json } from "@/types/database";

export async function updateStaffNameAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "인증이 필요합니다." };

  const name = String(formData.get("name")).trim();
  if (!name) return { error: "이름을 입력해주세요." };

  const { error } = await supabase
    .from("staff")
    .update({ name })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings/account");
  return { success: true };
}

export async function updateShopAction(formData: FormData) {
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

  const name = String(formData.get("name"));
  const phone = formData.get("phone") ? String(formData.get("phone")) : null;
  const address = formData.get("address")
    ? String(formData.get("address"))
    : null;
  const slotMinutes = Number(formData.get("slot_minutes")) || 30;
  const defaultCycleWeeks = Number(formData.get("default_cycle_weeks")) || 5;
  const openHoursRaw = String(formData.get("open_hours"));

  let openHours: Json;
  try {
    openHours = JSON.parse(openHoursRaw) as Json;
  } catch {
    return { error: "영업시간 형식이 올바르지 않습니다." };
  }

  const { error } = await supabase
    .from("shops")
    .update({
      name,
      phone,
      address,
      slot_minutes: slotMinutes,
      open_hours: openHours,
      default_cycle_weeks: defaultCycleWeeks,
    })
    .eq("id", staff.shop_id);

  if (error) return { error: error.message };

  revalidatePath("/settings/shop");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function createServiceAction(formData: FormData) {
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

  const name = String(formData.get("name"));
  const durationMinutes = Number(formData.get("duration_minutes")) || 60;
  const priceRaw = String(formData.get("price"));
  const recommendCycleWeeks = formData.get("recommend_cycle_weeks")
    ? Number(formData.get("recommend_cycle_weeks"))
    : null;

  let price: Json;
  try {
    price = JSON.parse(priceRaw) as Json;
  } catch {
    return { error: "가격 형식이 올바르지 않습니다." };
  }

  // 현재 최대 sort_order 조회
  const { data: last } = await supabase
    .from("services")
    .select("sort_order")
    .eq("shop_id", staff.shop_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sortOrder = (last?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("services").insert({
    shop_id: staff.shop_id,
    name,
    duration_minutes: durationMinutes,
    price,
    recommend_cycle_weeks: recommendCycleWeeks,
    sort_order: sortOrder,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings/services");
  return { success: true };
}

export async function updateServiceAction(formData: FormData) {
  const supabase = await createClient();
  const serviceId = String(formData.get("id"));
  const name = String(formData.get("name"));
  const durationMinutes = Number(formData.get("duration_minutes")) || 60;
  const priceRaw = String(formData.get("price"));
  const recommendCycleWeeks = formData.get("recommend_cycle_weeks")
    ? Number(formData.get("recommend_cycle_weeks"))
    : null;

  let price: Json;
  try {
    price = JSON.parse(priceRaw) as Json;
  } catch {
    return { error: "가격 형식이 올바르지 않습니다." };
  }

  const { error } = await supabase
    .from("services")
    .update({
      name,
      duration_minutes: durationMinutes,
      price,
      recommend_cycle_weeks: recommendCycleWeeks,
    })
    .eq("id", serviceId);

  if (error) return { error: error.message };

  revalidatePath("/settings/services");
  return { success: true };
}

export async function toggleServiceAction(formData: FormData) {
  const supabase = await createClient();
  const serviceId = String(formData.get("id"));
  const isActive = formData.get("is_active") === "true";

  const { error } = await supabase
    .from("services")
    .update({ is_active: !isActive })
    .eq("id", serviceId);

  if (error) return { error: error.message };

  revalidatePath("/settings/services");
  return { success: true };
}

export async function reorderServiceAction(formData: FormData) {
  const supabase = await createClient();
  const serviceId = String(formData.get("id"));
  const direction = String(formData.get("direction")); // "up" | "down"

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

  const { data: services } = await supabase
    .from("services")
    .select("id, sort_order")
    .eq("shop_id", staff.shop_id)
    .order("sort_order", { ascending: true });

  if (!services) return { error: "시술 목록을 불러올 수 없습니다." };

  const idx = services.findIndex((s) => s.id === serviceId);
  if (idx === -1) return { error: "시술을 찾을 수 없습니다." };

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= services.length) return { success: true };

  const current = services[idx];
  const swap = services[swapIdx];

  await supabase
    .from("services")
    .update({ sort_order: swap.sort_order })
    .eq("id", current.id);
  await supabase
    .from("services")
    .update({ sort_order: current.sort_order })
    .eq("id", swap.id);

  revalidatePath("/settings/services");
  return { success: true };
}
