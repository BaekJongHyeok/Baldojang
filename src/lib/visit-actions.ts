"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { localizeDbError } from "@/lib/error-messages";

export async function addVisitPhotosAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "인증이 필요합니다." };

  const visitId = String(formData.get("visit_id"));
  const type = String(formData.get("type"));
  const urls = String(formData.get("urls")).split(",").filter(Boolean);

  if (urls.length === 0) return { error: "사진 URL이 없습니다." };

  const { data: visit } = await supabase
    .from("visits")
    .select("pet_id, before_photos, after_photos")
    .eq("id", visitId)
    .single();
  if (!visit) return { error: "방문 기록을 찾을 수 없습니다." };

  const existing = type === "before" ? visit.before_photos : visit.after_photos;
  if (existing.length >= 1) {
    return { error: `${type === "before" ? "전" : "후"} 사진은 1장만 등록할 수 있습니다.` };
  }

  const updateData = type === "before"
    ? { before_photos: [...existing, urls[0]] }
    : { after_photos: [...existing, urls[0]] };

  const { error } = await supabase.from("visits").update(updateData).eq("id", visitId);
  if (error) return { error: localizeDbError(error.message, error.code) };

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
  const type = String(formData.get("type"));

  const { data: visit } = await supabase
    .from("visits")
    .select("pet_id, before_photos, after_photos")
    .eq("id", visitId)
    .single();
  if (!visit) return { error: "방문 기록을 찾을 수 없습니다." };

  const { error: storageErr } = await supabase.storage.from("visit-photos").remove([path]);
  if (storageErr) return { error: "사진 삭제에 실패했습니다." };

  const existing = type === "before" ? visit.before_photos : visit.after_photos;
  const updated = existing.filter((p) => p !== path);
  const updateData = type === "before"
    ? { before_photos: updated }
    : { after_photos: updated };

  const { error } = await supabase.from("visits").update(updateData).eq("id", visitId);
  if (error) return { error: localizeDbError(error.message, error.code) };

  revalidatePath(`/pets/${visit.pet_id}`);
  revalidatePath(`/visits/${visitId}/card`);
  return { success: true };
}

export async function moveVisitPhotoAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "인증이 필요합니다." };

  const visitId = String(formData.get("visit_id"));
  const path = String(formData.get("path"));
  const fromType = String(formData.get("from"));
  const toType = String(formData.get("to"));

  const { data: visit } = await supabase
    .from("visits")
    .select("pet_id, before_photos, after_photos")
    .eq("id", visitId)
    .single();
  if (!visit) return { error: "방문 기록을 찾을 수 없습니다." };

  const fromArr = fromType === "before" ? visit.before_photos : visit.after_photos;
  const toArr = toType === "before" ? visit.before_photos : visit.after_photos;
  if (toArr.length >= 1) return { error: "이미 사진이 있습니다." };
  if (!fromArr.includes(path)) return { error: "사진을 찾을 수 없습니다." };

  const updateData = fromType === "before"
    ? { before_photos: fromArr.filter((p) => p !== path), after_photos: [...toArr, path] }
    : { before_photos: [...toArr, path], after_photos: fromArr.filter((p) => p !== path) };

  const { error } = await supabase.from("visits").update(updateData).eq("id", visitId);
  if (error) return { error: localizeDbError(error.message, error.code) };

  revalidatePath(`/pets/${visit.pet_id}`);
  revalidatePath(`/visits/${visitId}/card`);
  return { success: true };
}
