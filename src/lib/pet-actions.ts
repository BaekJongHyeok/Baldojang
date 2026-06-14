"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { localizeDbError } from "@/lib/error-messages";

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

export async function createPetAction(formData: FormData) {
  const supabase = await createClient();
  const shopId = await getShopId();
  if (!shopId) return { error: "인증이 필요합니다." };

  // 보호자 처리
  const phone = String(formData.get("customer_phone")).replace(/[^0-9]/g, "");
  const existingCustomerId = formData.get("customer_id")
    ? String(formData.get("customer_id"))
    : null;

  let customerId = existingCustomerId;

  if (!customerId) {
    const customerName = String(formData.get("customer_name"));
    if (!customerName) return { error: "보호자 이름을 입력해주세요." };

    const { data: newCustomer, error: custErr } = await supabase
      .from("customers")
      .insert({ shop_id: shopId, name: customerName, phone })
      .select("id")
      .single();
    if (custErr) return { error: localizeDbError(custErr.message, custErr.code) };
    customerId = newCustomer.id;
  }

  // 주의사항 태그
  const cautionTagsRaw = formData.get("caution_tags");
  const cautionTags: string[] = cautionTagsRaw
    ? String(cautionTagsRaw)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  // 펫 생성
  const { data: pet, error: petErr } = await supabase
    .from("pets")
    .insert({
      shop_id: shopId,
      customer_id: customerId,
      name: String(formData.get("pet_name")),
      breed: formData.get("breed") ? String(formData.get("breed")) : null,
      size: formData.get("size")
        ? (String(formData.get("size")) as "small" | "medium" | "large")
        : null,
      birth_date: formData.get("birth_date")
        ? String(formData.get("birth_date"))
        : null,
      weight_kg: formData.get("weight_kg")
        ? Number(formData.get("weight_kg"))
        : null,
      caution_tags: cautionTags,
      caution_memo: formData.get("caution_memo")
        ? String(formData.get("caution_memo"))
        : null,
      vaccinated:
        formData.get("vaccinated") === ""
          ? null
          : formData.get("vaccinated") === "true",
      neutered:
        formData.get("neutered") === ""
          ? null
          : formData.get("neutered") === "true",
      cycle_weeks: formData.get("cycle_weeks")
        ? Number(formData.get("cycle_weeks"))
        : null,
    })
    .select("id")
    .single();

  if (petErr) return { error: localizeDbError(petErr.message, petErr.code) };

  // 사진 URL 저장 (클라이언트에서 Storage 업로드 후 URL을 전달)
  const photoUrl = formData.get("photo_url");
  if (photoUrl && String(photoUrl)) {
    await supabase
      .from("pets")
      .update({ photo_url: String(photoUrl) })
      .eq("id", pet.id);
  }

  revalidatePath("/pets");
  redirect(`/pets/${pet.id}`);
}

export async function quickCreatePetAction(formData: FormData) {
  const supabase = await createClient();
  const shopId = await getShopId();
  if (!shopId) return { error: "인증이 필요합니다." };

  const phone = String(formData.get("customer_phone")).replace(/[^0-9]/g, "");
  const existingCustomerId = formData.get("customer_id")
    ? String(formData.get("customer_id"))
    : null;

  let customerId = existingCustomerId;
  if (!customerId) {
    const customerName = String(formData.get("customer_name"));
    if (!customerName) return { error: "보호자 이름을 입력해주세요." };
    const { data: newCustomer, error: custErr } = await supabase
      .from("customers")
      .insert({ shop_id: shopId, name: customerName, phone })
      .select("id")
      .single();
    if (custErr) return { error: localizeDbError(custErr.message, custErr.code) };
    customerId = newCustomer.id;
  }

  const { data: pet, error: petErr } = await supabase
    .from("pets")
    .insert({
      shop_id: shopId,
      customer_id: customerId,
      name: String(formData.get("pet_name")),
      breed: formData.get("breed") ? String(formData.get("breed")) : null,
    })
    .select("id")
    .single();

  if (petErr) return { error: localizeDbError(petErr.message, petErr.code) };

  revalidatePath("/pets");
  return { success: true, petId: pet.id };
}

