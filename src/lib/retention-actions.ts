"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { localizeDbError } from "@/lib/error-messages";

export async function markContactedAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "인증이 필요합니다." };

  const petId = String(formData.get("pet_id"));

  const { error } = await supabase.from("retention_contacts").insert({
    pet_id: petId,
    staff_id: user.id,
  });

  if (error) return { error: localizeDbError(error.message, error.code) };
  revalidatePath("/retention");
  revalidatePath("/dashboard");
  return { success: true };
}
