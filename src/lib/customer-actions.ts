"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { localizeDbError } from "@/lib/error-messages";

export async function updateCustomerAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "인증이 필요합니다." };

  const customerId = String(formData.get("customer_id"));
  const name = String(formData.get("name")).trim();
  const phone = String(formData.get("phone")).replace(/[^0-9]/g, "");
  const memo = formData.get("memo") ? String(formData.get("memo")).trim() : null;

  if (!name) return { error: "이름을 입력해주세요." };
  if (phone.length < 10) return { error: "전화번호를 확인해주세요." };

  const { error } = await supabase
    .from("customers")
    .update({ name, phone, memo: memo || null })
    .eq("id", customerId);

  if (error) return { error: localizeDbError(error.message, error.code) };

  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/pets");
  return { success: true };
}
