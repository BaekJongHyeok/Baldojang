"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addVisitPhotosAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "인증이 필요합니다." };

  const visitId = String(formData.get("visit_id"));
  const type = String(formData.get("type")); // "before" | "after"
  const urls = String(formData.get("urls")).split(",").filter(Boolean);

  if (urls.length === 0) return { error: "사진 URL이 없습니다." };

  const { data: visit } = await supabase
    .from("visits")
    .select("pet_id, before_photos, after_photos")
    .eq("id", visitId)
    .single();
  if (!visit) return { error: "방문 기록을 찾을 수 없습니다." };

  const existing = type === "before" ? visit.before_photos : visit.after_photos;
  const updated = [...existing, ...urls];

  const updateData = type === "before"
    ? { before_photos: updated }
    : { after_photos: updated };

  const { error } = await supabase
    .from("visits")
    .update(updateData)
    .eq("id", visitId);

  if (error) return { error: error.message };

  revalidatePath(`/pets/${visit.pet_id}`);
  revalidatePath(`/visits/${visitId}/card`);
  return { success: true };
}

export async function deleteVisitPhotoAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "인증이 필요합니다." };

  const visitId = String(formData.get("visit_id"));
  const path = String(formData.get("path"));
  const type = String(formData.get("type")); // "before" | "after"

  const { data: visit } = await supabase
    .from("visits")
    .select("pet_id, before_photos, after_photos")
    .eq("id", visitId)
    .single();
  if (!visit) return { error: "방문 기록을 찾을 수 없습니다." };

  // Storage에서 삭제
  const { error: storageErr } = await supabase.storage.from("visit-photos").remove([path]);
  if (storageErr) {
    return { error: `스토리지 삭제 실패: ${storageErr.message}` };
  }

  // DB 배열에서 제거
  const existing = type === "before" ? visit.before_photos : visit.after_photos;
  const updated = existing.filter((p) => p !== path);
  const updateData = type === "before"
    ? { before_photos: updated }
    : { after_photos: updated };

  const { error } = await supabase
    .from("visits")
    .update(updateData)
    .eq("id", visitId);

  if (error) return { error: error.message };

  revalidatePath(`/pets/${visit.pet_id}`);
  revalidatePath(`/visits/${visitId}/card`);
  return { success: true };
}