export async function updatePetAction(formData: FormData) {
  const supabase = await createClient();
  const petId = String(formData.get("pet_id"));

  const cautionTagsRaw = formData.get("caution_tags");
  const cautionTags: string[] = cautionTagsRaw
    ? String(cautionTagsRaw)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const { error } = await supabase
    .from("pets")
    .update({
      name: String(formData.get("pet_name")),
      breed: formData.get("breed") ? String(formData.get("breed")) : null,
      size: formData.get("size")
        ? (String(formData.get("size")) as "small" | "medium" | "large")
        : null,
      birth_date: formData.get("birth_date")
        ? String(formData.get("birth_date"))
        : null,
      weight_kg: formData.get("weight_kg")
        ? Number(formData.get("weight_kg"))
        : null,
      caution_tags: cautionTags,
      caution_memo: formData.get("caution_memo")
        ? String(formData.get("caution_memo"))
        : null,
      vaccinated:
        formData.get("vaccinated") === ""
          ? null
          : formData.get("vaccinated") === "true",
      neutered:
        formData.get("neutered") === ""
          ? null
          : formData.get("neutered") === "true",
      cycle_weeks: formData.get("cycle_weeks")
        ? Number(formData.get("cycle_weeks"))
        : null,
    })
    .eq("id", petId);

  if (error) return { error: localizeDbError(error.message, error.code) };

  // 사진 URL 업데이트
  const photoUrl = formData.get("photo_url");
  if (photoUrl && String(photoUrl)) {
    await supabase
      .from("pets")
      .update({ photo_url: String(photoUrl) })
      .eq("id", petId);
  }

  revalidatePath(`/pets/${petId}`);
  revalidatePath("/pets");
  redirect(`/pets/${petId}`);
}

export async function deactivatePetAction(formData: FormData) {
  const supabase = await createClient();
  const petId = String(formData.get("pet_id"));

  const { error } = await supabase
    .from("pets")
    .update({ is_active: false })
    .eq("id", petId);

  if (error) return { error: localizeDbError(error.message, error.code) };

  revalidatePath("/pets");
  redirect("/pets");
}

export async function reactivatePetAction(formData: FormData) {
  const supabase = await createClient();
  const petId = String(formData.get("pet_id"));

  const { error } = await supabase
    .from("pets")
    .update({ is_active: true })
    .eq("id", petId);

  if (error) return { error: localizeDbError(error.message, error.code) };

  revalidatePath(`/pets/${petId}`);
  revalidatePath("/pets");
  return { success: true };
}

export async function lookupCustomerAction(phone: string) {
  const supabase = await createClient();
  const shopId = await getShopId();
  if (!shopId) return { customer: null };

  const cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.length < 10) return { customer: null };

  const { data } = await supabase
    .from("customers")
    .select("id, name, phone")
    .eq("shop_id", shopId)
    .eq("phone", cleaned)
    .single();

  return { customer: data };
}

export async function updatePetCautionAction(formData: FormData) {
  const supabase = await createClient();
  const petId = String(formData.get("pet_id"));
  const tagsRaw = formData.get("caution_tags");
  const cautionTags: string[] = tagsRaw
    ? String(tagsRaw).split(",").map((t) => t.trim()).filter(Boolean)
    : [];
  const cautionMemo = formData.get("caution_memo")
    ? String(formData.get("caution_memo")).trim() || null
    : null;

  const { error } = await supabase
    .from("pets")
    .update({ caution_tags: cautionTags, caution_memo: cautionMemo })
    .eq("id", petId);

  if (error) return { error: localizeDbError(error.message, error.code) };

  revalidatePath(`/pets/${petId}`);
  return { success: true };
}

export async function updatePetCycleAction(formData: FormData) {
  const supabase = await createClient();
  const petId = String(formData.get("pet_id"));
  const raw = formData.get("cycle_weeks");
  const cycleWeeks = raw && String(raw) !== "" ? Number(raw) : null;

  const { error } = await supabase
    .from("pets")
    .update({ cycle_weeks: cycleWeeks })
    .eq("id", petId);

  if (error) return { error: localizeDbError(error.message, error.code) };

  revalidatePath(`/pets/${petId}`);
  return { success: true };
}
